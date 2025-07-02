/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useState, useEffect } from 'react';
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArtistIcon } from '@/app/components/artist-icon';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { Artist } from '@/lib/navidrome';
import Loading from '@/app/components/loading';
import { Search, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function ArtistPage() {
  const { artists, isLoading, api, starItem, unstarItem } = useNavidrome();
  const [filteredArtists, setFilteredArtists] = useState<Artist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'albumCount'>('name');
  const router = useRouter();

  const toggleFavorite = async (artistId: string, isStarred: boolean) => {
    if (isStarred) {
      await unstarItem(artistId, 'artist');
    } else {
      await starItem(artistId, 'artist');
    }
  };

  const handleViewArtist = (artist: Artist) => {
    router.push(`/artist/${artist.id}`);
  };

  useEffect(() => {
    if (artists.length > 0) {
      let filtered = [...artists];
      
      // Filter by search query
      if (searchQuery) {
        filtered = filtered.filter(artist =>
          artist.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Sort artists
      filtered.sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        } else {
          return (b.albumCount || 0) - (a.albumCount || 0);
        }
      });
      
      setFilteredArtists(filtered);
    }
  }, [artists, searchQuery, sortBy]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="h-full px-4 py-6 lg:px-8 mb-24">
      <Tabs defaultValue="music" className="h-full space-y-6">
        <TabsContent value="music" className="border-none p-0 outline-none">
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
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 cursor-pointer">
                {filteredArtists.map((artist) => (
                  <Card key={artist.id} className="overflow-hidden">
                    <div className="aspect-square relative group cursor-pointer" onClick={() => handleViewArtist(artist)}>
                        <div className="w-full h-full">
                        <Image
                          src={artist.coverArt && api ? api.getCoverArtUrl(artist.coverArt, 200) : '/placeholder-artist.png'}
                          alt={artist.name}
                          width={290}
                          height={290}
                          className="object-cover w-full h-full"
                        />
                        </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold truncate">{artist.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {artist.albumCount} albums
                      </p>
                    </CardContent>
                  </Card>
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