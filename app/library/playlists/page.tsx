'use client';

import Image from 'next/image';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useNavidrome } from '@/app/components/NavidromeContext';
import Loading from '@/app/components/loading';
import { Button } from '@/components/ui/button';
import { PlusCircledIcon } from "@radix-ui/react-icons";
import Link from 'next/link';
import { getNavidromeAPI } from '@/lib/navidrome';

const PlaylistsPage: React.FC = () => {
  const { playlists, isLoading, createPlaylist } = useNavidrome();
  const api = getNavidromeAPI();

  const handleCreatePlaylist = async () => {
    const name = prompt('Enter playlist name:');
    if (name) {
      try {
        await createPlaylist(name);
      } catch (error) {
        console.error('Failed to create playlist:', error);
      }
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="container mx-auto p-6 pb-24 max-w-none">
      <Tabs defaultValue="music" className="h-full space-y-6">
        <TabsContent value="music" className="border-none p-0 outline-hidden">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight">
                Playlists
              </p>
              <p className="text-sm text-muted-foreground">
                Your custom playlists ({playlists.length} playlists)
              </p>
            </div>
            <Button onClick={handleCreatePlaylist}>
              <PlusCircledIcon className="mr-2 h-4 w-4" />
              New Playlist
            </Button>
          </div>
          <Separator className="my-4" />
          <div className="relative">
            <ScrollArea>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">                {playlists.map((playlist) => {
                  const playlistCoverUrl = playlist.coverArt && api
                    ? api.getCoverArtUrl(playlist.coverArt, 200)
                    : '/default-user.jpg';
                  
                  return (
                    <Link key={playlist.id} href={`/playlist/${playlist.id}`}>
                      <div className="p-4 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer h-32">
                        <div className="flex items-center space-x-4 h-full">
                          <div className="w-12 h-12 bg-muted rounded-md overflow-hidden shrink-0">
                            <Image
                              src={playlistCoverUrl}
                              alt={playlist.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <p className="font-medium leading-none truncate">{playlist.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {playlist.songCount} songs
                            </p>
                            <div className="h-4 mt-1">
                              {playlist.comment && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {playlist.comment}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlaylistsPage;