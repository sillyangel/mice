'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Music, 
  Users, 
  Disc, 
  ListMusic, 
  Star, 
  Play, 
  Mic, 
  SquareStack, 
  ChevronRight, 
  Search, 
  ArrowDown, 
  MoreHorizontal 
} from 'lucide-react';
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
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
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
        const albumsData = await navidromeApi.getAlbums('newest', 8, 0);
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

  const desktopLibraryLinks = [
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
      icon: Star,
      description: 'Starred music',
      count: 0
    }
  ];

  const mobileCategories = [
    {
      href: '/library/artists',
      label: 'Artists',
      icon: Mic
    },
    {
      href: '/library/albums',
      label: 'Albums',
      icon: SquareStack
    },
    {
      href: '/library/songs',
      label: 'Songs',
      icon: Music
    },
    {
      href: '/library/playlists',
      label: 'Playlists',
      icon: ListMusic
    },
    {
      href: '/favorites',
      label: 'Favorites',
      icon: Star
    }
  ];

  const filteredRecentAlbums = useMemo(() => {
    if (!mobileSearchQuery.trim()) return recentAlbums;
    const q = mobileSearchQuery.toLowerCase();
    return recentAlbums.filter(
      (a) => a.name.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)
    );
  }, [recentAlbums, mobileSearchQuery]);

  if (loading) {
    return (
      <div className="p-4 pb-20 space-y-6">
        {/* Mobile Loading Skeleton */}
        <div className="block md:hidden space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <div className="h-9 w-32 bg-white/[0.08] rounded-md animate-pulse" />
            <div className="h-9 w-9 bg-white/[0.08] rounded-full animate-pulse" />
          </div>
          <div className="h-10 w-full bg-white/[0.06] rounded-xl animate-pulse" />
          <div className="space-y-3 pt-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-11 bg-white/[0.04] rounded animate-pulse" />
            ))}
          </div>
          <div className="pt-4">
            <div className="h-6 w-36 bg-white/[0.08] rounded mb-3 animate-pulse" />
            <div className="grid grid-cols-2 gap-3.5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-square bg-white/[0.06] rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Loading Skeleton */}
        <div className="hidden md:block space-y-4">
          <h1 className="text-2xl font-bold">Your Library</h1>
          <div>
            <h2 className="text-lg font-semibold mb-3">Browse</h2>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-white/[0.06] rounded-lg h-14"></div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Recently Added</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="bg-white/[0.06] rounded-lg aspect-square"></div>
                  <div className="space-y-1.5 pt-1">
                    <div className="bg-white/[0.08] h-3.5 rounded w-3/4"></div>
                    <div className="bg-white/[0.05] h-3 rounded w-1/2"></div>
                  </div>
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
      {/* Mobile View: Apple Music iOS 18 style */}
      <div className="block md:hidden space-y-4">
        {/* Top Header Row with title and more button */}
        <div className="flex items-center justify-between pt-1">
          <h1 className="text-3xl font-bold tracking-tight text-white">Library</h1>
          <div className="bg-black/30 backdrop-blur-xl border border-white/15 rounded-full w-9 h-9 flex items-center justify-center shadow-sm">
            <MoreHorizontal className="w-5 h-5 text-primary shrink-0" />
          </div>
        </div>

        {/* Search Library Input */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search Library"
            value={mobileSearchQuery}
            onChange={(e) => setMobileSearchQuery(e.target.value)}
            className="w-full bg-black/30 backdrop-blur-xl text-white placeholder-zinc-400 rounded-xl pl-10 pr-4 py-2 text-[15px] focus:outline-none focus:ring-1 focus:ring-primary border border-white/10"
          />
        </div>

        {/* iOS Table Rows */}
        <div className="pt-1">
          {mobileCategories.map((cat, idx) => {
            const Icon = cat.icon;
            const isLast = idx === mobileCategories.length - 1;
            return (
              <div key={cat.href}>
                <Link
                  href={cat.href}
                  className="flex items-center justify-between py-3 px-1 active:opacity-60 transition-opacity"
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="text-[17px] font-normal text-white">{cat.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </Link>
                <div className={isLast ? "border-b border-white/[0.08]" : "border-b border-white/[0.08] ml-9"} />
              </div>
            );
          })}
        </div>

        {/* Recently Added Section */}
        <div className="pt-4 pb-36">
          <h2 className="text-xl font-bold text-white mb-3">Recently Added</h2>
          <div className="grid grid-cols-2 gap-3.5">
            {filteredRecentAlbums.map((album) => (
              <Link
                key={album.id}
                href={`/album/${album.id}`}
                className="group block active:scale-[0.98] transition-transform"
              >
                <div className="relative aspect-square mb-2 rounded-lg overflow-hidden bg-white/5 shadow-md">
                  <Image
                    src={album.coverArt && api ? api.getCoverArtUrl(album.coverArt, 300) : '/default-user.jpg'}
                    alt={album.name}
                    fill
                    className="object-cover"
                    sizes="50vw"
                  />
                </div>
                <h3 className="font-semibold text-sm truncate text-white leading-tight">{album.name}</h3>
                <p className="text-xs text-zinc-400 truncate mt-0.5">{album.artist}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop View: Preserved unchanged */}
      <div className="hidden md:block space-y-4">
        <h1 className="text-2xl font-bold">Your Library</h1>
        
        {/* Desktop Library Navigation */}
        <div>
          <div className="flex flex-col gap-2">
            {desktopLibraryLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-2">
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

        {/* Desktop Recently Added Albums */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recently Added</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
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
                    </div>
                    <h3 className="font-medium text-sm truncate hover:underline">{album.name}</h3>
                    <Link 
                      href={`/artist/${album.artistId || album.artist}`}
                      className="text-xs text-muted-foreground truncate hover:underline block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {album.artist}
                    </Link>
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
