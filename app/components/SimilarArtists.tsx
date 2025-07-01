'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { lastFmAPI } from '@/lib/lastfm-api';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import Link from 'next/link';

interface SimilarArtist {
  name: string;
  url: string;
  image?: Array<{
    '#text': string;
    size: string;
  }>;
}

interface SimilarArtistsProps {
  artistName: string;
}

export function SimilarArtists({ artistName }: SimilarArtistsProps) {
  const [similarArtists, setSimilarArtists] = useState<SimilarArtist[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSimilarArtists = async () => {
      if (!lastFmAPI.isAvailable()) return;
      
      setLoading(true);
      try {
        const similar = await lastFmAPI.getSimilarArtists(artistName, 6);
        if (similar?.artist) {
          setSimilarArtists(similar.artist);
        }
      } catch (error) {
        console.error('Failed to fetch similar artists:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilarArtists();
  }, [artistName]);

  const getArtistImage = (artist: SimilarArtist): string => {
    if (!artist.image || artist.image.length === 0) {
      return '/default-user.jpg';
    }
    
    // Try to get medium or large image
    const mediumImage = artist.image.find(img => img.size === 'medium' || img.size === 'large');
    const anyImage = artist.image[artist.image.length - 1]; // Fallback to last image
    
    return mediumImage?.['#text'] || anyImage?.['#text'] || '/default-user.jpg';
  };

  if (!lastFmAPI.isAvailable() || loading || similarArtists.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">Fans also like</h2>
      <ScrollArea>
        <div className="flex space-x-4 pb-4">
          {similarArtists.map((artist) => (
            <Link
              key={artist.name}
              href={`/artist/${encodeURIComponent(artist.name)}`}
              className="flex-shrink-0"
            >
              <div className="w-32 space-y-2 group cursor-pointer">
                <div className="relative w-32 h-32 bg-muted rounded-full overflow-hidden">
                  <Image
                    src={getArtistImage(artist)}
                    alt={artist.name}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {artist.name}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
