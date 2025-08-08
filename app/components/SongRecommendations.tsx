'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Song, Album, getNavidromeAPI } from '@/lib/navidrome';
import { useOfflineNavidrome } from '@/app/components/OfflineNavidromeProvider';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Heart, Music, Shuffle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { UserProfile } from './UserProfile';

interface SongRecommendationsProps {
  userName?: string;
}

export function SongRecommendations({ userName }: SongRecommendationsProps) {
  const offline = useOfflineNavidrome();
  const { playTrack, shuffle, toggleShuffle } = useAudioPlayer();
  const isMobile = useIsMobile();
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  const [recommendedAlbums, setRecommendedAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [songStates, setSongStates] = useState<Record<string, boolean>>({});

  // Memoize the greeting to prevent recalculation
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  }, []);

  // Memoized callbacks to prevent re-renders
  const handleImageLoad = useCallback(() => {
    // Image loaded - no state update needed to prevent re-renders
  }, []);

  const handleImageError = useCallback(() => {
    // Image error - no state update needed to prevent re-renders
  }, []);

  useEffect(() => {
    const loadRecommendations = async () => {
      setLoading(true);
      try {
        const api = getNavidromeAPI();
        const isOnline = !offline.isOfflineMode && !!api;
        
        if (isOnline && api) {
          // Online: use server-side recommendations
          const randomAlbums = await api.getAlbums('random', 10);
          if (isMobile) {
            setRecommendedAlbums(randomAlbums.slice(0, 6));
          } else {
            const allSongs: Song[] = [];
            for (let i = 0; i < Math.min(3, randomAlbums.length); i++) {
              try {
                const albumSongs = await api.getAlbumSongs(randomAlbums[i].id);
                allSongs.push(...albumSongs);
              } catch (error) {
                console.error('Failed to get album songs:', error);
              }
            }
            const shuffled = allSongs.sort(() => Math.random() - 0.5);
            const recommendations = shuffled.slice(0, 6);
            setRecommendedSongs(recommendations);
            const states: Record<string, boolean> = {};
            recommendations.forEach((song: Song) => { states[song.id] = !!song.starred; });
            setSongStates(states);
          }
        } else {
          // Offline: use cached library
          const albums = await offline.getAlbums(false);
          const shuffledAlbums = [...(albums || [])].sort(() => Math.random() - 0.5);
          if (isMobile) {
            setRecommendedAlbums(shuffledAlbums.slice(0, 6));
          } else {
            const pick = shuffledAlbums.slice(0, 3);
            const allSongs: Song[] = [];
            for (const a of pick) {
              try {
                const songs = await offline.getSongs(a.id);
                allSongs.push(...songs);
              } catch (e) {
                // ignore per-album errors
              }
            }
            const recommendations = allSongs.sort(() => Math.random() - 0.5).slice(0, 6);
            setRecommendedSongs(recommendations);
            const states: Record<string, boolean> = {};
            recommendations.forEach((song: Song) => { states[song.id] = !!song.starred; });
            setSongStates(states);
          }
        }
      } catch (error) {
        console.error('Failed to load recommendations:', error);
        setRecommendedAlbums([]);
        setRecommendedSongs([]);
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
  }, [offline, isMobile]);

  const handlePlaySong = async (song: Song) => {
    try {
      const api = getNavidromeAPI();
      const url = api ? api.getStreamUrl(song.id) : `offline-song-${song.id}`;
      const coverArt = song.coverArt && api ? api.getCoverArtUrl(song.coverArt, 64) : undefined;
      const track = {
        id: song.id,
        name: song.title,
        url,
        artist: song.artist || 'Unknown Artist',
        artistId: song.artistId || '',
        album: song.album || 'Unknown Album',
        albumId: song.albumId || '',
        duration: song.duration || 0,
        coverArt,
        starred: !!song.starred
      };
      await playTrack(track, true);
    } catch (error) {
      console.error('Failed to play song:', error);
    }
  };

  const handlePlayAlbum = async (album: Album) => {
    try {
      const api = getNavidromeAPI();
      let albumSongs: Song[] = [];
      if (api) {
        albumSongs = await api.getAlbumSongs(album.id);
      } else {
        albumSongs = await offline.getSongs(album.id);
      }
      if (albumSongs.length > 0) {
        const first = albumSongs[0];
        const url = api ? api.getStreamUrl(first.id) : `offline-song-${first.id}`;
        const coverArt = first.coverArt && api ? api.getCoverArtUrl(first.coverArt, 64) : undefined;
        const track = {
          id: first.id,
          name: first.title,
          url,
          artist: first.artist || 'Unknown Artist',
          artistId: first.artistId || '',
          album: first.album || 'Unknown Album',
          albumId: first.albumId || '',
          duration: first.duration || 0,
          coverArt,
          starred: !!first.starred
        };
        await playTrack(track, true);
      }
    } catch (error) {
      console.error('Failed to play album:', error);
    }
  };

  const handleShuffleAll = async () => {
    if (isMobile && recommendedAlbums.length === 0) return;
    if (!isMobile && recommendedSongs.length === 0) return;
    
    // Enable shuffle if not already on
    if (!shuffle) {
      toggleShuffle();
    }
    
    if (isMobile) {
      // Play a random album
      const randomAlbum = recommendedAlbums[Math.floor(Math.random() * recommendedAlbums.length)];
      await handlePlayAlbum(randomAlbum);
    } else {
      // Play a random song from recommendations
      const randomSong = recommendedSongs[Math.floor(Math.random() * recommendedSongs.length)];
      await handlePlaySong(randomSong);
    }
  };

  const formatDuration = (duration: number): string => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
        {isMobile ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {greeting}{userName ? `, ${userName}` : ''}!
          </h2>
          <p className="text-muted-foreground">
            {isMobile ? 'Here are some albums you might enjoy' : 'Here are some songs you might enjoy'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mobile User Profile */}
          {isMobile && <UserProfile variant="mobile" />}
          
          {/* Shuffle All Button (Desktop only) */}
          {(isMobile ? recommendedAlbums.length > 0 : recommendedSongs.length > 0) && !isMobile && (
            <Button onClick={handleShuffleAll} variant="outline" size="sm">
              <Shuffle className="w-4 h-4 mr-2" />
              Shuffle All
            </Button>
          )}
        </div>
      </div>
      
      {isMobile ? (
        /* Mobile: Show albums in 3x2 grid */
        recommendedAlbums.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {recommendedAlbums.map((album) => (
              <div key={album.id} className="space-y-2">
                <Link
                  href={`/album/${album.id}`}
                  className="group cursor-pointer block"
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    {album.coverArt && !offline.isOfflineMode && getNavidromeAPI() ? (
                      <Image
            src={getNavidromeAPI()!.getCoverArtUrl(album.coverArt, 300)}
                        alt={album.name}
                        width={600}
                        height={600}
                        className="object-cover"
                        sizes="(max-width: 768px) 33vw, 200px"
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </Link>
                <div className="space-y-1">
                  <Link 
                    href={`/album/${album.id}`}
                    className="font-medium text-sm truncate hover:underline block"
                  >
                    {album.name}
                  </Link>
                  <Link 
                    href={`/artist/${album.artistId || album.artist}`}
                    className="text-xs text-muted-foreground truncate hover:underline block"
                  >
                    {album.artist}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No albums available for recommendations
              </p>
            </CardContent>
          </Card>
        )
      ) : (
        /* Desktop: Show songs in original format */
        recommendedSongs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendedSongs.map((song) => (
              <Card 
                key={song.id} 
                className="group cursor-pointer hover:bg-accent/50 transition-colors py-2"
                onClick={() => handlePlaySong(song)}
              >
                <CardContent className="px-2">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                      {song.coverArt && !offline.isOfflineMode && getNavidromeAPI() ? (
                        <>
                          <Image
            src={getNavidromeAPI()!.getCoverArtUrl(song.coverArt, 48)}
                            alt={song.title}
                            fill
                            className="object-cover"
                            sizes="48px"
                            onLoad={handleImageLoad}
                            onError={handleImageError}
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="w-4 h-4 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{song.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Link 
                          href={`/artist/${song.artistId}`}
                          className="hover:underline truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {song.artist}
                        </Link>
                        {song.duration && (
                          <>
                            <span>•</span>
                            <span>{formatDuration(song.duration)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {songStates[song.id] && (
                      <Heart className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No songs available for recommendations
              </p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
