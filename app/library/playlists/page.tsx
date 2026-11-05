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
import { Music } from 'lucide-react';

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
    <div className="p-6 pb-28 w-full">
      <Tabs defaultValue="music" className="h-full space-y-6">
        <TabsContent value="music" className="border-none p-0 outline-hidden">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Playlists
              </h1>
              <p className="text-sm text-white/60">
                Your custom playlists ({playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'})
              </p>
            </div>
            <Button onClick={handleCreatePlaylist} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <PlusCircledIcon className="mr-2 h-4 w-4" />
              New Playlist
            </Button>
          </div>

          <Separator className="my-4 border-white/10" />

          <div className="relative">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5 pb-12">
                {playlists.map((playlist) => {
                  const playlistCoverUrl = playlist.coverArt && api
                    ? api.getCoverArtUrl(playlist.coverArt, 600)
                    : null;
                  
                  return (
                    <Link key={playlist.id} href={`/playlist/${playlist.id}`} className="group block space-y-2">
                      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white/[0.04] shadow-md border border-white/[0.06]">
                        {playlistCoverUrl ? (
                          <Image
                            src={playlistCoverUrl}
                            alt={playlist.name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-white/[0.04] text-white/30">
                            <Music className="w-10 h-10" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-0.5 text-sm">
                        <h3 className="font-medium text-white group-hover:underline truncate leading-snug">
                          {playlist.name}
                        </h3>
                        <p className="text-xs text-white/50 truncate">
                          {playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlaylistsPage;