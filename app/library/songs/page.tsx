'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { Song } from '@/lib/navidrome';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Play, Plus, User, Disc } from 'lucide-react';
import Loading from '@/app/components/loading';
import { getNavidromeAPI } from '@/lib/navidrome';

type SortOption = 'title' | 'artist' | 'album' | 'year' | 'duration' | 'track';
type SortDirection = 'asc' | 'desc';

export default function SongsPage() {
  const { getAllSongs } = useNavidrome();
  const { playTrack, addToQueue, currentTrack } = useAudioPlayer();
  const [songs, setSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const api = getNavidromeAPI();

  useEffect(() => {
    const fetchSongs = async () => {
      setLoading(true);
      try {
        const allSongs = await getAllSongs();
        setSongs(allSongs);
        setFilteredSongs(allSongs);
      } catch (error) {
        console.error('Failed to fetch songs:', error);
      }
      setLoading(false);
    };

    fetchSongs();
  }, [getAllSongs]);

  useEffect(() => {
    let filtered = songs;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = songs.filter(song =>
        song.title.toLowerCase().includes(query) ||
        song.artist.toLowerCase().includes(query) ||
        song.album.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'artist':
          aValue = a.artist.toLowerCase();
          bValue = b.artist.toLowerCase();
          break;
        case 'album':
          aValue = a.album.toLowerCase();
          bValue = b.album.toLowerCase();
          break;
        case 'year':
          aValue = a.year || 0;
          bValue = b.year || 0;
          break;
        case 'duration':
          aValue = a.duration;
          bValue = b.duration;
          break;
        case 'track':
          aValue = a.track || 0;
          bValue = b.track || 0;
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredSongs(filtered);
  }, [songs, searchQuery, sortBy, sortDirection]);
  const handlePlaySong = (song: Song) => {
    if (!api) {
      console.error('Navidrome API not available');
      return;
    }
    
    const track = {
      id: song.id,
      name: song.title,
      url: api.getStreamUrl(song.id),
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      coverArt: song.coverArt ? api.getCoverArtUrl(song.coverArt, 1200) : undefined,
      albumId: song.albumId,
      artistId: song.artistId,
      starred: !!song.starred
    };

    playTrack(track);
  };
  const handleAddToQueue = (song: Song) => {
    if (!api) {
      console.error('Navidrome API not available');
      return;
    }
    
    const track = {
      id: song.id,
      name: song.title,
      url: api.getStreamUrl(song.id),
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      coverArt: song.coverArt ? api.getCoverArtUrl(song.coverArt, 1200) : undefined,
      albumId: song.albumId,
      artistId: song.artistId,
      starred: !!song.starred
    };

    addToQueue(track);
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const isCurrentlyPlaying = (song: Song): boolean => {
    return currentTrack?.id === song.id;
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="h-full px-4 py-6 lg:px-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Songs</h1>
          <p className="text-sm text-muted-foreground">
            {filteredSongs.length} of {songs.length} songs
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search songs, artists, or albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="artist">Artist</SelectItem>
                <SelectItem value="album">Album</SelectItem>
                <SelectItem value="year">Year</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
                <SelectItem value="track">Track #</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Songs List */}
        <ScrollArea className="h-[calc(100vh-300px)]">
          {filteredSongs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? 'No songs found matching your search.' : 'No songs available.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredSongs.map((song, index) => (
                <div
                  key={song.id}
                  className={`group flex items-center p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors ${
                    isCurrentlyPlaying(song) ? 'bg-accent/50 border-l-4 border-primary' : ''
                  }`}
                  onClick={() => handlePlaySong(song)}
                >
                  {/* Track Number / Play Indicator */}
                  <div className="w-8 text-center text-sm text-muted-foreground mr-3">
                    {isCurrentlyPlaying(song) ? (
                      <div className="w-4 h-4 mx-auto">
                        <div className="w-full h-full bg-primary rounded-full animate-pulse" />
                      </div>
                    ) : (
                      <>
                        <span className="group-hover:hidden">{index + 1}</span>
                        <Play className="w-4 h-4 mx-auto hidden group-hover:block" />
                      </>
                    )}
                  </div>

                  {/* Album Art */}
                  <div className="w-12 h-12 mr-4 shrink-0">                    <Image
                      src={song.coverArt && api ? api.getCoverArtUrl(song.coverArt, 300) : '/default-user.jpg'}
                      alt={song.album}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover rounded-md"
                    />
                  </div>

                  {/* Song Info */}
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`font-semibold truncate ${
                        isCurrentlyPlaying(song) ? 'text-primary' : ''
                      }`}>
                        {song.title}
                      </p>
                      {song.year && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {song.year}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground space-x-4">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span className="truncate">{song.artist}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Disc className="w-3 h-3" />
                        <span className="truncate">{song.album}</span>
                      </div>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center text-sm text-muted-foreground mr-4">
                    {formatDuration(song.duration)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToQueue(song);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
