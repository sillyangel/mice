'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useOfflineLibrary } from '@/hooks/use-offline-library';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { 
  Download, 
  Trash2, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Database, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Music,
  User,
  List,
  HardDrive,
  Disc,
  Search,
  Filter,
  SlidersHorizontal
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Album, Playlist } from '@/lib/navidrome';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { OfflineManagement } from './OfflineManagement';
import { Skeleton } from '@/components/ui/skeleton';

// Helper functions
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(date: Date | null): string {
  if (!date) return 'Never';
  return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
}

// Album card for selection
function AlbumSelectionCard({ 
  album, 
  isSelected, 
  onToggleSelection, 
  isDownloading,
  downloadProgress,
  estimatedSize
}: { 
  album: Album; 
  isSelected: boolean;
  onToggleSelection: () => void;
  isDownloading: boolean;
  downloadProgress?: number;
  estimatedSize: string;
}) {
  const { api } = useNavidrome();
  
  return (
    <Card className={`mb-3 overflow-hidden transition-all ${isSelected ? 'border-primary' : ''}`}>
      <div className="flex p-3">
        <div className="shrink-0">
          <Image 
            src={album.coverArt ? (api?.getCoverArtUrl(album.coverArt) || '/default-user.jpg') : '/default-user.jpg'} 
            alt={album.name}
            width={60}
            height={60}
            className="rounded-md object-cover"
          />
        </div>
        <div className="ml-3 flex-1 overflow-hidden">
          <h4 className="font-medium truncate">{album.name}</h4>
          <p className="text-sm text-muted-foreground truncate">{album.artist}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">{album.songCount} songs • {estimatedSize}</span>
            <Switch 
              checked={isSelected} 
              onCheckedChange={onToggleSelection}
              disabled={isDownloading}
            />
          </div>
        </div>
      </div>
      
      {isDownloading && downloadProgress !== undefined && (
        <Progress value={downloadProgress} className="h-1 rounded-none mt-1" />
      )}
    </Card>
  );
}

// Playlist selection card
function PlaylistSelectionCard({ 
  playlist, 
  isSelected, 
  onToggleSelection,
  isDownloading,
  downloadProgress,
  estimatedSize
}: { 
  playlist: Playlist; 
  isSelected: boolean;
  onToggleSelection: () => void;
  isDownloading: boolean;
  downloadProgress?: number;
  estimatedSize: string;
}) {
  const { api } = useNavidrome();
  
  return (
    <Card className={`mb-3 overflow-hidden transition-all ${isSelected ? 'border-primary' : ''}`}>
      <div className="flex p-3">
        <div className="shrink-0">
          <div className="w-[60px] h-[60px] rounded-md bg-accent flex items-center justify-center">
            <List className="h-6 w-6 text-primary" />
          </div>
        </div>
        <div className="ml-3 flex-1 overflow-hidden">
          <h4 className="font-medium truncate">{playlist.name}</h4>
          <p className="text-sm text-muted-foreground truncate">by {playlist.owner}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">{playlist.songCount} songs • {estimatedSize}</span>
            <Switch 
              checked={isSelected} 
              onCheckedChange={onToggleSelection}
              disabled={isDownloading}
            />
          </div>
        </div>
      </div>
      
      {isDownloading && downloadProgress !== undefined && (
        <Progress value={downloadProgress} className="h-1 rounded-none mt-1" />
      )}
    </Card>
  );
}

export default function EnhancedOfflineManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState({
    albums: false,
    playlists: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set());
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());
  const [downloadingItems, setDownloadingItems] = useState<Map<string, number>>(new Map());
  
  // Filter state
  const [sortBy, setSortBy] = useState('recent');
  const [filtersVisible, setFiltersVisible] = useState(false);
  
  const offline = useOfflineLibrary();
  const { api } = useNavidrome();

  // Load albums and playlists
  // ...existing code...

  // ...existing code...
  // Place useEffect after the first (and only) declarations of loadAlbums and loadPlaylists

  // Load albums data
  const loadAlbums = async () => {
    setLoading(prev => ({ ...prev, albums: true }));
    try {
      const albumData = await offline.getAlbums();
      setAlbums(albumData);
      
      // Load previously selected albums from localStorage
      const savedSelections = localStorage.getItem('navidrome-offline-albums');
      if (savedSelections) {
        setSelectedAlbums(new Set(JSON.parse(savedSelections)));
      }
      
    } catch (error) {
      console.error('Failed to load albums:', error);
      toast({
        title: 'Error',
        description: 'Failed to load albums. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(prev => ({ ...prev, albums: false }));
    }
  };

  // Load playlists data
  const loadPlaylists = async () => {
    setLoading(prev => ({ ...prev, playlists: true }));
    try {
      const playlistData = await offline.getPlaylists();
      setPlaylists(playlistData);
      
      // Load previously selected playlists from localStorage
      const savedSelections = localStorage.getItem('navidrome-offline-playlists');
      if (savedSelections) {
        setSelectedPlaylists(new Set(JSON.parse(savedSelections)));
      }
      
    } catch (error) {
      console.error('Failed to load playlists:', error);
      toast({
        title: 'Error',
        description: 'Failed to load playlists. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(prev => ({ ...prev, playlists: false }));
    }
  };

  // Toggle album selection
  const toggleAlbumSelection = (albumId: string) => {
    setSelectedAlbums(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(albumId)) {
        newSelection.delete(albumId);
      } else {
        newSelection.add(albumId);
      }
      
      // Save to localStorage
      localStorage.setItem('navidrome-offline-albums', JSON.stringify([...newSelection]));
      
      return newSelection;
    });
  };

  // Toggle playlist selection
  const togglePlaylistSelection = (playlistId: string) => {
    setSelectedPlaylists(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(playlistId)) {
        newSelection.delete(playlistId);
      } else {
        newSelection.add(playlistId);
      }
      
      // Save to localStorage
      localStorage.setItem('navidrome-offline-playlists', JSON.stringify([...newSelection]));
      
      return newSelection;
    });
  };

  // Download selected items
  const downloadSelected = async () => {
    // Mock implementation - in a real implementation, you'd integrate with the download system
    const selectedIds = [...selectedAlbums, ...selectedPlaylists];
    if (selectedIds.length === 0) {
      toast({
        title: 'No items selected',
        description: 'Please select albums or playlists to download.',
      });
      return;
    }
    
    toast({
      title: 'Download Started',
      description: `Downloading ${selectedIds.length} items for offline use.`,
    });
    
    // Mock download progress
    const downloadMap = new Map<string, number>();
    selectedIds.forEach(id => downloadMap.set(id, 0));
    setDownloadingItems(downloadMap);
    
    // Simulate download progress
    const interval = setInterval(() => {
      setDownloadingItems(prev => {
        const updated = new Map(prev);
        let allComplete = true;
        
        for (const [id, progress] of prev.entries()) {
          if (progress < 100) {
            updated.set(id, Math.min(progress + Math.random() * 10, 100));
            allComplete = false;
          }
        }
        
        if (allComplete) {
          clearInterval(interval);
          toast({
            title: 'Download Complete',
            description: `${selectedIds.length} items are now available offline.`,
          });
          
          setTimeout(() => {
            setDownloadingItems(new Map());
          }, 1000);
        }
        
        return updated;
      });
    }, 500);
  };

  // Filter and sort albums
  const filteredAlbums = albums
    .filter(album => {
      if (!searchQuery) return true;
      return album.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             album.artist.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created || '').getTime() - new Date(a.created || '').getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'artist':
          return a.artist.localeCompare(b.artist);
        default:
          return 0;
      }
    });

  // Filter and sort playlists
  const filteredPlaylists = playlists
    .filter(playlist => {
      if (!searchQuery) return true;
      return playlist.name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.changed || '').getTime() - new Date(a.changed || '').getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  // Estimate album size (mock implementation)
  const estimateSize = (songCount: number) => {
    const averageSongSizeMB = 8;
    const totalSizeMB = songCount * averageSongSizeMB;
    if (totalSizeMB > 1000) {
      return `${(totalSizeMB / 1000).toFixed(1)} GB`;
    }
    return `${totalSizeMB.toFixed(0)} MB`;
  };

  return (
    <Tabs 
      value={activeTab} 
      onValueChange={setActiveTab}
      className="space-y-4"
    >
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="albums">Albums</TabsTrigger>
        <TabsTrigger value="playlists">Playlists</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview">
        <OfflineManagement />
      </TabsContent>
      
      <TabsContent value="albums" className="space-y-4">
        <Card className="mb-6 break-inside-avoid py-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Disc className="h-5 w-5" />
              Select Albums
            </CardTitle>
            <CardDescription>
              Choose albums to make available offline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search albums..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltersVisible(!filtersVisible)}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            
            {filtersVisible && (
              <div className="p-3 border rounded-md bg-muted/30">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Sort By</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={sortBy === 'recent' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSortBy('recent')}
                    >
                      Recent
                    </Button>
                    <Button
                      variant={sortBy === 'name' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSortBy('name')}
                    >
                      Name
                    </Button>
                    <Button
                      variant={sortBy === 'artist' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSortBy('artist')}
                    >
                      Artist
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedAlbums.size} album{selectedAlbums.size !== 1 ? 's' : ''} selected
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAlbums(new Set())}
                disabled={selectedAlbums.size === 0}
              >
                Clear Selection
              </Button>
            </div>
            
            <ScrollArea className="h-[calc(100vh-350px)] pr-4 -mr-4">
              {loading.albums ? (
                // Loading skeletons
                Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} className="mb-3">
                    <div className="flex p-3">
                      <Skeleton className="h-[60px] w-[60px] rounded-md" />
                      <div className="ml-3 flex-1">
                        <Skeleton className="h-5 w-2/3 mb-1" />
                        <Skeleton className="h-4 w-1/2 mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  </Card>
                ))
              ) : filteredAlbums.length > 0 ? (
                filteredAlbums.map(album => (
                  <AlbumSelectionCard
                    key={album.id}
                    album={album}
                    isSelected={selectedAlbums.has(album.id)}
                    onToggleSelection={() => toggleAlbumSelection(album.id)}
                    isDownloading={downloadingItems.has(album.id)}
                    downloadProgress={downloadingItems.get(album.id)}
                    estimatedSize={estimateSize(album.songCount)}
                  />
                ))
              ) : (
                <div className="text-center py-8">
                  <Disc className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No albums found matching your search' : 'No albums available'}
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={downloadSelected}
              disabled={selectedAlbums.size === 0 || downloadingItems.size > 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Download {selectedAlbums.size} Selected Album{selectedAlbums.size !== 1 ? 's' : ''}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
      
      <TabsContent value="playlists" className="space-y-4">
        <Card className="mb-6 break-inside-avoid py-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Select Playlists
            </CardTitle>
            <CardDescription>
              Choose playlists to make available offline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search playlists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltersVisible(!filtersVisible)}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            
            {filtersVisible && (
              <div className="p-3 border rounded-md bg-muted/30">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Sort By</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={sortBy === 'recent' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSortBy('recent')}
                    >
                      Recent
                    </Button>
                    <Button
                      variant={sortBy === 'name' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSortBy('name')}
                    >
                      Name
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedPlaylists.size} playlist{selectedPlaylists.size !== 1 ? 's' : ''} selected
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPlaylists(new Set())}
                disabled={selectedPlaylists.size === 0}
              >
                Clear Selection
              </Button>
            </div>
            
            <ScrollArea className="h-[calc(100vh-350px)] pr-4 -mr-4">
              {loading.playlists ? (
                // Loading skeletons
                Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} className="mb-3">
                    <div className="flex p-3">
                      <Skeleton className="h-[60px] w-[60px] rounded-md" />
                      <div className="ml-3 flex-1">
                        <Skeleton className="h-5 w-2/3 mb-1" />
                        <Skeleton className="h-4 w-1/2 mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  </Card>
                ))
              ) : filteredPlaylists.length > 0 ? (
                filteredPlaylists.map(playlist => (
                  <PlaylistSelectionCard
                    key={playlist.id}
                    playlist={playlist}
                    isSelected={selectedPlaylists.has(playlist.id)}
                    onToggleSelection={() => togglePlaylistSelection(playlist.id)}
                    isDownloading={downloadingItems.has(playlist.id)}
                    downloadProgress={downloadingItems.get(playlist.id)}
                    estimatedSize={estimateSize(playlist.songCount)}
                  />
                ))
              ) : (
                <div className="text-center py-8">
                  <List className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No playlists found matching your search' : 'No playlists available'}
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={downloadSelected}
              disabled={selectedPlaylists.size === 0 || downloadingItems.size > 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Download {selectedPlaylists.size} Selected Playlist{selectedPlaylists.size !== 1 ? 's' : ''}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
