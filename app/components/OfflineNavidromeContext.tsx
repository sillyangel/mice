'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Album, Artist, Song, Playlist, AlbumInfo, ArtistInfo } from '@/lib/navidrome';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { useOfflineLibrary } from '@/hooks/use-offline-library';

interface OfflineNavidromeContextType {
  // Data (offline-first)
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  
  // Loading states
  isLoading: boolean;
  albumsLoading: boolean;
  artistsLoading: boolean;
  playlistsLoading: boolean;
  
  // Connection state
  isOnline: boolean;
  isOfflineReady: boolean;
  
  // Error states
  error: string | null;
  
  // Offline sync status
  isSyncing: boolean;
  lastSync: Date | null;
  pendingOperations: number;
  
  // Methods (offline-aware)
  searchMusic: (query: string) => Promise<{ artists: Artist[]; albums: Album[]; songs: Song[] }>;
  getAlbum: (albumId: string) => Promise<{ album: Album; songs: Song[] } | null>;
  getArtist: (artistId: string) => Promise<{ artist: Artist; albums: Album[] } | null>;
  getPlaylists: () => Promise<Playlist[]>;
  refreshData: () => Promise<void>;
  
  // Offline-capable operations
  starItem: (id: string, type: 'song' | 'album' | 'artist') => Promise<void>;
  unstarItem: (id: string, type: 'song' | 'album' | 'artist') => Promise<void>;
  createPlaylist: (name: string, songIds?: string[]) => Promise<Playlist>;
  scrobble: (songId: string) => Promise<void>;
  
  // Sync management
  syncLibrary: () => Promise<void>;
  syncPendingOperations: () => Promise<void>;
  clearOfflineData: () => Promise<void>;
}

const OfflineNavidromeContext = createContext<OfflineNavidromeContextType | undefined>(undefined);

interface OfflineNavidromeProviderProps {
  children: ReactNode;
}

export const OfflineNavidromeProvider: React.FC<OfflineNavidromeProviderProps> = ({ children }) => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [artistsLoading, setArtistsLoading] = useState(false);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  // Use the original Navidrome context for online operations
  const originalNavidrome = useNavidrome();
  
  // Use offline library for offline operations
  const {
    isInitialized: isOfflineReady,
    isOnline,
    isSyncing,
    lastSync,
    stats,
    syncLibraryFromServer,
    syncPendingOperations: syncPendingOps,
    getAlbums: getAlbumsOffline,
    getArtists: getArtistsOffline,
    getAlbum: getAlbumOffline,
    getPlaylists: getPlaylistsOffline,
    searchOffline,
    starOffline,
    unstarOffline,
    createPlaylistOffline,
    scrobbleOffline,
    clearOfflineData: clearOfflineDataInternal,
    refreshStats
  } = useOfflineLibrary();

  const isLoading = albumsLoading || artistsLoading || playlistsLoading;
  const pendingOperations = stats.pendingOperations;

  // Load initial data (offline-first approach)
  const loadAlbums = useCallback(async () => {
    setAlbumsLoading(true);
    setError(null);
    
    try {
      const albumData = await getAlbumsOffline();
      setAlbums(albumData);
    } catch (err) {
      console.error('Failed to load albums:', err);
      setError('Failed to load albums');
    } finally {
      setAlbumsLoading(false);
    }
  }, [getAlbumsOffline]);

  const loadArtists = useCallback(async () => {
    setArtistsLoading(true);
    setError(null);
    
    try {
      const artistData = await getArtistsOffline();
      setArtists(artistData);
    } catch (err) {
      console.error('Failed to load artists:', err);
      setError('Failed to load artists');
    } finally {
      setArtistsLoading(false);
    }
  }, [getArtistsOffline]);

  const loadPlaylists = useCallback(async () => {
    setPlaylistsLoading(true);
    setError(null);
    
    try {
      const playlistData = await getPlaylistsOffline();
      setPlaylists(playlistData);
    } catch (err) {
      console.error('Failed to load playlists:', err);
      setError('Failed to load playlists');
    } finally {
      setPlaylistsLoading(false);
    }
  }, [getPlaylistsOffline]);

  const refreshData = useCallback(async () => {
    await Promise.all([loadAlbums(), loadArtists(), loadPlaylists()]);
    await refreshStats();
  }, [loadAlbums, loadArtists, loadPlaylists, refreshStats]);

  // Initialize data when offline library is ready
  useEffect(() => {
    if (isOfflineReady) {
      refreshData();
    }
  }, [isOfflineReady, refreshData]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && isOfflineReady && pendingOperations > 0) {
      console.log('Back online with pending operations, starting sync...');
      syncPendingOps();
    }
  }, [isOnline, isOfflineReady, pendingOperations, syncPendingOps]);

  // Offline-first methods
  const searchMusic = useCallback(async (query: string) => {
    setError(null);
    try {
      return await searchOffline(query);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed');
      return { artists: [], albums: [], songs: [] };
    }
  }, [searchOffline]);

  const getAlbum = useCallback(async (albumId: string) => {
    setError(null);
    try {
      return await getAlbumOffline(albumId);
    } catch (err) {
      console.error('Failed to get album:', err);
      setError('Failed to get album');
      return null;
    }
  }, [getAlbumOffline]);

  const getArtist = useCallback(async (artistId: string): Promise<{ artist: Artist; albums: Album[] } | null> => {
    setError(null);
    try {
      // For now, use the original implementation if online, or search offline
      if (isOnline && originalNavidrome.api) {
        return await originalNavidrome.getArtist(artistId);
      } else {
        // Try to find artist in offline data
        const allArtists = await getArtistsOffline();
        const artist = allArtists.find(a => a.id === artistId);
        if (!artist) return null;

        const allAlbums = await getAlbumsOffline();
        const artistAlbums = allAlbums.filter(a => a.artistId === artistId);
        
        return { artist, albums: artistAlbums };
      }
    } catch (err) {
      console.error('Failed to get artist:', err);
      setError('Failed to get artist');
      return null;
    }
  }, [isOnline, originalNavidrome, getArtistsOffline, getAlbumsOffline]);

  const getPlaylistsWrapper = useCallback(async (): Promise<Playlist[]> => {
    try {
      return await getPlaylistsOffline();
    } catch (err) {
      console.error('Failed to get playlists:', err);
      return [];
    }
  }, [getPlaylistsOffline]);

  // Offline-capable operations
  const starItem = useCallback(async (id: string, type: 'song' | 'album' | 'artist') => {
    setError(null);
    try {
      await starOffline(id, type);
      // Refresh relevant data
      if (type === 'album') {
        await loadAlbums();
      } else if (type === 'artist') {
        await loadArtists();
      }
    } catch (err) {
      console.error('Failed to star item:', err);
      setError('Failed to star item');
      throw err;
    }
  }, [starOffline, loadAlbums, loadArtists]);

  const unstarItem = useCallback(async (id: string, type: 'song' | 'album' | 'artist') => {
    setError(null);
    try {
      await unstarOffline(id, type);
      // Refresh relevant data
      if (type === 'album') {
        await loadAlbums();
      } else if (type === 'artist') {
        await loadArtists();
      }
    } catch (err) {
      console.error('Failed to unstar item:', err);
      setError('Failed to unstar item');
      throw err;
    }
  }, [unstarOffline, loadAlbums, loadArtists]);

  const createPlaylist = useCallback(async (name: string, songIds?: string[]): Promise<Playlist> => {
    setError(null);
    try {
      const playlist = await createPlaylistOffline(name, songIds);
      await loadPlaylists(); // Refresh playlists
      return playlist;
    } catch (err) {
      console.error('Failed to create playlist:', err);
      setError('Failed to create playlist');
      throw err;
    }
  }, [createPlaylistOffline, loadPlaylists]);

  const scrobble = useCallback(async (songId: string) => {
    try {
      await scrobbleOffline(songId);
    } catch (err) {
      console.error('Failed to scrobble:', err);
      // Don't set error state for scrobbling failures as they're not critical
    }
  }, [scrobbleOffline]);

  // Sync management
  const syncLibrary = useCallback(async () => {
    setError(null);
    try {
      await syncLibraryFromServer();
      await refreshData(); // Refresh local state after sync
    } catch (err) {
      console.error('Library sync failed:', err);
      setError('Library sync failed');
      throw err;
    }
  }, [syncLibraryFromServer, refreshData]);

  const syncPendingOperations = useCallback(async () => {
    try {
      await syncPendingOps();
      await refreshStats();
    } catch (err) {
      console.error('Failed to sync pending operations:', err);
      // Don't throw or set error for pending operations sync
    }
  }, [syncPendingOps, refreshStats]);

  const clearOfflineData = useCallback(async () => {
    try {
      await clearOfflineDataInternal();
      setAlbums([]);
      setArtists([]);
      setPlaylists([]);
    } catch (err) {
      console.error('Failed to clear offline data:', err);
      setError('Failed to clear offline data');
      throw err;
    }
  }, [clearOfflineDataInternal]);

  const value: OfflineNavidromeContextType = {
    // Data
    albums,
    artists,
    playlists,
    
    // Loading states
    isLoading,
    albumsLoading,
    artistsLoading,
    playlistsLoading,
    
    // Connection state
    isOnline,
    isOfflineReady,
    
    // Error state
    error,
    
    // Offline sync status
    isSyncing,
    lastSync,
    pendingOperations,
    
    // Methods
    searchMusic,
    getAlbum,
    getArtist,
    getPlaylists: getPlaylistsWrapper,
    refreshData,
    
    // Offline-capable operations
    starItem,
    unstarItem,
    createPlaylist,
    scrobble,
    
    // Sync management
    syncLibrary,
    syncPendingOperations,
    clearOfflineData
  };

  return (
    <OfflineNavidromeContext.Provider value={value}>
      {children}
    </OfflineNavidromeContext.Provider>
  );
};

export const useOfflineNavidrome = (): OfflineNavidromeContextType => {
  const context = useContext(OfflineNavidromeContext);
  if (context === undefined) {
    throw new Error('useOfflineNavidrome must be used within an OfflineNavidromeProvider');
  }
  return context;
};
