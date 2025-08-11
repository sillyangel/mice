'use client';

import { useState, useEffect, useCallback } from 'react';
import { offlineLibraryManager, type OfflineLibraryStats, type SyncOperation } from '@/lib/offline-library';
import { Album, Artist, Song, Playlist } from '@/lib/navidrome';
import { useNavidrome } from '@/app/components/NavidromeContext';

export interface OfflineLibraryState {
  isInitialized: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  stats: OfflineLibraryStats;
  syncProgress: {
    current: number;
    total: number;
    stage: string;
  } | null;
}

export function useOfflineLibrary() {
  // Check if we're on the client side
  const isClient = typeof window !== 'undefined';
  
  const [state, setState] = useState<OfflineLibraryState>({
    isInitialized: false,
    isOnline: isClient ? navigator.onLine : true, // Default to true during SSR
    isSyncing: false,
    lastSync: null,
    stats: {
      albums: 0,
      artists: 0,
      songs: 0,
      playlists: 0,
      lastSync: null,
      pendingOperations: 0,
      storageSize: 0
    },
    syncProgress: null
  });

  const { api } = useNavidrome();

  // Initialize offline library
  useEffect(() => {
    const initializeOfflineLibrary = async () => {
      try {
        const initialized = await offlineLibraryManager.initialize();
        if (initialized) {
          const stats = await offlineLibraryManager.getLibraryStats();
          setState(prev => ({
            ...prev,
            isInitialized: true,
            stats,
            lastSync: stats.lastSync
          }));
        }
      } catch (error) {
        console.error('Failed to initialize offline library:', error);
      }
    };

    initializeOfflineLibrary();
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      // Automatically sync when back online
      if (state.isInitialized && api) {
        syncPendingOperations();
      }
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [state.isInitialized, api]);

  // Full library sync from server
  const syncLibraryFromServer = useCallback(async (): Promise<void> => {
    if (!api || !state.isInitialized || state.isSyncing) return;

    try {
      setState(prev => ({ 
        ...prev, 
        isSyncing: true,
        syncProgress: { current: 0, total: 100, stage: 'Starting sync...' }
      }));

      setState(prev => ({
        ...prev,
        syncProgress: { current: 20, total: 100, stage: 'Syncing albums...' }
      }));

      await offlineLibraryManager.syncFromServer(api);

      setState(prev => ({
        ...prev,
        syncProgress: { current: 80, total: 100, stage: 'Syncing pending operations...' }
      }));

      await offlineLibraryManager.syncPendingOperations(api);

      const stats = await offlineLibraryManager.getLibraryStats();
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncProgress: null,
        stats,
        lastSync: stats.lastSync
      }));

    } catch (error) {
      console.error('Library sync failed:', error);
      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncProgress: null
      }));
      throw error;
    }
  }, [api, state.isInitialized, state.isSyncing]);

  // Sync only pending operations
  const syncPendingOperations = useCallback(async (): Promise<void> => {
    if (!api || !state.isInitialized) return;

    try {
      await offlineLibraryManager.syncPendingOperations(api);
      const stats = await offlineLibraryManager.getLibraryStats();
      setState(prev => ({ ...prev, stats }));
    } catch (error) {
      console.error('Failed to sync pending operations:', error);
    }
  }, [api, state.isInitialized]);

  // Data retrieval methods (offline-first)
  const getAlbums = useCallback(async (starred?: boolean): Promise<Album[]> => {
    if (!state.isInitialized) return [];
    
    try {
      // Try offline first
      const offlineAlbums = await offlineLibraryManager.getAlbums(starred);
      
      // If offline data exists, return it
      if (offlineAlbums.length > 0) {
        return offlineAlbums;
      }
      
      // If no offline data and we're online, try server
      if (state.isOnline && api) {
        const serverAlbums = starred 
          ? await api.getAlbums('starred')
          : await api.getAlbums('alphabeticalByName', 100);
        
        // Cache the results
        await offlineLibraryManager.storeAlbums(serverAlbums);
        return serverAlbums;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get albums:', error);
      return [];
    }
  }, [state.isInitialized, state.isOnline, api]);

  const getArtists = useCallback(async (starred?: boolean): Promise<Artist[]> => {
    if (!state.isInitialized) return [];
    
    try {
      const offlineArtists = await offlineLibraryManager.getArtists(starred);
      
      if (offlineArtists.length > 0) {
        return offlineArtists;
      }
      
      if (state.isOnline && api) {
        const serverArtists = await api.getArtists();
        await offlineLibraryManager.storeArtists(serverArtists);
        return serverArtists;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get artists:', error);
      return [];
    }
  }, [state.isInitialized, state.isOnline, api]);

  const getAlbum = useCallback(async (albumId: string): Promise<{ album: Album; songs: Song[] } | null> => {
    if (!state.isInitialized) return null;
    
    try {
      // Try offline first
      const offlineData = await offlineLibraryManager.getAlbum(albumId);
      
      if (offlineData && offlineData.songs.length > 0) {
        return offlineData;
      }
      
      // If no offline data and we're online, try server
      if (state.isOnline && api) {
        const serverData = await api.getAlbum(albumId);
        
        // Cache the results
        await offlineLibraryManager.storeAlbums([serverData.album]);
        await offlineLibraryManager.storeSongs(serverData.songs);
        
        return serverData;
      }
      
      return offlineData;
    } catch (error) {
      console.error('Failed to get album:', error);
      return null;
    }
  }, [state.isInitialized, state.isOnline, api]);

  const getPlaylists = useCallback(async (): Promise<Playlist[]> => {
    if (!state.isInitialized) return [];
    
    try {
      const offlinePlaylists = await offlineLibraryManager.getPlaylists();
      
      if (offlinePlaylists.length > 0) {
        return offlinePlaylists;
      }
      
      if (state.isOnline && api) {
        const serverPlaylists = await api.getPlaylists();
        await offlineLibraryManager.storePlaylists(serverPlaylists);
        return serverPlaylists;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get playlists:', error);
      return [];
    }
  }, [state.isInitialized, state.isOnline, api]);

  // Search (offline-first)
  const searchOffline = useCallback(async (query: string): Promise<{ artists: Artist[]; albums: Album[]; songs: Song[] }> => {
    if (!state.isInitialized) {
      return { artists: [], albums: [], songs: [] };
    }
    
    try {
      const offlineResults = await offlineLibraryManager.searchOffline(query);
      
      // If we have good offline results, return them
      const totalResults = offlineResults.artists.length + offlineResults.albums.length + offlineResults.songs.length;
      if (totalResults > 0) {
        return offlineResults;
      }
      
      // If no offline results and we're online, try server
      if (state.isOnline && api) {
        return await api.search2(query);
      }
      
      return offlineResults;
    } catch (error) {
      console.error('Search failed:', error);
      return { artists: [], albums: [], songs: [] };
    }
  }, [state.isInitialized, state.isOnline, api]);

  // Offline favorites management
  const starOffline = useCallback(async (id: string, type: 'song' | 'album' | 'artist'): Promise<void> => {
    if (!state.isInitialized) return;
    
    try {
      if (state.isOnline && api) {
        // If online, try server first
        await api.star(id, type);
      }
      
      // Always update offline data
      await offlineLibraryManager.starOffline(id, type);
      
      // Update stats
      const stats = await offlineLibraryManager.getLibraryStats();
      setState(prev => ({ ...prev, stats }));
      
    } catch (error) {
      console.error('Failed to star item:', error);
      // If server failed but we're online, still save offline for later sync
      if (state.isOnline) {
        await offlineLibraryManager.starOffline(id, type);
        const stats = await offlineLibraryManager.getLibraryStats();
        setState(prev => ({ ...prev, stats }));
      }
      throw error;
    }
  }, [state.isInitialized, state.isOnline, api]);

  const unstarOffline = useCallback(async (id: string, type: 'song' | 'album' | 'artist'): Promise<void> => {
    if (!state.isInitialized) return;
    
    try {
      if (state.isOnline && api) {
        await api.unstar(id, type);
      }
      
      await offlineLibraryManager.unstarOffline(id, type);
      
      const stats = await offlineLibraryManager.getLibraryStats();
      setState(prev => ({ ...prev, stats }));
      
    } catch (error) {
      console.error('Failed to unstar item:', error);
      if (state.isOnline) {
        await offlineLibraryManager.unstarOffline(id, type);
        const stats = await offlineLibraryManager.getLibraryStats();
        setState(prev => ({ ...prev, stats }));
      }
      throw error;
    }
  }, [state.isInitialized, state.isOnline, api]);

  // Playlist management
  const createPlaylistOffline = useCallback(async (name: string, songIds?: string[]): Promise<Playlist> => {
    if (!state.isInitialized) {
      throw new Error('Offline library not initialized');
    }
    
    try {
      if (state.isOnline && api) {
        // If online, try server first
        const serverPlaylist = await api.createPlaylist(name, songIds);
        await offlineLibraryManager.storePlaylists([serverPlaylist]);
        
        const stats = await offlineLibraryManager.getLibraryStats();
        setState(prev => ({ ...prev, stats }));
        
        return serverPlaylist;
      } else {
        // If offline, create locally and queue for sync
        const offlinePlaylist = await offlineLibraryManager.createPlaylistOffline(name, songIds);
        
        const stats = await offlineLibraryManager.getLibraryStats();
        setState(prev => ({ ...prev, stats }));
        
        return offlinePlaylist;
      }
    } catch (error) {
      console.error('Failed to create playlist:', error);
      
      // If server failed but we're online, create offline version for later sync
      if (state.isOnline) {
        const offlinePlaylist = await offlineLibraryManager.createPlaylistOffline(name, songIds);
        const stats = await offlineLibraryManager.getLibraryStats();
        setState(prev => ({ ...prev, stats }));
        return offlinePlaylist;
      }
      
      throw error;
    }
  }, [state.isInitialized, state.isOnline, api]);

  // Scrobble (offline-capable)
  const scrobbleOffline = useCallback(async (songId: string): Promise<void> => {
    if (!state.isInitialized) return;
    
    try {
      if (state.isOnline && api) {
        await api.scrobble(songId);
      } else {
        // Queue for later sync
        await offlineLibraryManager.addSyncOperation({
          type: 'scrobble',
          entityType: 'song',
          entityId: songId,
          data: {}
        });
        
        const stats = await offlineLibraryManager.getLibraryStats();
        setState(prev => ({ ...prev, stats }));
      }
    } catch (error) {
      console.error('Failed to scrobble:', error);
      // Queue for later sync if server failed
      await offlineLibraryManager.addSyncOperation({
        type: 'scrobble',
        entityType: 'song',
        entityId: songId,
        data: {}
      });
      
      const stats = await offlineLibraryManager.getLibraryStats();
      setState(prev => ({ ...prev, stats }));
    }
  }, [state.isInitialized, state.isOnline, api]);

  // Clear all offline data
  const clearOfflineData = useCallback(async (): Promise<void> => {
    if (!state.isInitialized) return;
    
    try {
      await offlineLibraryManager.clearAllData();
      
      const stats = await offlineLibraryManager.getLibraryStats();
      setState(prev => ({ 
        ...prev, 
        stats,
        lastSync: null 
      }));
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }, [state.isInitialized]);

  // Get songs with offline-first approach
  const getSongs = useCallback(async (albumId?: string, artistId?: string): Promise<Song[]> => {
    if (!state.isInitialized) return [];
    
    try {
      const offlineSongs = await offlineLibraryManager.getSongs(albumId, artistId);
      
      if (offlineSongs.length > 0) {
        return offlineSongs;
      }
      
      if (state.isOnline && api) {
        let serverSongs: Song[] = [];
        
        if (albumId) {
          const { songs } = await api.getAlbum(albumId);
          await offlineLibraryManager.storeSongs(songs);
          serverSongs = songs;
        } else if (artistId) {
          const { albums } = await api.getArtist(artistId);
          const allSongs: Song[] = [];
          for (const album of albums) {
            const { songs } = await api.getAlbum(album.id);
            allSongs.push(...songs);
          }
          await offlineLibraryManager.storeSongs(allSongs);
          serverSongs = allSongs;
        }
        
        return serverSongs;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get songs:', error);
      return [];
    }
  }, [api, state.isInitialized, state.isOnline]);

  // Queue sync operation
  const queueSyncOperation = useCallback(async (operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> => {
    if (!state.isInitialized) return;
    
    const fullOperation: SyncOperation = {
      ...operation,
      id: `${operation.type}-${operation.entityId}-${Date.now()}`,
      timestamp: Date.now(),
      retryCount: 0
    };
    
    await offlineLibraryManager.addSyncOperation(fullOperation);
    await refreshStats();
  }, [state.isInitialized]);

  // Update playlist offline
  const updatePlaylistOffline = useCallback(async (id: string, name?: string, comment?: string, songIds?: string[]): Promise<void> => {
    if (!state.isInitialized) return;
    
    await offlineLibraryManager.updatePlaylist(id, name, comment, songIds);
    await refreshStats();
  }, [state.isInitialized]);

  // Delete playlist offline
  const deletePlaylistOffline = useCallback(async (id: string): Promise<void> => {
    if (!state.isInitialized) return;
    
    await offlineLibraryManager.deletePlaylist(id);
    await refreshStats();
  }, [state.isInitialized]);

  // Refresh stats
  const refreshStats = useCallback(async (): Promise<void> => {
    if (!state.isInitialized) return;
    
    try {
      const stats = await offlineLibraryManager.getLibraryStats();
      setState(prev => ({ ...prev, stats, lastSync: stats.lastSync }));
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }
  }, [state.isInitialized]);

  return {
    // State
    ...state,
    
    // Sync methods
    syncLibraryFromServer,
    syncPendingOperations,
    
    // Data retrieval (offline-first)
    getAlbums,
    getArtists,
    getSongs,
    getAlbum,
    getPlaylists,
    searchOffline,
    
    // Offline operations
    starOffline,
    unstarOffline,
    createPlaylistOffline,
    updatePlaylistOffline,
    deletePlaylistOffline,
    scrobbleOffline,
    queueSyncOperation,
    
    // Management
    clearOfflineData,
    refreshStats
  };
}
