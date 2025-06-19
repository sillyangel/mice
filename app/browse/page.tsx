/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { AlbumArtwork } from '@/app/components/album-artwork';
import { ArtistIcon } from '@/app/components/artist-icon';
import { useNavidrome } from '@/app/components/NavidromeContext';
import Loading from '@/app/components/loading';

export default function BrowsePage() {
  const { albums, artists, isLoading } = useNavidrome();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="h-full px-4 py-6 lg:px-8">
    <>
      <Tabs defaultValue="music" className="h-full flex flex-col space-y-6">
        <TabsContent value="music" className="border-none p-0 outline-none flex flex-col flex-grow">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight">
                Artists
              </p>
              <p className="text-sm text-muted-foreground">
                the people who make the music
              </p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="relative flex-grow">
            <div className="relative">
            <ScrollArea>
            <div className="flex space-x-4 pb-4">
            {artists.map((artist) => (
                  <ArtistIcon
                    key={artist.id}
                    artist={artist}
                    className="flex-shrink-0"
                    size={150}
                  />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight">
                Browse
              </p>
              <p className="text-sm text-muted-foreground">
                Browse the full collection of music available.
              </p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="relative flex-grow">
            <ScrollArea className="h-full">
              <div className="h-full overflow-y-auto">
                <div className="flex flex-wrap gap-4 p-4">
                  {albums.map((album) => (
                    <AlbumArtwork
                      key={album.id}
                      album={album}
                      className="w-[230px]"
                      aspectRatio="square"
                      width={230}
                      height={230}
                    />
                  ))}
                </div>
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