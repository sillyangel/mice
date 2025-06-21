'use client';

import { ScrollArea, ScrollBar } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent } from '../components/ui/tabs';
import { AlbumArtwork } from './components/album-artwork';
import { useNavidrome } from './components/NavidromeContext';
import { useEffect, useState } from 'react';
import { Album } from '@/lib/navidrome';

export default function MusicPage() {
  const { albums, isLoading, error } = useNavidrome();
  const [recentAlbums, setRecentAlbums] = useState<Album[]>([]);
  const [newestAlbums, setNewestAlbums] = useState<Album[]>([]);

  useEffect(() => {
    if (albums.length > 0) {
      // Split albums into recent and newest for display
      const recent = albums.slice(0, Math.ceil(albums.length / 2));
      const newest = albums.slice(Math.ceil(albums.length / 2));
      setRecentAlbums(recent);
      setNewestAlbums(newest);
    }
  }, [albums]);

  if (error) {
    return (
      <div className="h-full px-4 py-6 lg:px-8 pb-24">
        <div className="text-center">
          <p className="text-xl font-semibold text-red/50 mb-2">Connection Error</p>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground mt-2">
          If you need to change your settings, please go to the{' '}
            <a
              href="/settings"
              className="text-sm text-blue-500 hover:underline"
            >
              Settings
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full px-4 py-6 lg:px-8 pb-24">
    <>
      <Tabs defaultValue="music" className="h-full space-y-6">
        <TabsContent value="music" className="border-none p-0 outline-none">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight">
                Recently Added
              </p>
              <p className="text-sm text-muted-foreground">
                Latest additions to your music library.
              </p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="relative">
            <ScrollArea>
              <div className="flex space-x-4 pb-4">
                {isLoading ? (
                  // Loading skeletons
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="w-[300px] h-[300px] bg-muted animate-pulse rounded-md flex-shrink-0" />
                  ))
                ) : (
                  recentAlbums.map((album) => (
                    <AlbumArtwork
                      key={album.id}
                      album={album}
                      className="w-[300px] flex-shrink-0"
                      aspectRatio="square"
                      width={300}
                      height={300}
                    />
                  ))
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
          <div className="mt-6 space-y-1">
            <p className="text-2xl font-semibold tracking-tight">
              Your Library
            </p>
            <p className="text-sm text-muted-foreground">
              Albums from your music collection.
            </p>
          </div>
          <Separator className="my-4" />
          <div className="relative">
            <ScrollArea>
            <div className="flex space-x-4 pb-4">
            {isLoading ? (
                  // Loading skeletons
                  Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="w-[150px] h-[150px] bg-muted animate-pulse rounded-md flex-shrink-0" />
                  ))
                ) : (
                  newestAlbums.map((album) => (
                    <AlbumArtwork
                      key={album.id}
                      album={album}
                      className="w-[150px] flex-shrink-0"
                      aspectRatio="square"
                      width={150}
                      height={150}
                    />
                  ))
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
      </>
    </div>
  );
}