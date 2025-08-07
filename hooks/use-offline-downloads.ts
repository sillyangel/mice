'use client';

import { useState, useEffect, useCallback } from 'react';
import { Album, Song } from '@/lib/navidrome';

export interface DownloadProgress {
  completed: number;
  total: number;
  failed: number;
  status: 'idle' | 'starting' | 'downloading' | 'complete' | 'error';
  currentSong?: string;
  error?: string;
}

export interface OfflineItem {
  id: string;
  type: 'album' | 'song';
  name: string;
  artist: string;
  downloadedAt: number;
  size?: number;
}

export interface OfflineStats {
  totalSize: number;
  audioSize: number;
  imageSize: number;
  metaSize: number;
  downloadedAlbums: number;
  downloadedSongs: number;
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
      
      // Add stream URLs to songs
      const songsWithUrls = songs.map(song => ({
        ...song,
        streamUrl: this.getStreamUrl(song.id)
      }));
      
      this.worker!.postMessage({
        type: 'DOWNLOAD_ALBUM',
        data: { album, songs: songsWithUrls }
      }, [channel.port2]);
    });
  }
  
  async downloadSong(song: Song): Promise<void> {
    const songWithUrl = {
      ...song,
      streamUrl: this.getStreamUrl(song.id)
    };
    
    return this.sendMessage('DOWNLOAD_SONG', songWithUrl);
  }

  async downloadQueue(songs: Song[]): Promise<void> {
    const songsWithUrls = songs.map(song => ({
      ...song,
      streamUrl: this.getStreamUrl(song.id)
    }));
    
    return this.sendMessage('DOWNLOAD_QUEUE', { songs: songsWithUrls });
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
  
  private getStreamUrl(songId: string): string {
    // This should match your actual Navidrome stream URL format
    const config = JSON.parse(localStorage.getItem('navidrome-config') || '{}');
    if (!config.serverUrl) {
      throw new Error('Navidrome server not configured');
    }
    
    return `${config.serverUrl}/rest/stream?id=${songId}&u=${config.username}&p=${config.password}&c=mice&f=json`;
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
    downloadedSongs: 0
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
  
  const getOfflineItems = useCallback((): OfflineItem[] => {
    const albums = downloadManager.getOfflineAlbums();
    const songs = downloadManager.getOfflineSongs();
    return [...albums, ...songs].sort((a, b) => b.downloadedAt - a.downloadedAt);
  }, []);
  
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
