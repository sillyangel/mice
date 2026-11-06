'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Song, Album, getNavidromeAPI } from '@/lib/navidrome';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Heart, Music, Shuffle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { UserProfile } from './UserProfile';
import { extractDominantColor } from '@/lib/image-utils';

interface SongRecommendationsProps {
  userName?: string;
}

const RecommendationSongItem = React.memo(function RecommendationSongItem({
  song,
  api,
  isStarred,
  onPlay,
  formatDuration,
}: {
  song: Song;
  api: ReturnType<typeof getNavidromeAPI>;
  isStarred: boolean;
  onPlay: (song: Song) => void;
  formatDuration: (duration: number) => string;
}) {
  const coverUrl = song.coverArt && api ? api.getCoverArtUrl(song.coverArt, 120) : null;
  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!coverUrl) {
      setDominantColor(null);
      return;
    }
    let cancelled = false;
    extractDominantColor(coverUrl)
      .then((color) => {
        if (!cancelled) setDominantColor(color);
      })
      .catch(() => {
        if (!cancelled) setDominantColor(null);
      });
    return () => {
      cancelled = true;
    };
  }, [coverUrl]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onPlay(song)}
      style={{
        backgroundColor: dominantColor
          ? `${dominantColor.replace('rgb', 'rgba').replace(')', isHovered ? ', 0.45)' : ', 0.22)')}`
          : isHovered ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
        borderColor: dominantColor
          ? `${dominantColor.replace('rgb', 'rgba').replace(')', isHovered ? ', 0.50)' : ', 0.25)')}`
          : isHovered ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)',
        boxShadow: dominantColor
          ? isHovered
            ? `0 10px 24px -4px ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.40)')}`
            : `0 4px 14px -4px ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.22)')}`
          : isHovered ? '0 8px 24px -4px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.25)',
        transition: 'background-color 300ms ease, border-color 300ms ease, box-shadow 300ms ease, transform 200ms ease',
      }}
      className="group relative cursor-pointer flex items-center p-2.5 rounded-xl border backdrop-blur-md hover:scale-[1.015] active:scale-[0.99] overflow-hidden select-none"
    >
      {/* Subtle ambient glow matching the cover */}
      {dominantColor && (
        <div
          className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-75 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at 10% 50%, ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.25)')} 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Album Artwork */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted/60 flex-shrink-0 shadow-md">
        {song.coverArt && api ? (
          <>
            <Image
              src={api.getCoverArtUrl(song.coverArt, 96)}
              alt={song.title}
              fill
              className="object-cover"
              sizes="48px"
              loading="eager"
              decoding="async"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0 ml-3.5 mr-2">
        <p className="font-semibold text-sm truncate text-white drop-shadow-sm">{song.title}</p>
        <div className="flex items-center gap-2 text-xs text-white/70 mt-0.5">
          <Link
            href={`/artist/${song.artistId}`}
            prefetch={false}
            className="hover:underline hover:text-white truncate transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {song.artist}
          </Link>
          {song.duration && (
            <>
              <span className="opacity-40">•</span>
              <span className="tabular-nums opacity-90">{formatDuration(song.duration)}</span>
            </>
          )}
        </div>
      </div>

      {/* Heart / Star */}
      {isStarred && (
        <Heart className="w-4 h-4 text-primary flex-shrink-0 fill-current mr-1" />
      )}
    </div>
  );
});

export const SongRecommendations = React.memo(function SongRecommendations({ userName }: SongRecommendationsProps) {
  const { playTrack, shuffle, toggleShuffle } = useAudioPlayer();
  const isMobile = useIsMobile();
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  const [recommendedAlbums, setRecommendedAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [songStates, setSongStates] = useState<Record<string, boolean>>({});
  const api = getNavidromeAPI();

  // Memoize the greeting to prevent recalculation
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadRecommendations = async () => {
      setLoading(true);
      try {
        const navidromeApi = getNavidromeAPI();
        if (!navidromeApi) return;

        if (isMobile) {
          const randomAlbums = await navidromeApi.getAlbums('random', 6);
          if (mounted) setRecommendedAlbums(randomAlbums.slice(0, 6));
        } else {
          // Single fast Subsonic getRandomSongs request instead of 4 sequential album+song fetches
          const recommendations = await navidromeApi.getRandomSongs(6);
          if (!mounted) return;
          setRecommendedSongs(recommendations);
          const states: Record<string, boolean> = {};
          recommendations.forEach((song: Song) => { states[song.id] = !!song.starred; });
          setSongStates(states);
        }
      } catch (error) {
        console.error('Failed to load recommendations:', error);
        if (mounted) {
          setRecommendedAlbums([]);
          setRecommendedSongs([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadRecommendations();
    return () => { mounted = false; };
  }, [isMobile]);

  const handlePlaySong = async (song: Song) => {
    try {
      if (!api) return;
      
      const url = api.getStreamUrlForSong(song);
      const coverArt = song.coverArt ? api.getCoverArtUrl(song.coverArt, 300) : undefined;
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
      if (!api) return;
      
      const albumSongs = await api.getAlbumSongs(album.id);
      if (albumSongs.length > 0) {
        const first = albumSongs[0];
        const url = api.getStreamUrlForSong(first);
        const coverArt = first.coverArt ? api.getCoverArtUrl(first.coverArt, 300) : undefined;
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
                  prefetch={false}
                  className="group cursor-pointer block"
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    {album.coverArt && api ? (
                      <Image
                        src={api.getCoverArtUrl(album.coverArt, 300)}
                        alt={album.name}
                        width={300}
                        height={300}
                        className="object-cover w-full h-full"
                        sizes="(max-width: 768px) 33vw, 200px"
                        loading="eager"
                        decoding="async"
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
                    prefetch={false}
                    className="font-medium text-sm truncate hover:underline block"
                  >
                    {album.name}
                  </Link>
                  <Link 
                    href={`/artist/${album.artistId || album.artist}`}
                    prefetch={false}
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
              <RecommendationSongItem
                key={song.id}
                song={song}
                api={api}
                isStarred={!!songStates[song.id]}
                onPlay={handlePlaySong}
                formatDuration={formatDuration}
              />
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
});

