'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  X, 
  Music, 
  Disc, 
  User, 
  Clock, 
  Heart,
  Play,
  Plus,
  ExternalLink,
  Info,
  Star,
  TrendingUp,
  Users,
  Calendar,
  Globe
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { lastFmAPI } from '@/lib/lastfm-api';
import { Song, Album, Artist, getNavidromeAPI } from '@/lib/navidrome';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import Image from 'next/image';

interface SpotlightSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LastFmTrackInfo {
  name: string;
  artist: {
    name: string;
    url: string;
  };
  album?: {
    title: string;
    image?: string;
  };
  wiki?: {
    summary: string;
    content: string;
  };
  duration?: string;
  playcount?: string;
  listeners?: string;
  tags?: Array<{
    name: string;
    url: string;
  }>;
}

interface LastFmTag {
  name: string;
  url: string;
}

interface LastFmArtist {
  name: string;
  url: string;
  image?: Array<{ '#text': string; size: string }>;
}

interface LastFmBio {
  summary: string;
  content: string;
}

interface LastFmStats {
  listeners: string;
  playcount: string;
}

interface LastFmArtistInfo {
  name: string;
  bio?: LastFmBio;
  stats?: LastFmStats;
  tags?: {
    tag: LastFmTag[];
  };
  similar?: {
    artist: LastFmArtist[];
  };
  image?: Array<{ '#text': string; size: string }>;
}

interface SearchResult {
  type: 'track' | 'album' | 'artist';
  id: string;
  title: string;
  subtitle: string;
  image?: string;
  data: Song | Album | Artist;
  lastFmData?: LastFmArtistInfo;
}

export function SpotlightSearch({ isOpen, onClose }: SpotlightSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [lastFmDetails, setLastFmDetails] = useState<LastFmArtistInfo | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const api = getNavidromeAPI();
  
  const { search2 } = useNavidrome();
  const { playTrack, addToQueue, insertAtBeginningOfQueue } = useAudioPlayer();

  // Convert Song to Track with proper URL generation
  const songToTrack = useCallback((song: Song) => {
    if (!api) {
      throw new Error('Navidrome API not configured');
    }
    
    return {
      id: song.id,
      name: song.title,
      url: api.getStreamUrl(song.id),
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      coverArt: song.coverArt ? api.getCoverArtUrl(song.coverArt, 512) : undefined,
      albumId: song.albumId,
      artistId: song.artistId,
      starred: !!song.starred,
      replayGain: song.replayGain || 0
    };
  }, [api]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close on escape
  useKeyboardShortcuts({
    disabled: !isOpen
  });

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleResultSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (showDetails) {
            setShowDetails(false);
            setSelectedResult(null);
          } else {
            onClose();
          }
          break;
        case 'Tab':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleShowDetails(results[selectedIndex]);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, showDetails, onClose]);

  // Search function with debouncing
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = await search2(searchQuery);
      const formattedResults: SearchResult[] = [];

      // Add tracks
      searchResults.songs?.forEach(song => {
        formattedResults.push({
          type: 'track',
          id: song.id,
          title: song.title,
          subtitle: `${song.artist} • ${song.album}`,
          image: song.coverArt && api ? api.getCoverArtUrl(song.coverArt, 256) : undefined,
          data: song
        });
      });

      // Add albums
      searchResults.albums?.forEach(album => {
        formattedResults.push({
          type: 'album',
          id: album.id,
          title: album.name,
          subtitle: `${album.artist} • ${album.songCount} tracks`,
          image: album.coverArt && api ? api.getCoverArtUrl(album.coverArt, 256) : undefined,
          data: album
        });
      });

      // Add artists
      searchResults.artists?.forEach(artist => {
        formattedResults.push({
          type: 'artist',
          id: artist.id,
          title: artist.name,
          subtitle: `${artist.albumCount} albums`,
          image: artist.coverArt && api ? api.getCoverArtUrl(artist.coverArt, 256) : undefined,
          data: artist
        });
      });

      setResults(formattedResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [search2]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  const handleResultSelect = (result: SearchResult) => {
    switch (result.type) {
      case 'track':
        const songData = result.data as Song;
        const track = songToTrack(songData);
        playTrack(track, true);
        onClose();
        break;
      case 'album':
        router.push(`/album/${result.id}`);
        onClose();
        break;
      case 'artist':
        router.push(`/artist/${result.id}`);
        onClose();
        break;
    }
  };

  const handleShowDetails = async (result: SearchResult) => {
    setSelectedResult(result);
    setShowDetails(true);
    setLastFmDetails(null);

    // Fetch Last.fm data
    try {
      let lastFmData = null;
      
      if (result.type === 'artist') {
        const artistData = result.data as Artist;
        lastFmData = await lastFmAPI.getArtistInfo(artistData.name);
      } else if (result.type === 'album') {
        // For albums, get artist info as Last.fm album info is limited
        const albumData = result.data as Album;
        lastFmData = await lastFmAPI.getArtistInfo(albumData.artist);
      } else if (result.type === 'track') {
        // For tracks, get artist info
        const songData = result.data as Song;
        lastFmData = await lastFmAPI.getArtistInfo(songData.artist);
      }
      
      setLastFmDetails(lastFmData);
    } catch (error) {
      console.error('Failed to fetch Last.fm data:', error);
    }
  };

  const handlePlayNext = (result: SearchResult) => {
    if (result.type === 'track') {
      const songData = result.data as Song;
      const track = songToTrack(songData);
      insertAtBeginningOfQueue(track);
    }
  };

  const handleAddToQueue = (result: SearchResult) => {
    if (result.type === 'track') {
      const songData = result.data as Song;
      const track = songToTrack(songData);
      addToQueue(track);
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'track': return <Music className="w-4 h-4" />;
      case 'album': return <Disc className="w-4 h-4" />;
      case 'artist': return <User className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <div className="flex items-start justify-center pt-[10vh] px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="w-full max-w-2xl bg-background border border-border rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center px-4 py-3 border-b border-border">
              <Search className="w-5 h-5 text-muted-foreground mr-3" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tracks, albums, artists..."
                className="border-0 focus-visible:ring-0 text-lg bg-transparent"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuery('')}
                  className="p-1 h-auto"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="ml-2 text-muted-foreground">Searching...</span>
                </div>
              ) : results.length > 0 ? (
                <ScrollArea className="max-h-96" ref={resultsRef}>
                  <div className="py-2">
                    {results.map((result, index) => (
                      <div
                        key={`${result.type}-${result.id}`}
                        className={`flex items-center px-4 py-3 cursor-pointer transition-colors ${
                          index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                        }`}
                        onClick={() => handleResultSelect(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {result.image ? (
                            <Image
                              src={result.image}
                              alt={result.title}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                              {getResultIcon(result.type)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{result.title}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              {result.subtitle}
                            </div>
                          </div>
                          <Badge variant="secondary" className="capitalize">
                            {result.type}
                          </Badge>
                        </div>
                        
                        {/* Quick Actions */}
                        <div className="flex items-center space-x-1 ml-3">
                          {result.type === 'track' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlayNext(result);
                                }}
                                className="h-8 w-8 p-0"
                                title="Play Next"
                              >
                                <Play className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToQueue(result);
                                }}
                                className="h-8 w-8 p-0"
                                title="Add to Queue"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowDetails(result);
                            }}
                            className="h-8 w-8 p-0"
                            title="Show Details (Tab)"
                          >
                            <Info className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : query.trim() ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Search className="w-8 h-8 mb-2" />
                  <p>No results found for &ldquo;{query}&rdquo;</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Music className="w-8 h-8 mb-2" />
                  <p>Start typing to search your music library</p>
                  <div className="text-xs mt-2 space-y-1">
                    <p>• Use ↑↓ to navigate • Enter to select</p>
                    <p>• Tab for details • Esc to close</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Details Panel */}
        <AnimatePresence>
          {showDetails && selectedResult && (
            <motion.div
              initial={{ opacity: 0, x: 400 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 400 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="fixed right-4 top-[10vh] bottom-4 w-80 bg-background border border-border rounded-lg shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold">Details</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {/* Basic Info */}
                  <div className="space-y-3">
                    {selectedResult.image && (
                      <Image
                        src={selectedResult.image}
                        alt={selectedResult.title}
                        width={200}
                        height={200}
                        className="w-full aspect-square rounded object-cover"
                      />
                    )}
                    <div>
                      <h4 className="font-semibold text-lg">{selectedResult.title}</h4>
                      <p className="text-muted-foreground">{selectedResult.subtitle}</p>
                      <Badge variant="secondary" className="mt-1 capitalize">
                        {selectedResult.type}
                      </Badge>
                    </div>
                  </div>

                  {/* Last.fm Data */}
                  {lastFmDetails && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <ExternalLink className="w-4 h-4" />
                          <span className="font-medium">Last.fm Info</span>
                        </div>

                        {/* Stats */}
                        {lastFmDetails.stats && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-2 bg-muted rounded">
                              <div className="flex items-center justify-center space-x-1 mb-1">
                                <Users className="w-3 h-3" />
                                <span className="text-xs font-medium">Listeners</span>
                              </div>
                              <div className="text-sm font-semibold">
                                {parseInt(lastFmDetails.stats.listeners).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-center p-2 bg-muted rounded">
                              <div className="flex items-center justify-center space-x-1 mb-1">
                                <TrendingUp className="w-3 h-3" />
                                <span className="text-xs font-medium">Plays</span>
                              </div>
                              <div className="text-sm font-semibold">
                                {parseInt(lastFmDetails.stats.playcount).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Bio */}
                        {lastFmDetails.bio?.summary && (
                          <div>
                            <h5 className="font-medium mb-2">Biography</h5>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {lastFmDetails.bio.summary.replace(/<[^>]*>/g, '').split('\n')[0]}
                            </p>
                          </div>
                        )}

                        {/* Tags */}
                        {lastFmDetails.tags?.tag && (
                          <div>
                            <h5 className="font-medium mb-2">Tags</h5>
                            <div className="flex flex-wrap gap-1">
                              {lastFmDetails.tags.tag.slice(0, 6).map((tag: LastFmTag, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Similar Artists */}
                        {lastFmDetails.similar?.artist && (
                          <div>
                            <h5 className="font-medium mb-2">Similar Artists</h5>
                            <div className="space-y-2">
                              {lastFmDetails.similar.artist.slice(0, 4).map((artist: LastFmArtist, index: number) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                                    <User className="w-3 h-3" />
                                  </div>
                                  <span className="text-sm">{artist.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Actions */}
                  <Separator />
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleResultSelect(selectedResult)}
                      className="w-full"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {selectedResult.type === 'track' ? 'Play Track' : 
                       selectedResult.type === 'album' ? 'View Album' : 'View Artist'}
                    </Button>
                    {selectedResult.type === 'track' && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handlePlayNext(selectedResult)}
                          className="w-full"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Play Next
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleAddToQueue(selectedResult)}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add to Queue
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
