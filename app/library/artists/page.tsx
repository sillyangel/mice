/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useState, useEffect, useMemo } from 'react';
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArtistIcon } from '@/app/components/artist-icon';
import { useNavidrome } from '@/app/components/NavidromeContext';
import Loading from '@/app/components/loading';
import { Search } from 'lucide-react';

const ARTISTS_BATCH_SIZE = 48;

export default function ArtistPage() {
  const { artists, artistsLoading } = useNavidrome();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'albumCount'>('name');
  const [visibleCount, setVisibleCount] = useState(ARTISTS_BATCH_SIZE);

  useEffect(() => {
    setVisibleCount(ARTISTS_BATCH_SIZE);
  }, [searchQuery, sortBy]);

  const filteredArtists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = q
      ? artists.filter(artist => artist.name.toLowerCase().includes(q))
      : artists;

    return [...base].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return (b.albumCount || 0) - (a.albumCount || 0);
    });
  }, [artists, searchQuery, sortBy]);

  useEffect(() => {
    if (visibleCount >= filteredArtists.length) return;
    const scrollEl = document.querySelector('main');
    if (!scrollEl) return;

    const handleScroll = () => {
      if (scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 400) {
        setVisibleCount(prev => Math.min(prev + ARTISTS_BATCH_SIZE, filteredArtists.length));
      }
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, [visibleCount, filteredArtists.length]);

  if (artistsLoading && artists.length === 0) {
    return <Loading />;
  }

  const displayedArtists = filteredArtists.slice(0, visibleCount);

  return (
    <div className="h-full px-4 py-6 lg:px-8 mb-24">
      <Tabs defaultValue="music" className="h-full space-y-6">
        <TabsContent value="music" className="border-none p-0 outline-hidden">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight">
                Artists
              </p>
              <p className="text-sm text-muted-foreground">
                {filteredArtists.length} of {artists.length} artists
              </p>
            </div>
          </div>
          
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 my-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={(value: 'name' | 'albumCount') => setSortBy(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="albumCount">Sort by Album Count</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Separator className="my-4" />
          <div className="relative">
            <ScrollArea>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 cursor-pointer">
                {displayedArtists.map((artist, idx) => (
                  <ArtistIcon
                    key={artist.id}
                    artist={artist}
                    responsive
                    loading={idx < 12 ? 'eager' : 'lazy'}
                  />
                ))}
              </div>
              {visibleCount < filteredArtists.length && (
                <div className="flex justify-center pt-6 pb-8">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount(prev => Math.min(prev + ARTISTS_BATCH_SIZE, filteredArtists.length))}
                  >
                    Load More Artists ({filteredArtists.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}