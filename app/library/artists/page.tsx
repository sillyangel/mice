/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useState, useEffect } from 'react';
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ArtistIcon } from '@/app/components/artist-icon';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { Artist } from '@/lib/navidrome';
import Loading  from '@/app/components/loading';

export default function ArtistPage() {
  const { artists, isLoading } = useNavidrome();
  const [sortedArtists, setSortedArtists] = useState<Artist[]>([]);

  useEffect(() => {
    if (artists.length > 0) {
      // Sort artists alphabetically by name
      const sorted = [...artists].sort((a, b) => a.name.localeCompare(b.name));
      setSortedArtists(sorted);
    }
  }, [artists]);

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
                Artists
              </p>
              <p className="text-sm text-muted-foreground">
                All artists in your music library ({sortedArtists.length} artists)
              </p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="relative">
            <ScrollArea>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-4">
                {sortedArtists.map((artist) => (
                  <ArtistIcon
                    key={artist.id}
                    artist={artist}
                    className="flex justify-center"
                    size={150}
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