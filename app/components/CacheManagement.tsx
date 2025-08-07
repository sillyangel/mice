'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Database,
  Trash2,
  RefreshCw,
  HardDrive,
  Download,
  Wifi,
  WifiOff,
  X,
  Music,
  Globe,
  Settings
} from 'lucide-react';
import { CacheManager } from '@/lib/cache';
import { useOfflineDownloads, OfflineItem } from '@/hooks/use-offline-downloads';
import { useAudioPlayer, Track } from '@/app/components/AudioPlayerContext';

export function CacheManagement() {
  const [cacheStats, setCacheStats] = useState({
    total: 0,
    expired: 0,
    size: '0 B'
  });
  const [isClearing, setIsClearing] = useState(false);
  const [lastCleared, setLastCleared] = useState<string | null>(null);
  const [offlineItems, setOfflineItems] = useState<OfflineItem[]>([]);
  const [offlineMode, setOfflineMode] = useState(false);
  const [autoDownloadQueue, setAutoDownloadQueue] = useState(false);
  const [isDownloadingQueue, setIsDownloadingQueue] = useState(false);
  
  const {
    isSupported: isOfflineSupported,
    isInitialized: isOfflineInitialized,
    downloadProgress,
    offlineStats,
    downloadQueue,
    enableOfflineMode,
    deleteOfflineContent,
    getOfflineItems,
    clearDownloadProgress
  } = useOfflineDownloads();

  const { queue } = useAudioPlayer();

  const loadCacheStats = () => {
    if (typeof window === 'undefined') return;
    
    let total = 0;
    let expired = 0;
    let totalSize = 0;
    const now = Date.now();

    // Check localStorage for cache entries
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('cache-') || key.startsWith('navidrome-cache-') || key.startsWith('library-cache-'))) {
        total++;
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
          try {
            const parsed = JSON.parse(value);
            if (parsed.expiresAt && now > parsed.expiresAt) {
              expired++;
            }
          } catch (error) {
            expired++;
          }
        }
      }
    }

    // Convert bytes to human readable format
    const formatSize = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    setCacheStats({
      total,
      expired,
      size: formatSize(totalSize * 2) // *2 for UTF-16 encoding
    });
  };

  const loadOfflineItems = useCallback(() => {
    if (isOfflineInitialized) {
      const items = getOfflineItems();
      setOfflineItems(items);
    }
  }, [isOfflineInitialized, getOfflineItems]);

  useEffect(() => {
    loadCacheStats();
    loadOfflineItems();
    
    // Load offline mode settings
    const storedOfflineMode = localStorage.getItem('offline-mode-enabled');
    const storedAutoDownload = localStorage.getItem('auto-download-queue');
    
    if (storedOfflineMode) {
      setOfflineMode(JSON.parse(storedOfflineMode));
    }
    if (storedAutoDownload) {
      setAutoDownloadQueue(JSON.parse(storedAutoDownload));
    }
    
    // Check if there's a last cleared timestamp
    const lastClearedTime = localStorage.getItem('cache-last-cleared');
    if (lastClearedTime) {
      setLastCleared(new Date(parseInt(lastClearedTime)).toLocaleString());
    }
  }, [loadOfflineItems]);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      // Clear all cache using the CacheManager
      CacheManager.clearAll();
      
      // Also clear any other cache-related localStorage items
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('cache-') || 
              key.startsWith('navidrome-cache-') || 
              key.startsWith('library-cache-') ||
              key.includes('album') ||
              key.includes('artist') ||
              key.includes('song')) {
            localStorage.removeItem(key);
          }
        });
        
        // Set last cleared timestamp
        localStorage.setItem('cache-last-cleared', Date.now().toString());
      }
      
      // Update stats
      loadCacheStats();
      setLastCleared(new Date().toLocaleString());
      
      // Show success feedback
      setTimeout(() => {
        setIsClearing(false);
      }, 1000);
      
    } catch (error) {
      console.error('Failed to clear cache:', error);
      setIsClearing(false);
    }
  };

  const handleCleanExpired = () => {
    if (typeof window === 'undefined') return;
    
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('cache-') || key.startsWith('navidrome-cache-') || key.startsWith('library-cache-'))) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            if (parsed.expiresAt && now > parsed.expiresAt) {
              keysToRemove.push(key);
            }
          }
        } catch (error) {
          // Invalid cache item, remove it
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    loadCacheStats();
  };

  const handleDeleteOfflineItem = async (item: OfflineItem) => {
    try {
      await deleteOfflineContent(item.id, item.type);
      loadOfflineItems();
      loadCacheStats();
    } catch (error) {
      console.error('Failed to delete offline item:', error);
    }
  };

  // Convert Track to Song format for offline downloads
  const convertTrackToSong = (track: Track) => ({
    id: track.id,
    parent: track.albumId || '',
    isDir: false,
    title: track.name,
    album: track.album,
    artist: track.artist,
    size: 0, // Will be filled when downloaded
    contentType: 'audio/mpeg',
    suffix: 'mp3',
    duration: track.duration,
    path: '',
    created: new Date().toISOString(),
    albumId: track.albumId,
    artistId: track.artistId,
    type: 'music'
  });

  const handleOfflineModeToggle = async (enabled: boolean) => {
    setOfflineMode(enabled);
    localStorage.setItem('offline-mode-enabled', JSON.stringify(enabled));
    
    if (enabled && isOfflineSupported) {
      try {
        const convertedQueue = queue.map(convertTrackToSong);
        await enableOfflineMode({
          forceOffline: enabled,
          autoDownloadQueue,
          currentQueue: convertedQueue
        });
      } catch (error) {
        console.error('Failed to enable offline mode:', error);
      }
    }
  };

  const handleAutoDownloadToggle = async (enabled: boolean) => {
    setAutoDownloadQueue(enabled);
    localStorage.setItem('auto-download-queue', JSON.stringify(enabled));
    
    if (enabled && isOfflineSupported) {
      const convertedQueue = queue.map(convertTrackToSong);
      await enableOfflineMode({
        forceOffline: offlineMode,
        autoDownloadQueue: enabled,
        currentQueue: convertedQueue
      });
    }
  };

  const handleDownloadCurrentQueue = async () => {
    if (!queue.length || !isOfflineSupported) return;
    
    setIsDownloadingQueue(true);
    try {
      const convertedQueue = queue.map(convertTrackToSong);
      await downloadQueue(convertedQueue);
      loadOfflineItems();
    } catch (error) {
      console.error('Failed to download queue:', error);
    } finally {
      setIsDownloadingQueue(false);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="break-inside-avoid py-5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Cache & Offline Downloads
        </CardTitle>
        <CardDescription>
          Manage application cache and offline content for better performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Regular Cache Statistics */}
        <div>
          <h4 className="text-sm font-medium mb-3">Application Cache</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-2xl font-bold">{cacheStats.total}</p>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{cacheStats.expired}</p>
              <p className="text-xs text-muted-foreground">Expired</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{cacheStats.size}</p>
              <p className="text-xs text-muted-foreground">Storage Used</p>
            </div>
          </div>

          {/* Cache Actions */}
          <div className="space-y-2 mt-4">
            <div className="flex gap-2">
              <Button
                onClick={handleClearCache}
                disabled={isClearing}
                variant="destructive"
                size="sm"
                className="flex-1"
              >
                {isClearing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {isClearing ? 'Clearing...' : 'Clear All Cache'}
              </Button>
              
              <Button
                onClick={handleCleanExpired}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <HardDrive className="h-4 w-4 mr-2" />
                Clean Expired
              </Button>
            </div>
            
            <Button
              onClick={loadCacheStats}
              variant="ghost"
              size="sm"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Stats
            </Button>
          </div>
        </div>

        <Separator />

        {/* Offline Downloads Section */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            {isOfflineSupported ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            Offline Downloads
            {!isOfflineSupported && (
              <span className="text-xs text-muted-foreground">(Limited Support)</span>
            )}
          </h4>

          {isOfflineSupported && (
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div className="space-y-1">
                <p className="text-lg font-bold">{offlineStats.downloadedAlbums}</p>
                <p className="text-xs text-muted-foreground">Albums</p>
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold">{offlineStats.downloadedSongs}</p>
                <p className="text-xs text-muted-foreground">Songs</p>
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold">{formatSize(offlineStats.totalSize)}</p>
                <p className="text-xs text-muted-foreground">Total Size</p>
              </div>
            </div>
          )}

          {/* Offline Mode Controls */}
          {isOfflineSupported && (
            <div className="space-y-4 mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="offline-mode" className="text-sm font-medium">
                    Offline Mode
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Force app to use only cached content (good for slow connections)
                  </p>
                </div>
                <Switch
                  id="offline-mode"
                  checked={offlineMode}
                  onCheckedChange={handleOfflineModeToggle}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-download" className="text-sm font-medium">
                    Auto-download Queue
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically download songs when added to queue
                  </p>
                </div>
                <Switch
                  id="auto-download"
                  checked={autoDownloadQueue}
                  onCheckedChange={handleAutoDownloadToggle}
                />
              </div>

              {/* Queue Download Controls */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Queue</span>
                  <span className="text-xs text-muted-foreground">
                    {queue.length} song{queue.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {queue.length > 0 && (
                  <Button
                    onClick={handleDownloadCurrentQueue}
                    disabled={isDownloadingQueue || downloadProgress.status === 'downloading'}
                    size="sm"
                    className="w-full"
                    variant="outline"
                  >
                    {isDownloadingQueue ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Music className="h-4 w-4 mr-2" />
                    )}
                    {isDownloadingQueue ? 'Downloading...' : 'Download Current Queue'}
                  </Button>
                )}
                
                {queue.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Add songs to queue to enable downloading
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Download Progress */}
          {downloadProgress.status !== 'idle' && (
            <div className="space-y-2 mb-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {downloadProgress.status === 'downloading' && 'Downloading...'}
                  {downloadProgress.status === 'starting' && 'Starting download...'}
                  {downloadProgress.status === 'complete' && 'Download complete!'}
                  {downloadProgress.status === 'error' && 'Download failed'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDownloadProgress}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {downloadProgress.total > 0 && (
                <div className="space-y-1">
                  <Progress 
                    value={(downloadProgress.completed / downloadProgress.total) * 100}
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {downloadProgress.completed} / {downloadProgress.total} songs
                      {downloadProgress.failed > 0 && ` (${downloadProgress.failed} failed)`}
                    </span>
                    <span>{Math.round((downloadProgress.completed / downloadProgress.total) * 100)}%</span>
                  </div>
                </div>
              )}
              
              {downloadProgress.currentSong && (
                <p className="text-xs text-muted-foreground truncate">
                  Current: {downloadProgress.currentSong}
                </p>
              )}
              
              {downloadProgress.error && (
                <p className="text-xs text-red-600">
                  Error: {downloadProgress.error}
                </p>
              )}
            </div>
          )}

          {/* Offline Items List */}
          {offlineItems.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Downloaded Content</Label>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {offlineItems.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Download className="h-3 w-3 text-green-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.artist} • {item.type}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteOfflineItem(item)}
                      className="h-6 w-6 p-0 flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {offlineItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Download className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No offline content downloaded</p>
              <p className="text-xs">Visit an album page to download content for offline listening</p>
            </div>
          )}
        </div>

        {/* Cache Info */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Cache includes albums, artists, songs, and image URLs to improve loading times.</p>
          {isOfflineSupported && (
            <p>Offline downloads use Service Workers for true offline audio playback.</p>
          )}
          {!isOfflineSupported && (
            <p>Limited offline support - only metadata cached without Service Worker support.</p>
          )}
          {lastCleared && (
            <p>Last cleared: {lastCleared}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
