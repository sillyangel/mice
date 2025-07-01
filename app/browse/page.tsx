/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { AlbumArtwork } from '@/app/components/album-artwork';
import { ArtistIcon } from '@/app/components/artist-icon';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { getNavidromeAPI, Album } from '@/lib/navidrome';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { Shuffle } from 'lucide-react';
import Loading from '@/app/components/loading';

export default function BrowsePage() {
  const { artists, isLoading: contextLoading } = useNavidrome();
  const { shuffleAllAlbums } = useAudioPlayer();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const [hasMoreAlbums, setHasMoreAlbums] = useState(true);
  const albumsPerPage = 84;

  const api = getNavidromeAPI();
  const loadAlbums = async (page: number, append: boolean = false) => {
    if (!api) {
      console.error('Navidrome API not available');
      return;
    }
    
    try {
      setIsLoadingAlbums(true);
      const offset = page * albumsPerPage;
      
      // Use alphabeticalByName to get all albums in alphabetical order
      const newAlbums = await api.getAlbums('alphabeticalByName', albumsPerPage, offset);
      
      if (append) {
        setAlbums(prev => [...prev, ...newAlbums]);
      } else {
        setAlbums(newAlbums);
      }
      
      // If we got fewer albums than requested, we've reached the end
      setHasMoreAlbums(newAlbums.length === albumsPerPage);
    } catch (error) {
      console.error('Failed to load albums:', error);
    } finally {
      setIsLoadingAlbums(false);
    }
  };

  useEffect(() => {
    loadAlbums(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || isLoadingAlbums || !hasMoreAlbums) return;
      
      const { scrollTop, scrollHeight, clientHeight } = target;
      const threshold = 200; // Load more when 200px from bottom
      
      if (scrollHeight - scrollTop - clientHeight < threshold) {
        loadMore();
      }
    };

    const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollArea) {
      scrollArea.addEventListener('scroll', handleScroll);
      return () => scrollArea.removeEventListener('scroll', handleScroll);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingAlbums, hasMoreAlbums, currentPage]);

  const loadMore = () => {
    if (isLoadingAlbums || !hasMoreAlbums) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    loadAlbums(nextPage, true);
  };

  if (contextLoading) {
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
            <Button onClick={shuffleAllAlbums} className="flex items-center gap-2">
              <Shuffle className="w-4 h-4" />
              Shuffle All Albums
            </Button>
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
                    className="flex-shrink-0 overflow-hidden"
                    size={190}
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
                Browse Albums
              </p>
              <p className="text-sm text-muted-foreground">
                Browse the full collection of albums ({albums.length} loaded).
              </p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="relative flex-grow">
            <ScrollArea className="h-full">
              <div className="h-full overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 p-4 pb-8">
                  {albums.map((album) => (
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
                {hasMoreAlbums && (
                  <div className="flex justify-center p-4 pb-24">
                    <Button 
                      onClick={loadMore} 
                      disabled={isLoadingAlbums}
                      variant="outline"
                    >
                      {isLoadingAlbums ? 'Loading...' : `Load More Albums (${albumsPerPage} more)`}
                    </Button>
                  </div>
                )}
                {!hasMoreAlbums && albums.length > 0 && (
                  <div className="flex justify-center p-4 pb-24">
                    <p className="text-sm text-muted-foreground">
                      All albums loaded ({albums.length} total)
                    </p>
                  </div>
                )}
              </div>
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </>
    </div>
  );
}