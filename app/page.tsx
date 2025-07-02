'use client';

import { ScrollArea, ScrollBar } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent } from '../components/ui/tabs';
import { AlbumArtwork } from './components/album-artwork';
import { useNavidrome } from './components/NavidromeContext';
import { useEffect, useState } from 'react';
import { Album } from '@/lib/navidrome';
import { useNavidromeConfig } from './components/NavidromeConfigContext';

type TimeOfDay = 'morning' | 'afternoon' | 'evening';
export default function MusicPage() {
  const { albums, isLoading } = useNavidrome();
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

  // Get greeting and time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : 'Good afternoon';
  let timeOfDay: TimeOfDay;
  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning';
  } else if (hour >= 12 && hour < 18) {
    timeOfDay = 'afternoon';
  } else {
    timeOfDay = 'evening';
  }


  // Try to get user name from navidrome context, fallback to 'user'
  let userName = '';
  // If you add user info to NavidromeContext, update this logic
  const { config } = useNavidromeConfig();
  if (config && config.username) {
    userName = config.username;
  }


  return (
    <div className="h-full px-4 py-6 lg:px-8 pb-24">
      <div className="relative rounded-lg p-8">
          <div className="relative rounded-sm p-10">
            <div
              className="absolute inset-0 bg-center bg-cover bg-no-repeat blur-xl bg-gradient-to-r from-primary to-secondary"
 style={{
                backgroundImage:
 timeOfDay === 'morning'
 ? 'linear-gradient(to right, #ff9a9e, #fad0c4, #fad0c4)' // Warm tones for morning
 : timeOfDay === 'evening'
 ? 'linear-gradient(to right, #a18cd1, #fbc2eb)' // Cool tones for evening
 : 'linear-gradient(to right, #a8edea, #fed6e3)', // Default/afternoon colors
 }} />
            <div className="relative z-10 flex items-center space-x-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-4">{greeting}{userName ? `, ${userName}` : ''}!</h1>
              </div>
          </div>
        </div>
       </div>
      <>
      <Tabs defaultValue="music" className="h-full space-y-6">
        <TabsContent value="music" className="border-none p-0 outline-none">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight">
                Recently Played
              </p>
              <p className="text-sm text-muted-foreground">
                Albums you&apos;ve listened to recently.
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
                    <div key={i} className="w-[220px] h-[320px] bg-muted animate-pulse rounded-md flex-shrink-0" />
                  ))
                ) : (
                  recentAlbums.map((album) => (
                    <AlbumArtwork
                      key={album.id}
                      album={album}
                      className="w-[220px] flex-shrink-0"
                      aspectRatio="square"
                      width={220}
                      height={220}
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
                    <div key={i} className="w-[220px] h-[320px] bg-muted animate-pulse rounded-md flex-shrink-0" />
                  ))
                ) : (
                  newestAlbums.map((album) => (
                    <AlbumArtwork
                      key={album.id}
                      album={album}
                      className="w-[220px] flex-shrink-0"
                      aspectRatio="square"
                      width={220}
                      height={220}
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