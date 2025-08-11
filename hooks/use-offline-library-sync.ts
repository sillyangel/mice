'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { offlineLibraryDB, LibrarySyncStats, OfflineAlbum, OfflineArtist, OfflineSong, OfflinePlaylist } from '@/lib/indexeddb';
import { useNavidromeConfig } from '@/app/components/NavidromeConfigContext';
import { useToast } from '@/hooks/use-toast';
import { getNavidromeAPI, Song } from '@/lib/navidrome';

export interface LibrarySyncProgress {
  phase: 'idle' | 'albums' | 'artists' | 'songs' | 'playlists' | 'operations' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
}

export interface LibrarySyncOptions {
  includeAlbums: boolean;
  includeArtists: boolean;
  includeSongs: boolean;
  includePlaylists: boolean;
  syncStarred: boolean;
  maxSongs: number; // Limit to prevent overwhelming the database
}

const defaultSyncOptions: LibrarySyncOptions = {
  includeAlbums: true,
  includeArtists: true,
  includeSongs: true,
  includePlaylists: true,
  syncStarred: true,
  maxSongs: 1000 // Default limit
};

export function useOfflineLibrarySync() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<LibrarySyncProgress>({
    phase: 'idle',
    current: 0,
    total: 0,
    message: ''
  });
  const [stats, setStats] = useState<LibrarySyncStats>({
    albums: 0,
    artists: 0,
    songs: 0,
    playlists: 0,
    lastSync: null,
    pendingOperations: 0,
    storageSize: 0,
    syncInProgress: false
  });
  const [isOnline, setIsOnline] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncOptions, setSyncOptions] = useState<LibrarySyncOptions>(defaultSyncOptions);

  const { config, isConnected } = useNavidromeConfig();
  const api = useMemo(() => getNavidromeAPI(config), [config]);
  const { toast } = useToast();
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize the offline library database
  useEffect(() => {
    const initializeDB = async () => {
      try {
        const initialized = await offlineLibraryDB.initialize();
        setIsInitialized(initialized);
        
        if (initialized) {
          await refreshStats();
          loadSyncSettings();
        }
      } catch (error) {
        console.error('Failed to initialize offline library:', error);
      }
    };

    initializeDB();
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check if navigator is available (client-side only)
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && isConnected && autoSyncEnabled && !isSyncing) {
      const pendingOpsSync = async () => {
        try {
          await syncPendingOperations();
        } catch (error) {
          console.error('Auto-sync failed:', error);
        }
      };

      // Delay auto-sync to avoid immediate trigger
      syncTimeoutRef.current = setTimeout(pendingOpsSync, 2000);
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [isOnline, isConnected, autoSyncEnabled, isSyncing]);

  const loadSyncSettings = useCallback(async () => {
    try {
      const [autoSync, savedOptions] = await Promise.all([
        offlineLibraryDB.getMetadata<boolean>('autoSyncEnabled'),
        offlineLibraryDB.getMetadata<LibrarySyncOptions>('syncOptions')
      ]);

      if (typeof autoSync === 'boolean') setAutoSyncEnabled(autoSync);

      if (savedOptions) {
        setSyncOptions({ ...defaultSyncOptions, ...savedOptions });
      }
    } catch (error) {
      console.error('Failed to load sync settings:', error);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    if (!isInitialized) return;

    try {
      const newStats = await offlineLibraryDB.getStats();
      setStats(newStats);
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }
  }, [isInitialized]);

  const updateSyncProgress = useCallback((phase: LibrarySyncProgress['phase'], current: number, total: number, message: string) => {
    setSyncProgress({ phase, current, total, message });
  }, []);

  const syncLibraryFromServer = useCallback(async (options: Partial<LibrarySyncOptions> = {}) => {
    if (!api || !isConnected || !isInitialized) {
      throw new Error('Cannot sync: API not available or not connected');
    }

    if (isSyncing) {
      throw new Error('Sync already in progress');
    }

    const actualOptions = { ...syncOptions, ...options };

    try {
      setIsSyncing(true);
      await offlineLibraryDB.setMetadata('syncInProgress', true);
      
      updateSyncProgress('albums', 0, 0, 'Testing server connection...');

      // Test connection first
      const connected = await api.ping();
      if (!connected) {
        throw new Error('No connection to Navidrome server');
      }

      let totalItems = 0;
      let processedItems = 0;

      // Sync albums
      if (actualOptions.includeAlbums) {
        updateSyncProgress('albums', 0, 0, 'Fetching albums from server...');
        
        const albums = await api.getAlbums('alphabeticalByName', 5000);
        totalItems += albums.length;
        
        updateSyncProgress('albums', 0, albums.length, `Storing ${albums.length} albums...`);
        
        const mappedAlbums: OfflineAlbum[] = albums.map(album => ({
          ...album,
          lastModified: Date.now(),
          synced: true
        }));
        
        await offlineLibraryDB.storeAlbums(mappedAlbums);
        processedItems += albums.length;
        
        updateSyncProgress('albums', albums.length, albums.length, `Stored ${albums.length} albums`);
      }

      // Sync artists
      if (actualOptions.includeArtists) {
        updateSyncProgress('artists', processedItems, totalItems, 'Fetching artists from server...');
        
        const artists = await api.getArtists();
        totalItems += artists.length;
        
        updateSyncProgress('artists', 0, artists.length, `Storing ${artists.length} artists...`);
        
        const mappedArtists: OfflineArtist[] = artists.map(artist => ({
          ...artist,
          lastModified: Date.now(),
          synced: true
        }));
        
        await offlineLibraryDB.storeArtists(mappedArtists);
        processedItems += artists.length;
        
        updateSyncProgress('artists', artists.length, artists.length, `Stored ${artists.length} artists`);
      }

      // Sync playlists
      if (actualOptions.includePlaylists) {
        updateSyncProgress('playlists', processedItems, totalItems, 'Fetching playlists from server...');
        
        const playlists = await api.getPlaylists();
        totalItems += playlists.length;
        
        updateSyncProgress('playlists', 0, playlists.length, `Storing ${playlists.length} playlists...`);
        
        const mappedPlaylists: OfflinePlaylist[] = await Promise.all(
          playlists.map(async (playlist) => {
            try {
              const playlistDetails = await api.getPlaylist(playlist.id);
              return {
                ...playlist,
                songIds: (playlistDetails.songs || []).map((song: Song) => song.id),
                lastModified: Date.now(),
                synced: true
              };
            } catch (error) {
              console.warn(`Failed to get details for playlist ${playlist.id}:`, error);
              return {
                ...playlist,
                songIds: [],
                lastModified: Date.now(),
                synced: true
              };
            }
          })
        );
        
        await offlineLibraryDB.storePlaylists(mappedPlaylists);
        processedItems += playlists.length;
        
        updateSyncProgress('playlists', playlists.length, playlists.length, `Stored ${playlists.length} playlists`);
      }

      // Sync songs (limited to avoid overwhelming the database)
      if (actualOptions.includeSongs) {
        updateSyncProgress('songs', processedItems, totalItems, 'Fetching songs from server...');
        
        const albums = await offlineLibraryDB.getAlbums();
        const albumsToSync = albums.slice(0, Math.floor(actualOptions.maxSongs / 10)); // Roughly 10 songs per album
        
        let songCount = 0;
        updateSyncProgress('songs', 0, albumsToSync.length, `Processing songs for ${albumsToSync.length} albums...`);
        
        for (let i = 0; i < albumsToSync.length; i++) {
          const album = albumsToSync[i];
          try {
            const { songs } = await api.getAlbum(album.id);
            
            if (songCount + songs.length > actualOptions.maxSongs) {
              const remaining = actualOptions.maxSongs - songCount;
              if (remaining > 0) {
                const limitedSongs = songs.slice(0, remaining);
                const mappedSongs: OfflineSong[] = limitedSongs.map(song => ({
                  ...song,
                  lastModified: Date.now(),
                  synced: true
                }));
                await offlineLibraryDB.storeSongs(mappedSongs);
                songCount += limitedSongs.length;
              }
              break;
            }
            
            const mappedSongs: OfflineSong[] = songs.map(song => ({
              ...song,
              lastModified: Date.now(),
              synced: true
            }));
            
            await offlineLibraryDB.storeSongs(mappedSongs);
            songCount += songs.length;
            
            updateSyncProgress('songs', i + 1, albumsToSync.length, `Processed ${i + 1}/${albumsToSync.length} albums (${songCount} songs)`);
          } catch (error) {
            console.warn(`Failed to sync songs for album ${album.id}:`, error);
          }
        }
        
        updateSyncProgress('songs', albumsToSync.length, albumsToSync.length, `Stored ${songCount} songs`);
      }

      // Sync pending operations to server
      updateSyncProgress('operations', 0, 0, 'Syncing pending operations...');
      await syncPendingOperations();

      // Update sync timestamp
      await offlineLibraryDB.setMetadata('lastSync', Date.now());
      
      updateSyncProgress('complete', 100, 100, 'Library sync completed successfully');
      
      toast({
        title: "Sync Complete",
        description: `Successfully synced library data offline`,
      });

    } catch (error) {
      console.error('Library sync failed:', error);
      updateSyncProgress('error', 0, 0, `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
      
      throw error;
    } finally {
      setIsSyncing(false);
      await offlineLibraryDB.setMetadata('syncInProgress', false);
      await refreshStats();
    }
  }, [api, isConnected, isInitialized, isSyncing, syncOptions, toast, updateSyncProgress, refreshStats]);

  const syncPendingOperations = useCallback(async () => {
    if (!api || !isConnected || !isInitialized) {
      return;
    }

    try {
      const operations = await offlineLibraryDB.getSyncOperations();
      
      if (operations.length === 0) {
        return;
      }

      updateSyncProgress('operations', 0, operations.length, 'Syncing pending operations...');

      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        
        try {
          switch (operation.type) {
            case 'star':
              if (operation.entityType !== 'playlist') {
                await api.star(operation.entityId, operation.entityType);
              }
              break;
            case 'unstar':
              if (operation.entityType !== 'playlist') {
                await api.unstar(operation.entityId, operation.entityType);
              }
              break;
            case 'scrobble':
              await api.scrobble(operation.entityId);
              break;
            case 'create_playlist':
              if ('name' in operation.data && typeof operation.data.name === 'string') {
                await api.createPlaylist(
                  operation.data.name,
                  'songIds' in operation.data ? operation.data.songIds : undefined
                );
              }
              break;
            case 'update_playlist':
              if ('name' in operation.data || 'comment' in operation.data || 'songIds' in operation.data) {
                const d = operation.data as { name?: string; comment?: string; songIds?: string[] };
                await api.updatePlaylist(operation.entityId, d.name, d.comment, d.songIds);
              }
              break;
            case 'delete_playlist':
              await api.deletePlaylist(operation.entityId);
              break;
          }

          await offlineLibraryDB.removeSyncOperation(operation.id);
          updateSyncProgress('operations', i + 1, operations.length, `Synced ${i + 1}/${operations.length} operations`);
          
        } catch (error) {
          console.error(`Failed to sync operation ${operation.id}:`, error);
          // Don't remove failed operations, they'll be retried later
        }
      }

    } catch (error) {
      console.error('Failed to sync pending operations:', error);
    }
  }, [api, isConnected, isInitialized, updateSyncProgress]);

  const clearOfflineData = useCallback(async () => {
    if (!isInitialized) return;

    try {
      await offlineLibraryDB.clearAllData();
      await refreshStats();
      
      toast({
        title: "Offline Data Cleared",
        description: "All offline library data has been removed",
      });
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear offline data",
        variant: "destructive"
      });
    }
  }, [isInitialized, refreshStats, toast]);

  const updateAutoSync = useCallback(async (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    try {
      await offlineLibraryDB.setMetadata('autoSyncEnabled', enabled);
    } catch (error) {
      console.error('Failed to save auto-sync setting:', error);
    }
  }, []);

  const updateSyncOptions = useCallback(async (newOptions: Partial<LibrarySyncOptions>) => {
    const updatedOptions = { ...syncOptions, ...newOptions };
    setSyncOptions(updatedOptions);
    
    try {
      await offlineLibraryDB.setMetadata('syncOptions', updatedOptions);
    } catch (error) {
      console.error('Failed to save sync options:', error);
    }
  }, [syncOptions]);

  // Offline-first operations
  const starItem = useCallback(async (id: string, type: 'song' | 'album' | 'artist') => {
    if (!isInitialized) throw new Error('Offline library not initialized');

    try {
      await offlineLibraryDB.starItem(id, type);
      await refreshStats();
      
      // Try to sync immediately if online
      if (isOnline && isConnected && api) {
        try {
          await api.star(id, type);
          await offlineLibraryDB.removeSyncOperation(`star-${id}`);
        } catch (error) {
          console.log('Failed to sync star operation immediately, will retry later:', error);
        }
      }
    } catch (error) {
      console.error('Failed to star item:', error);
      throw error;
    }
  }, [isInitialized, refreshStats, isOnline, isConnected, api]);

  const unstarItem = useCallback(async (id: string, type: 'song' | 'album' | 'artist') => {
    if (!isInitialized) throw new Error('Offline library not initialized');

    try {
      await offlineLibraryDB.unstarItem(id, type);
      await refreshStats();
      
      // Try to sync immediately if online
      if (isOnline && isConnected && api) {
        try {
          await api.unstar(id, type);
          await offlineLibraryDB.removeSyncOperation(`unstar-${id}`);
        } catch (error) {
          console.log('Failed to sync unstar operation immediately, will retry later:', error);
        }
      }
    } catch (error) {
      console.error('Failed to unstar item:', error);
      throw error;
    }
  }, [isInitialized, refreshStats, isOnline, isConnected, api]);

  return {
    // State
    isInitialized,
    isSyncing,
    syncProgress,
    stats,
    isOnline,
    autoSyncEnabled,
    syncOptions,

    // Actions
    syncLibraryFromServer,
    syncPendingOperations,
    clearOfflineData,
    updateAutoSync,
    updateSyncOptions,
    refreshStats,
    starItem,
    unstarItem,

    // Data access (for offline access)
    getOfflineAlbums: () => offlineLibraryDB.getAlbums(),
    getOfflineArtists: () => offlineLibraryDB.getArtists(),
    getOfflineSongs: (albumId?: string) => offlineLibraryDB.getSongs(albumId),
    getOfflinePlaylists: () => offlineLibraryDB.getPlaylists(),
    getOfflineAlbum: (id: string) => offlineLibraryDB.getAlbum(id)
  };
}
