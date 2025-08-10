'use client';

import { useState, useEffect, useCallback } from 'react';
import { Album, Song, getNavidromeAPI } from '@/lib/navidrome';

export interface DownloadProgress {
  completed: number;
  total: number;
  failed: number;
  status: 'idle' | 'starting' | 'downloading' | 'complete' | 'error' | 'paused';
  currentSong?: string;
  currentArtist?: string;
  currentAlbum?: string;
  error?: string;
  downloadSpeed?: number; // In bytes per second
  timeRemaining?: number; // In seconds
  percentComplete?: number; // 0-100
}

export interface OfflineItem {
  id: string;
  type: 'album' | 'song';
  name: string;
  artist: string;
  downloadedAt: number;
  size?: number;
  bitRate?: number;
  duration?: number;
  format?: string;
  lastPlayed?: number;
}

export interface OfflineStats {
  totalSize: number;
  audioSize: number;
  imageSize: number;
  metaSize: number;
  downloadedAlbums: number;
  downloadedSongs: number;
  lastDownload: number | null;
  downloadErrors: number;
  remainingStorage: number | null;
  autoDownloadEnabled: boolean;
  downloadQuality: 'original' | 'high' | 'medium' | 'low';
  downloadOnWifiOnly: boolean;
  priorityContent: string[]; // IDs of albums or playlists that should always be available offline
}

class DownloadManager {
  private worker: ServiceWorker | null = null;
  private messageChannel: MessageChannel | null = null;
  
  async initialize(): Promise<boolean> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
        
        // Wait for the service worker to be ready
        const readyRegistration = await navigator.serviceWorker.ready;
        this.worker = readyRegistration.active;
        
        return true;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        return false;
      }
    }
    return false;
  }
  
  private async sendMessage(type: string, data: any): Promise<any> {
    if (!this.worker) {
      throw new Error('Service Worker not available');
    }
    
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        const { type: responseType, data: responseData } = event.data;
        if (responseType.includes('ERROR')) {
          reject(new Error(responseData.error));
        } else {
          resolve(responseData);
        }
      };
      
      this.worker!.postMessage({ type, data }, [channel.port2]);
    });
  }
  
  async downloadAlbum(
    album: Album, 
    songs: Song[], 
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    if (!this.worker) {
      throw new Error('Service Worker not available');
    }
    
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'DOWNLOAD_PROGRESS':
            if (onProgress) {
              onProgress(data);
            }
            break;
          case 'DOWNLOAD_COMPLETE':
            resolve();
            break;
          case 'DOWNLOAD_ERROR':
            reject(new Error(data.error));
            break;
        }
      };
      
      // Add direct download URLs to songs (use 'streamUrl' field name to keep SW compatibility)
      const songsWithUrls = songs.map(song => ({
        ...song,
        streamUrl: this.getDownloadUrl(song.id),
        offlineUrl: `offline-song-${song.id}`,
        duration: song.duration,
  bitRate: song.bitRate,
  size: song.size
      }));
      
      this.worker!.postMessage({
        type: 'DOWNLOAD_ALBUM',
        data: { album, songs: songsWithUrls }
      }, [channel.port2]);
    });
  }
  
  async downloadSong(
    song: Song, 
    options?: { quality?: 'original' | 'high' | 'medium' | 'low', priority?: boolean }
  ): Promise<void> {
    const songWithUrl = {
      ...song,
      streamUrl: this.getDownloadUrl(song.id, options?.quality),
      offlineUrl: `offline-song-${song.id}`,
      duration: song.duration,
      bitRate: song.bitRate,
      size: song.size,
      priority: options?.priority || false,
      quality: options?.quality || 'original'
    };
    
    return this.sendMessage('DOWNLOAD_SONG', songWithUrl);
  }

  async downloadQueue(
    songs: Song[], 
    options?: { 
      quality?: 'original' | 'high' | 'medium' | 'low', 
      priority?: boolean,
      onProgressUpdate?: (progress: DownloadProgress) => void
    }
  ): Promise<void> {
    if (!this.worker) {
      throw new Error('Service Worker not available');
    }
    
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'DOWNLOAD_PROGRESS':
            if (options?.onProgressUpdate) {
              options.onProgressUpdate(data);
            }
            break;
          case 'DOWNLOAD_COMPLETE':
            resolve();
            break;
          case 'DOWNLOAD_ERROR':
            reject(new Error(data.error));
            break;
        }
      };

      const songsWithUrls = songs.map(song => ({
        ...song,
        streamUrl: this.getDownloadUrl(song.id, options?.quality),
        offlineUrl: `offline-song-${song.id}`,
        duration: song.duration,
        bitRate: song.bitRate,
        size: song.size,
        priority: options?.priority || false,
        quality: options?.quality || 'original'
      }));
      
      this.worker!.postMessage({
        type: 'DOWNLOAD_QUEUE',
        data: { songs: songsWithUrls }
      }, [channel.port2]);
    });
  }
  
  async pauseDownloads(): Promise<void> {
    return this.sendMessage('PAUSE_DOWNLOADS', {});
  }
  
  async resumeDownloads(): Promise<void> {
    return this.sendMessage('RESUME_DOWNLOADS', {});
  }
  
  async cancelDownloads(): Promise<void> {
    return this.sendMessage('CANCEL_DOWNLOADS', {});
  }
  
  async setDownloadPreferences(preferences: {
    quality: 'original' | 'high' | 'medium' | 'low',
    wifiOnly: boolean,
    autoDownloadRecent: boolean,
    autoDownloadFavorites: boolean,
    maxStoragePercent: number,
    priorityContent?: string[] // IDs of albums or playlists
  }): Promise<void> {
    return this.sendMessage('SET_DOWNLOAD_PREFERENCES', preferences);
  }
  
  async getDownloadPreferences(): Promise<{
    quality: 'original' | 'high' | 'medium' | 'low',
    wifiOnly: boolean,
    autoDownloadRecent: boolean,
    autoDownloadFavorites: boolean,
    maxStoragePercent: number,
    priorityContent: string[]
  }> {
    return this.sendMessage('GET_DOWNLOAD_PREFERENCES', {});
  }

  async enableOfflineMode(settings: {
    autoDownloadQueue?: boolean;
    forceOffline?: boolean;
    currentQueue?: Song[];
  }): Promise<void> {
    return this.sendMessage('ENABLE_OFFLINE_MODE', settings);
  }
  
  async checkOfflineStatus(id: string, type: 'album' | 'song'): Promise<boolean> {
    try {
      const result = await this.sendMessage('CHECK_OFFLINE_STATUS', { id, type });
      return result.isAvailable;
    } catch (error) {
      console.error('Failed to check offline status:', error);
      return false;
    }
  }
  
  async deleteOfflineContent(id: string, type: 'album' | 'song'): Promise<void> {
    return this.sendMessage('DELETE_OFFLINE_CONTENT', { id, type });
  }
  
  async getOfflineStats(): Promise<OfflineStats> {
    return this.sendMessage('GET_OFFLINE_STATS', {});
  }

  async getOfflineItems(): Promise<{ albums: OfflineItem[]; songs: OfflineItem[] }> {
    return this.sendMessage('GET_OFFLINE_ITEMS', {});
  }
  
  private getDownloadUrl(songId: string, quality?: 'original' | 'high' | 'medium' | 'low'): string {
    const api = getNavidromeAPI();
    if (!api) throw new Error('Navidrome server not configured');
    
    // Use direct download to fetch original file by default
    if (quality === 'original' || !quality) {
      if (typeof (api as any).getDownloadUrl === 'function') {
        return (api as any).getDownloadUrl(songId);
      }
    }
    
    // For other quality settings, use the stream URL with appropriate parameters
    const maxBitRate = quality === 'high' ? 320 : 
                      quality === 'medium' ? 192 : 
                      quality === 'low' ? 128 : undefined;
    
    const format = quality === 'low' ? 'mp3' : undefined; // Use mp3 for low quality, original otherwise
    
    return api.getStreamUrl(songId, { maxBitRate, format });
  }
  
  // LocalStorage fallback for browsers without service worker support
  async downloadAlbumFallback(album: Album, songs: Song[]): Promise<void> {
    const offlineData = this.getOfflineData();
    
    // Store album metadata
    offlineData.albums[album.id] = {
      id: album.id,
      name: album.name,
      artist: album.artist,
      downloadedAt: Date.now(),
      songCount: songs.length,
      songs: songs.map(song => song.id)
    };
    
    // Mark songs as downloaded (metadata only in localStorage fallback)
    songs.forEach(song => {
      offlineData.songs[song.id] = {
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        albumId: song.albumId,
        downloadedAt: Date.now()
      };
    });
    
    this.saveOfflineData(offlineData);
  }
  
  public getOfflineData() {
    const stored = localStorage.getItem('offline-downloads');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Failed to parse offline data:', error);
      }
    }
    
    return {
      albums: {},
      songs: {},
      lastUpdated: Date.now()
    };
  }
  
  public saveOfflineData(data: any) {
    data.lastUpdated = Date.now();
    localStorage.setItem('offline-downloads', JSON.stringify(data));
  }
  
  async checkOfflineStatusFallback(id: string, type: 'album' | 'song'): Promise<boolean> {
    const offlineData = this.getOfflineData();
    
    if (type === 'album') {
      return !!offlineData.albums[id];
    } else {
      return !!offlineData.songs[id];
    }
  }
  
  async deleteOfflineContentFallback(id: string, type: 'album' | 'song'): Promise<void> {
    const offlineData = this.getOfflineData();
    
    if (type === 'album') {
      const album = offlineData.albums[id];
      if (album && album.songs) {
        // Remove associated songs
        album.songs.forEach((songId: string) => {
          delete offlineData.songs[songId];
        });
      }
      delete offlineData.albums[id];
    } else {
      delete offlineData.songs[id];
    }
    
    this.saveOfflineData(offlineData);
  }
  
  getOfflineAlbums(): OfflineItem[] {
    const offlineData = this.getOfflineData();
    return Object.values(offlineData.albums).map((album: any) => ({
      id: album.id,
      type: 'album' as const,
      name: album.name,
      artist: album.artist,
      downloadedAt: album.downloadedAt
    }));
  }
  
  getOfflineSongs(): OfflineItem[] {
    const offlineData = this.getOfflineData();
    return Object.values(offlineData.songs).map((song: any) => ({
      id: song.id,
      type: 'song' as const,
      name: song.title,
      artist: song.artist,
      downloadedAt: song.downloadedAt
    }));
  }
}

const downloadManager = new DownloadManager();

export function useOfflineDownloads() {
  const [isSupported, setIsSupported] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    completed: 0,
    total: 0,
    failed: 0,
    status: 'idle'
  });
  
  const [offlineStats, setOfflineStats] = useState<OfflineStats>({
    totalSize: 0,
    audioSize: 0,
    imageSize: 0,
    metaSize: 0,
    downloadedAlbums: 0,
    downloadedSongs: 0,
    lastDownload: null,
    downloadErrors: 0,
    remainingStorage: null,
    autoDownloadEnabled: false,
    downloadQuality: 'original',
    downloadOnWifiOnly: true,
    priorityContent: []
  });
  
  useEffect(() => {
    const initializeDownloadManager = async () => {
      const supported = await downloadManager.initialize();
      setIsSupported(supported);
      setIsInitialized(true);
      
      if (supported) {
        // Load initial stats
        try {
          const stats = await downloadManager.getOfflineStats();
          setOfflineStats(stats);
        } catch (error) {
          console.error('Failed to load offline stats:', error);
        }
      }
    };
    
    initializeDownloadManager();
  }, []);
  
  const downloadAlbum = useCallback(async (album: Album, songs: Song[]) => {
    try {
      if (isSupported) {
        await downloadManager.downloadAlbum(album, songs, setDownloadProgress);
      } else {
        // Fallback to localStorage metadata only
        await downloadManager.downloadAlbumFallback(album, songs);
      }
      
      // Refresh stats
      if (isSupported) {
        const stats = await downloadManager.getOfflineStats();
        setOfflineStats(stats);
      }
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadProgress(prev => ({ ...prev, status: 'error', error: (error as Error).message }));
      throw error;
    }
  }, [isSupported]);
  
  const downloadSong = useCallback(async (song: Song) => {
    if (isSupported) {
      await downloadManager.downloadSong(song);
    } else {
      // Fallback - just save metadata
      const offlineData = downloadManager.getOfflineData();
      offlineData.songs[song.id] = {
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        downloadedAt: Date.now()
      };
      downloadManager.saveOfflineData(offlineData);
    }
  }, [isSupported]);
  
  const checkOfflineStatus = useCallback(async (id: string, type: 'album' | 'song'): Promise<boolean> => {
    if (isSupported) {
      return downloadManager.checkOfflineStatus(id, type);
    } else {
      return downloadManager.checkOfflineStatusFallback(id, type);
    }
  }, [isSupported]);
  
  const deleteOfflineContent = useCallback(async (id: string, type: 'album' | 'song') => {
    if (isSupported) {
      await downloadManager.deleteOfflineContent(id, type);
    } else {
      await downloadManager.deleteOfflineContentFallback(id, type);
    }
    
    // Refresh stats
    if (isSupported) {
      const stats = await downloadManager.getOfflineStats();
      setOfflineStats(stats);
    }
  }, [isSupported]);
  
  const getOfflineItems = useCallback(async (): Promise<OfflineItem[]> => {
    if (isSupported) {
      try {
        const { albums, songs } = await downloadManager.getOfflineItems();
        return [...albums, ...songs].sort((a, b) => b.downloadedAt - a.downloadedAt);
      } catch (e) {
        console.error('Failed to get offline items from SW, falling back:', e);
      }
    }
    const albums = downloadManager.getOfflineAlbums();
    const songs = downloadManager.getOfflineSongs();
    return [...albums, ...songs].sort((a, b) => b.downloadedAt - a.downloadedAt);
  }, [isSupported]);
  
  const clearDownloadProgress = useCallback(() => {
    setDownloadProgress({
      completed: 0,
      total: 0,
      failed: 0,
      status: 'idle'
    });
  }, []);

  const downloadQueue = useCallback(async (songs: Song[]) => {
    if (isSupported) {
      setDownloadProgress({ completed: 0, total: songs.length, failed: 0, status: 'downloading' });
      
      try {
        await downloadManager.downloadQueue(songs);
        // Stats will be updated via progress events
      } catch (error) {
        console.error('Queue download failed:', error);
        setDownloadProgress(prev => ({ ...prev, status: 'error' }));
      }
    } else {
      // Fallback: just store metadata
      const offlineData = downloadManager.getOfflineData();
      songs.forEach(song => {
        offlineData.songs[song.id] = {
          id: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          albumId: song.albumId,
          downloadedAt: Date.now()
        };
      });
      downloadManager.saveOfflineData(offlineData);
    }
  }, [isSupported]);

  const enableOfflineMode = useCallback(async (settings: {
    autoDownloadQueue?: boolean;
    forceOffline?: boolean;
    currentQueue?: Song[];
  }) => {
    if (isSupported) {
      try {
        await downloadManager.enableOfflineMode(settings);
      } catch (error) {
        console.error('Failed to enable offline mode:', error);
      }
    }
  }, [isSupported]);
  
  return {
    isSupported,
    isInitialized,
    downloadProgress,
    offlineStats,
    downloadAlbum,
    downloadSong,
    downloadQueue,
    enableOfflineMode,
    checkOfflineStatus,
    deleteOfflineContent,
    getOfflineItems,
    clearDownloadProgress
  };
}

// Export the manager instance for direct use if needed
export { downloadManager };
