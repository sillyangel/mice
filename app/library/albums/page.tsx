/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { AlbumArtwork } from '@/app/components/album-artwork';
import { getNavidromeAPI, Album } from '@/lib/navidrome';
import { useAudioPlayerActions } from '@/app/components/AudioPlayerContext';
import { Shuffle, Search } from 'lucide-react';
import Loading from '@/app/components/loading';

export default function AlbumsPage() {
  const { shuffleAllAlbums } = useAudioPlayerActions();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const [hasMoreAlbums, setHasMoreAlbums] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'alphabeticalByName' | 'newest' | 'alphabeticalByArtist'>('alphabeticalByName');
  const albumsPerPage = 48;

  const api = getNavidromeAPI();

  const loadAlbums = useCallback(async (page: number, append: boolean = false) => {
    if (!api) {
      console.error('Navidrome API not available');
      return;
    }
    
    try {
      setIsLoadingAlbums(true);
      const offset = page * albumsPerPage;
      const newAlbums = await api.getAlbums(sortBy, albumsPerPage, offset);
      
      if (append) {
        setAlbums(prev => [...prev, ...newAlbums]);
      } else {
        setAlbums(newAlbums);
      }
      
      setHasMoreAlbums(newAlbums.length === albumsPerPage);
    } catch (error) {
      console.error('Failed to load albums:', error);
    } finally {
      setIsLoadingAlbums(false);
    }
  }, [api, sortBy]);

  useEffect(() => {
    setCurrentPage(0);
    loadAlbums(0);
  }, [loadAlbums]);

  const filteredAlbums = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return albums;
    return albums.filter(album =>
      album.name.toLowerCase().includes(q) ||
      album.artist.toLowerCase().includes(q)
    );
  }, [albums, searchQuery]);

  const loadMore = useCallback(() => {
    if (isLoadingAlbums || !hasMoreAlbums || searchQuery) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    loadAlbums(nextPage, true);
  }, [isLoadingAlbums, hasMoreAlbums, searchQuery, currentPage, loadAlbums]);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || isLoadingAlbums || !hasMoreAlbums || searchQuery) return;
      
      const { scrollTop, scrollHeight, clientHeight } = target;
      if (scrollHeight - scrollTop - clientHeight < 300) {
        loadMore();
      }
    };

    const scrollArea = document.querySelector('main') || document.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollArea) {
      scrollArea.addEventListener('scroll', handleScroll, { passive: true });
      return () => scrollArea.removeEventListener('scroll', handleScroll);
    }
  }, [isLoadingAlbums, hasMoreAlbums, searchQuery, loadMore]);

  if (isLoadingAlbums && albums.length === 0) {
    return <Loading />;
  }

  return (
    <div className="h-full px-4 py-6 lg:px-8">
      <Tabs defaultValue="music" className="h-full flex flex-col space-y-6">
        <TabsContent value="music" className="border-none p-0 outline-hidden flex flex-col grow">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight">
                Albums
              </p>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? `${filteredAlbums.length} albums found` : `Browse all albums (${albums.length} loaded)`}
              </p>
            </div>
            <Button onClick={shuffleAllAlbums} className="flex items-center gap-2">
              <Shuffle className="w-4 h-4" />
              Shuffle All Albums
            </Button>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search albums and artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alphabeticalByName">Sort by Album Name</SelectItem>
                <SelectItem value="alphabeticalByArtist">Sort by Artist</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-4" />
          
          <div className="relative grow">
            <ScrollArea className="h-full">
              <div className="h-full overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 p-4 pb-8">
                  {filteredAlbums.map((album, idx) => (
                    <AlbumArtwork
                      key={album.id}
                      album={album}
                      className="w-full"
                      aspectRatio="square"
                      width={300}
                      height={300}
                      loading={idx < 14 ? 'eager' : 'lazy'}
                    />
                  ))}
                </div>
                {!searchQuery && hasMoreAlbums && (
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
                {!searchQuery && !hasMoreAlbums && albums.length > 0 && (
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
    </div>
  );
}