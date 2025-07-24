'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Song, Album } from '@/lib/navidrome';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Heart, Music, Shuffle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface SongRecommendationsProps {
  userName?: string;
}

export function SongRecommendations({ userName }: SongRecommendationsProps) {
  const { api, isConnected } = useNavidrome();
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
      if (!api || !isConnected) return;
      
      setLoading(true);
      try {
        // Get random albums for both mobile album view and desktop song extraction
        const randomAlbums = await api.getAlbums('random', 10);
        
        if (isMobile) {
          // For mobile: show 6 random albums
          setRecommendedAlbums(randomAlbums.slice(0, 6));
        } else {
          // For desktop: extract songs from albums (original behavior)
          const allSongs: Song[] = [];
          
          // Get songs from first few albums
          for (let i = 0; i < Math.min(3, randomAlbums.length); i++) {
            try {
              const albumSongs = await api.getAlbumSongs(randomAlbums[i].id);
              allSongs.push(...albumSongs);
            } catch (error) {
              console.error('Failed to get album songs:', error);
            }
          }
          
          // Shuffle and limit to 6 songs
          const shuffled = allSongs.sort(() => Math.random() - 0.5);
          const recommendations = shuffled.slice(0, 6);
          setRecommendedSongs(recommendations);
          
          // Initialize starred states for songs
          const states: Record<string, boolean> = {};
          recommendations.forEach((song: Song) => {
            states[song.id] = !!song.starred;
          });
          setSongStates(states);
        }
      } catch (error) {
        console.error('Failed to load recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
  }, [api, isConnected, isMobile]);

  const handlePlaySong = async (song: Song) => {
    if (!api) return;
    
    try {
      const track = {
        id: song.id,
        name: song.title,
        url: api.getStreamUrl(song.id),
        artist: song.artist || 'Unknown Artist',
        artistId: song.artistId || '',
        album: song.album || 'Unknown Album',
        albumId: song.albumId || '',
        duration: song.duration || 0,
        coverArt: song.coverArt ? api.getCoverArtUrl(song.coverArt, 64) : undefined,
        starred: !!song.starred
      };
      await playTrack(track, true);
    } catch (error) {
      console.error('Failed to play song:', error);
    }
  };

  const handlePlayAlbum = async (album: Album) => {
    if (!api) return;
    
    try {
      // Get album songs and play the first one
      const albumSongs = await api.getAlbumSongs(album.id);
      if (albumSongs.length > 0) {
        const track = {
          id: albumSongs[0].id,
          name: albumSongs[0].title,
          url: api.getStreamUrl(albumSongs[0].id),
          artist: albumSongs[0].artist || 'Unknown Artist',
          artistId: albumSongs[0].artistId || '',
          album: albumSongs[0].album || 'Unknown Album',
          albumId: albumSongs[0].albumId || '',
          duration: albumSongs[0].duration || 0,
          coverArt: albumSongs[0].coverArt ? api.getCoverArtUrl(albumSongs[0].coverArt, 64) : undefined,
          starred: !!albumSongs[0].starred
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
        {(isMobile ? recommendedAlbums.length > 0 : recommendedSongs.length > 0) && (
          <Button onClick={handleShuffleAll} variant="outline" size="sm">
            <Shuffle className="w-4 h-4 mr-2" />
            Shuffle All
          </Button>
        )}
      </div>
      
      {isMobile ? (
        /* Mobile: Show albums in 3x2 grid */
        recommendedAlbums.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {recommendedAlbums.map((album) => (
              <Link
                key={album.id}
                href={`/album/${album.id}`}
                className="group cursor-pointer"
              >
                <div className="space-y-2">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    {album.coverArt && api ? (
                      <>
                        <Image
                          src={api.getCoverArtUrl(album.coverArt, 200)}
                          alt={album.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 33vw, 200px"
                          onLoad={handleImageLoad}
                          onError={handleImageError}
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play 
                            className="w-8 h-8 text-white" 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handlePlayAlbum(album);
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-sm truncate">{album.name}</p>
                  </div>
                </div>
              </Link>
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
                      {song.coverArt && api ? (
                        <>
                          <Image
                            src={api.getCoverArtUrl(song.coverArt, 48)}
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
