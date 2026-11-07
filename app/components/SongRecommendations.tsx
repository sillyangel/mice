'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Album, getNavidromeAPI } from '@/lib/navidrome';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Star, Music, Shuffle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { UserProfile } from './UserProfile';
import { extractDominantColor } from '@/lib/image-utils';

interface SongRecommendationsProps {
  userName?: string;
}

const RecommendationAlbumItem = React.memo(function RecommendationAlbumItem({
  album,
  api,
  isStarred,
  onPlay,
}: {
  album: Album;
  api: ReturnType<typeof getNavidromeAPI>;
  isStarred: boolean;
  onPlay: (album: Album) => void;
}) {
  const coverUrl = album.coverArt && api ? api.getCoverArtUrl(album.coverArt, 140) : null;
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
      onClick={() => onPlay(album)}
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
      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted/60 shrink-0 shadow-md">
        {album.coverArt && api ? (
          <>
            <Image
              src={api.getCoverArtUrl(album.coverArt, 120)}
              alt={album.name}
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

      {/* Album Info */}
      <div className="flex-1 min-w-0 ml-3.5 mr-2">
        <Link
          href={`/album/${album.id}`}
          prefetch={false}
          className="font-semibold text-sm truncate text-white drop-shadow-sm hover:underline block"
          onClick={(e) => e.stopPropagation()}
        >
          {album.name}
        </Link>
        <div className="flex items-center gap-2 text-xs text-white/70 mt-0.5 truncate">
          <Link
            href={`/artist/${album.artistId || album.artist}`}
            prefetch={false}
            className="hover:underline hover:text-white truncate transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {album.artist}
          </Link>
          {album.year && (
            <>
              <span className="opacity-40">•</span>
              <span className="tabular-nums opacity-90">{album.year}</span>
            </>
          )}
        </div>
      </div>

      {/* Star */}
      {isStarred && (
        <Star className="w-4 h-4 text-yellow-400 shrink-0 fill-yellow-400 mr-1" />
      )}
    </div>
  );
});

export const SongRecommendations = React.memo(function SongRecommendations({ userName }: SongRecommendationsProps) {
  const { playAlbum, shuffle, toggleShuffle } = useAudioPlayer();
  const isMobile = useIsMobile();
  const [recommendedAlbums, setRecommendedAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
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

        // Fetch 9 random albums for desktop (3 columns x 3 rows) and 6 for mobile (3x2)
        const count = isMobile ? 6 : 9;
        const randomAlbums = await navidromeApi.getAlbums('random', count);
        if (mounted) {
          setRecommendedAlbums(randomAlbums.slice(0, count));
        }
      } catch (error) {
        console.error('Failed to load recommended albums:', error);
        if (mounted) {
          setRecommendedAlbums([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadRecommendations();
    return () => { mounted = false; };
  }, [isMobile]);

  const handlePlayAlbum = useCallback(async (album: Album) => {
    try {
      await playAlbum(album.id);
    } catch (error) {
      console.error('Failed to play album:', error);
    }
  }, [playAlbum]);

  const handleShuffleAll = useCallback(async () => {
    if (recommendedAlbums.length === 0) return;
    
    // Enable shuffle if not already on
    if (!shuffle) {
      toggleShuffle();
    }
    
    const randomAlbum = recommendedAlbums[Math.floor(Math.random() * recommendedAlbums.length)];
    await handlePlayAlbum(randomAlbum);
  }, [recommendedAlbums, shuffle, toggleShuffle, handlePlayAlbum]);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
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
            Here are some albums you might enjoy
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mobile User Profile */}
          {isMobile && <UserProfile variant="mobile" />}
          
          {/* Shuffle All Button (Desktop only) */}
          {recommendedAlbums.length > 0 && !isMobile && (
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
        /* Desktop: Show albums in 3 columns */
        recommendedAlbums.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {recommendedAlbums.map((album) => (
              <RecommendationAlbumItem
                key={album.id}
                album={album}
                api={api}
                isStarred={!!album.starred}
                onPlay={handlePlayAlbum}
              />
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
      )}
    </div>
  );
});

export default SongRecommendations;
