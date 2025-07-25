'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Music, Users, Disc, ListMusic, Heart, Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getNavidromeAPI } from '@/lib/navidrome';
import NavidromeAPI from '@/lib/navidrome';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface Album {
  id: string;
  name: string;
  artist: string;
  artistId?: string;
  coverArt?: string;
  year?: number;
  songCount: number;
}

interface LibraryStats {
  albums: number;
  artists: number;
  songs: number;
  playlists: number;
}

export default function LibraryPage() {
  const [recentAlbums, setRecentAlbums] = useState<Album[]>([]);
  const [stats, setStats] = useState<LibraryStats>({ albums: 0, artists: 0, songs: 0, playlists: 0 });
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<NavidromeAPI | null>(null);
  const { playAlbum } = useAudioPlayer();
  const isMobile = useIsMobile();

  useEffect(() => {
    const loadLibraryData = async () => {
      try {
        const navidromeApi = getNavidromeAPI();
        if (!navidromeApi) {
          console.error('Navidrome API not available');
          return;
        }
        setApi(navidromeApi);

        // Load recent albums
        const albumsData = await navidromeApi.getAlbums('newest', 4, 0);
        setRecentAlbums(albumsData || []);

        // Load library stats
        const [allAlbums, allArtists, allPlaylists] = await Promise.all([
          navidromeApi.getAlbums('alphabeticalByName', 1, 0), // Just to get count
          navidromeApi.getArtists(),
          navidromeApi.getPlaylists()
        ]);

        setStats({
          albums: allAlbums?.length || 0,
          artists: allArtists?.length || 0,
          songs: 0, // We don't have a direct method for this
          playlists: allPlaylists?.length || 0
        });
      } catch (error) {
        console.error('Failed to load library data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLibraryData();
  }, []);

  const handlePlayAlbum = async (album: Album) => {
    try {
      await playAlbum(album.id);
    } catch (error) {
      console.error('Failed to play album:', error);
    }
  };

  const libraryLinks = [
    {
      href: '/library/albums',
      label: 'Albums',
      icon: Disc,
      description: 'Browse all albums',
      count: stats.albums
    },
    {
      href: '/library/artists',
      label: 'Artists',
      icon: Users,
      description: 'Discover artists',
      count: stats.artists
    },
    {
      href: '/library/songs',
      label: 'Songs',
      icon: Music,
      description: 'All your music',
      count: stats.songs
    },
    {
      href: '/library/playlists',
      label: 'Playlists',
      icon: ListMusic,
      description: 'Your playlists',
      count: stats.playlists
    },
    {
      href: '/favorites',
      label: 'Favorites',
      icon: Heart,
      description: 'Starred music',
      count: 0
    }
  ];

  if (loading) {
    return (
      <div className="p-4 pb-20 space-y-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Your Library</h1>
          
          {/* Loading skeleton for library links */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Browse</h2>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted rounded-lg h-16"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Loading skeleton for recent albums */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Recently Added</h2>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted rounded-lg aspect-square mb-2"></div>
                  <div className="bg-muted h-4 rounded mb-1"></div>
                  <div className="bg-muted h-3 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Your Library</h1>
        
        {/* Library Navigation - Always at top */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Browse</h2>
          <div className="space-y-3">
            {libraryLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{link.label}</h3>
                          <p className="text-sm text-muted-foreground">{link.description}</p>
                        </div>
                        {link.count > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {link.count}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recently Added Albums - At bottom on mobile, after Browse on desktop */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recently Added</h2>
          <div className="grid grid-cols-2 gap-4">
            {recentAlbums.map((album) => (
              <Card key={album.id} className="group cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-3">
                  <Link href={`/album/${album.id}`}>
                    <div className="relative aspect-square mb-2">
                      <Image
                        src={album.coverArt && api ? api.getCoverArtUrl(album.coverArt, 300) : '/default-user.jpg'}
                        alt={album.name}
                        width={600}
                        height={600}
                        className="object-cover rounded-lg"
                        sizes="(max-width: 768px) 50vw, 200px"
                      />
                      {!isMobile && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePlayAlbum(album);
                          }}
                          className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center"
                        >
                          <Play className="w-8 h-8 text-white fill-white" />
                        </button>
                      )}
                    </div>
                    <h3 className="font-medium text-sm truncate hover:underline">{album.name}</h3>
                    <Link 
                      href={`/artist/${album.artistId || album.artist}`}
                      className="text-xs text-muted-foreground truncate hover:underline block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {album.artist}
                    </Link>
                    {album.year && (
                      <p className="text-xs text-muted-foreground">{album.year}</p>
                    )}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
