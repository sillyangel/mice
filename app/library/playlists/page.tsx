'use client';

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useNavidrome } from '@/app/components/NavidromeContext';
import Loading from '@/app/components/loading';
import { Button } from '@/components/ui/button';
import { PlusCircledIcon } from "@radix-ui/react-icons";
import Link from 'next/link';

const PlaylistsPage: React.FC = () => {
  const { playlists, isLoading, createPlaylist } = useNavidrome();

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
    <div className="h-full px-4 py-6 lg:px-8">
      <Tabs defaultValue="music" className="h-full space-y-6">
        <TabsContent value="music" className="border-none p-0 outline-none">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                {playlists.map((playlist) => (
                  <Link key={playlist.id} href={`/playlist/${playlist.id}`}>
                    <div className="p-4 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-6 w-6"
                            viewBox="0 0 24 24"
                          >
                            <path d="M21 15V6M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM12 12H3M16 6H3M12 18H3" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium leading-none truncate">{playlist.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {playlist.songCount} songs
                          </p>
                          {playlist.comment && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {playlist.comment}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
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