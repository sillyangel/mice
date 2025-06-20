'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlbumArtwork } from '@/app/components/album-artwork';
import { ArtistIcon } from '@/app/components/artist-icon';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { getNavidromeAPI, Artist, Album, Song } from '@/lib/navidrome';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { Search, Play, Plus } from 'lucide-react';

export default function SearchPage() {
  const { search2 } = useNavidrome();
  const { addToQueue, playTrack } = useAudioPlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    artists: Artist[];
    albums: Album[];
    songs: Song[];
  }>({ artists: [], albums: [], songs: [] });
  const [isSearching, setIsSearching] = useState(false);
  const api = getNavidromeAPI();

  const handleSearch = async (query: string) => {
    if (query.trim() === '') {
      setSearchResults({ artists: [], albums: [], songs: [] });
      return;
    }

    try {
      setIsSearching(true);
      const results = await search2(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults({ artists: [], albums: [], songs: [] });
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handlePlaySong = (song: Song) => {
    const track = {
      id: song.id,
      name: song.title,
      url: api.getStreamUrl(song.id),
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      coverArt: song.coverArt ? api.getCoverArtUrl(song.coverArt, 300) : undefined,
      albumId: song.albumId,
      artistId: song.artistId
    };

    playTrack(track);
  };

  const handleAddToQueue = (song: Song) => {
    const track = {
      id: song.id,
      name: song.title,
      url: api.getStreamUrl(song.id),
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      coverArt: song.coverArt ? api.getCoverArtUrl(song.coverArt, 300) : undefined,
      albumId: song.albumId,
      artistId: song.artistId
    };

    addToQueue(track);
  };

  const formatDuration = (duration: number): string => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full px-4 py-6 lg:px-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Search</h1>
          <p className="text-muted-foreground">
            Search for artists, albums, and songs in your music library
          </p>
        </div>

        {/* Search Input */}
        <div className="space-y-4">
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="What do you want to listen to?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-lg h-12"
            />
          </div>
          {isSearching && <div className="text-sm text-muted-foreground">Searching...</div>}
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="space-y-6">
            {searchResults.artists.length === 0 && searchResults.albums.length === 0 && searchResults.songs.length === 0 && !isSearching && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No results found for &quot;{searchQuery}&quot;</p>
                <p className="text-muted-foreground text-sm mt-2">Try different keywords or check your spelling</p>
              </div>
            )}

            {/* Artists */}
            {searchResults.artists.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Artists</h2>
                <ScrollArea className="w-full">
                  <div className="flex space-x-4 pb-4">
                    {searchResults.artists.map((artist) => (
                      <ArtistIcon key={artist.id} artist={artist} className="flex-shrink-0" />
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}

            {/* Albums */}
            {searchResults.albums.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Albums</h2>
                <ScrollArea className="w-full">
                  <div className="flex space-x-4 pb-4">
                    {searchResults.albums.map((album) => (
                      <AlbumArtwork 
                        key={album.id} 
                        album={album} 
                        className="flex-shrink-0 w-48" 
                        aspectRatio="square"
                        width={192}
                        height={192}
                      />
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}

            {/* Songs */}
            {searchResults.songs.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Songs</h2>
                <div className="space-y-2">
                  {searchResults.songs.slice(0, 10).map((song, index) => (
                    <div key={song.id} className="group flex items-center space-x-3 p-3 hover:bg-accent rounded-lg transition-colors">
                      <div className="w-8 text-center text-sm text-muted-foreground">
                        <span className="group-hover:hidden">{index + 1}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlaySong(song)}
                          className="hidden group-hover:flex h-8 w-8 p-0"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Song Cover */}
                      <div className="flex-shrink-0">
                        <Image
                          src={song.coverArt ? api.getCoverArtUrl(song.coverArt, 64) : '/default-user.jpg'}
                          alt={song.album}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-md object-cover"
                        />
                      </div>
                      
                      {/* Song Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{song.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{song.artist} • {song.album}</p>
                      </div>
                      
                      {/* Duration */}
                      <div className="text-sm text-muted-foreground">
                        {formatDuration(song.duration)}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddToQueue(song)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {searchResults.songs.length > 10 && (
                    <div className="text-center pt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing first 10 of {searchResults.songs.length} songs
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!searchQuery && (
          <div className="text-center py-24">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Search your music</h3>
            <p className="text-muted-foreground">
              Find your favorite artists, albums, and songs
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
