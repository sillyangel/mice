/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useState, useEffect } from 'react';
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AlbumArtwork } from '@/app/components/album-artwork';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { Album } from '@/lib/navidrome';
import Loading  from '@/app/components/loading';

export default function Albumpage() {
  const { albums, isLoading } = useNavidrome();
  const [sortedAlbums, setSortedAlbums] = useState<Album[]>([]);

  useEffect(() => {
    if (albums.length > 0) {
      // Sort albums alphabetically by name
      const sorted = [...albums].sort((a, b) => a.name.localeCompare(b.name));
      setSortedAlbums(sorted);
    }
  }, [albums]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="h-full px-4 py-6 lg:px-8">
      <Tabs defaultValue="music" className="h-full space-y-6">
        <TabsContent value="music" className="border-none p-0 outline-none">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight">
                Albums 
              </p>
              <p className="text-sm text-muted-foreground">
                All albums in your music library ({sortedAlbums.length} albums)
              </p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="relative">
            <ScrollArea>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-4">
                {sortedAlbums.map((album) => (
                  <AlbumArtwork
                    key={album.id}
                    album={album}
                    className="w-full"
                    aspectRatio="square"
                    width={200}
                    height={200}
                  />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}