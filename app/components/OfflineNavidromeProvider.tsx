'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { Album, Artist, Song, Playlist } from '@/lib/navidrome';
import { NavidromeProvider, useNavidrome } from '@/app/components/NavidromeContext';
import { useOfflineLibrary } from '@/hooks/use-offline-library';

interface OfflineNavidromeContextType {
  // All the original NavidromeContext methods but with offline-first behavior
  getAlbums: (starred?: boolean) => Promise<Album[]>;
  getArtists: (starred?: boolean) => Promise<Artist[]>;
  getSongs: (albumId?: string, artistId?: string) => Promise<Song[]>;
  getPlaylists: () => Promise<Playlist[]>;
  
  // Offline-aware operations
  starItem: (id: string, type: 'song' | 'album' | 'artist') => Promise<void>;
  unstarItem: (id: string, type: 'song' | 'album' | 'artist') => Promise<void>;
  createPlaylist: (name: string, songIds?: string[]) => Promise<void>;
  updatePlaylist: (id: string, name?: string, comment?: string, songIds?: string[]) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  scrobble: (songId: string) => Promise<void>;
  
  // Offline state
  isOfflineMode: boolean;
  hasPendingOperations: boolean;
  lastSync: Date | null;
}

const OfflineNavidromeContext = createContext<OfflineNavidromeContextType | undefined>(undefined);

interface OfflineNavidromeProviderInnerProps {
  children: ReactNode;
}

// Inner component that has access to both contexts
const OfflineNavidromeProviderInner: React.FC<OfflineNavidromeProviderInnerProps> = ({ children }) => {
  const navidromeContext = useNavidrome();
  const offlineLibrary = useOfflineLibrary();

  // Offline-first data retrieval methods
  const getAlbums = async (starred?: boolean): Promise<Album[]> => {
    if (!offlineLibrary.isOnline || !navidromeContext.api) {
      // Offline mode - get from IndexedDB
      return await offlineLibrary.getAlbums(starred);
    }
    
    try {
      // Online mode - try server first, fallback to offline
      const albums = starred 
        ? await navidromeContext.api.getAlbums('starred', 1000)
        : await navidromeContext.api.getAlbums('alphabeticalByName', 1000);
      return albums;
    } catch (error) {
      console.warn('Server request failed, falling back to offline data:', error);
      return await offlineLibrary.getAlbums(starred);
    }
  };

  const getArtists = async (starred?: boolean): Promise<Artist[]> => {
    if (!offlineLibrary.isOnline || !navidromeContext.api) {
      return await offlineLibrary.getArtists(starred);
    }
    
    try {
      const artists = await navidromeContext.api.getArtists();
      if (starred) {
        // Filter starred artists from the full list
        const starredData = await navidromeContext.api.getStarred2();
        const starredArtistIds = new Set(starredData.starred2.artist?.map(a => a.id) || []);
        return artists.filter(artist => starredArtistIds.has(artist.id));
      }
      return artists;
    } catch (error) {
      console.warn('Server request failed, falling back to offline data:', error);
      return await offlineLibrary.getArtists(starred);
    }
  };

  const getSongs = async (albumId?: string, artistId?: string): Promise<Song[]> => {
    if (!offlineLibrary.isOnline || !navidromeContext.api) {
      return await offlineLibrary.getSongs(albumId, artistId);
    }
    
    try {
      if (albumId) {
        const { songs } = await navidromeContext.api.getAlbum(albumId);
        return songs;
      } else if (artistId) {
        const { albums } = await navidromeContext.api.getArtist(artistId);
        const allSongs: Song[] = [];
        for (const album of albums) {
          const { songs } = await navidromeContext.api.getAlbum(album.id);
          allSongs.push(...songs);
        }
        return allSongs;
      } else {
        return await navidromeContext.getAllSongs();
      }
    } catch (error) {
      console.warn('Server request failed, falling back to offline data:', error);
      return await offlineLibrary.getSongs(albumId, artistId);
    }
  };

  const getPlaylists = async (): Promise<Playlist[]> => {
    if (!offlineLibrary.isOnline || !navidromeContext.api) {
      return await offlineLibrary.getPlaylists();
    }
    
    try {
      return await navidromeContext.api.getPlaylists();
    } catch (error) {
      console.warn('Server request failed, falling back to offline data:', error);
      return await offlineLibrary.getPlaylists();
    }
  };

  // Offline-aware operations (queue for sync when offline)
  const starItem = async (id: string, type: 'song' | 'album' | 'artist'): Promise<void> => {
    if (offlineLibrary.isOnline && navidromeContext.api) {
      try {
        await navidromeContext.starItem(id, type);
        // Update offline data immediately
        await offlineLibrary.starOffline(id, type);
        return;
      } catch (error) {
        console.warn('Server star failed, queuing for sync:', error);
      }
    }
    
    // Queue for sync when back online
    await offlineLibrary.starOffline(id, type);
    await offlineLibrary.queueSyncOperation({
      type: 'star',
      entityType: type,
      entityId: id,
      data: {}
    });
  };

  const unstarItem = async (id: string, type: 'song' | 'album' | 'artist'): Promise<void> => {
    if (offlineLibrary.isOnline && navidromeContext.api) {
      try {
        await navidromeContext.unstarItem(id, type);
        await offlineLibrary.unstarOffline(id, type);
        return;
      } catch (error) {
        console.warn('Server unstar failed, queuing for sync:', error);
      }
    }
    
    await offlineLibrary.unstarOffline(id, type);
    await offlineLibrary.queueSyncOperation({
      type: 'unstar',
      entityType: type,
      entityId: id,
      data: {}
    });
  };

  const createPlaylist = async (name: string, songIds?: string[]): Promise<void> => {    
    if (offlineLibrary.isOnline && navidromeContext.api) {
      try {
        const playlist = await navidromeContext.createPlaylist(name, songIds);
        await offlineLibrary.createPlaylistOffline(name, songIds || []);
        return;
      } catch (error) {
        console.warn('Server playlist creation failed, queuing for sync:', error);
      }
    }
    
    // Create offline
    await offlineLibrary.createPlaylistOffline(name, songIds || []);
    await offlineLibrary.queueSyncOperation({
      type: 'create_playlist',
      entityType: 'playlist',
      entityId: 'temp-' + Date.now(),
      data: { name, songIds: songIds || [] }
    });
  };

  const updatePlaylist = async (id: string, name?: string, comment?: string, songIds?: string[]): Promise<void> => {
    if (offlineLibrary.isOnline && navidromeContext.api) {
      try {
        await navidromeContext.updatePlaylist(id, name, comment, songIds);
        await offlineLibrary.updatePlaylistOffline(id, name, comment, songIds);
        return;
      } catch (error) {
        console.warn('Server playlist update failed, queuing for sync:', error);
      }
    }
    
    await offlineLibrary.updatePlaylistOffline(id, name, comment, songIds);
    await offlineLibrary.queueSyncOperation({
      type: 'update_playlist',
      entityType: 'playlist',
      entityId: id,
      data: { name, comment, songIds }
    });
  };

  const deletePlaylist = async (id: string): Promise<void> => {
    if (offlineLibrary.isOnline && navidromeContext.api) {
      try {
        await navidromeContext.deletePlaylist(id);
        await offlineLibrary.deletePlaylistOffline(id);
        return;
      } catch (error) {
        console.warn('Server playlist deletion failed, queuing for sync:', error);
      }
    }
    
    await offlineLibrary.deletePlaylistOffline(id);
    await offlineLibrary.queueSyncOperation({
      type: 'delete_playlist',
      entityType: 'playlist',
      entityId: id,
      data: {}
    });
  };

  const scrobble = async (songId: string): Promise<void> => {
    if (offlineLibrary.isOnline && navidromeContext.api) {
      try {
        await navidromeContext.scrobble(songId);
        return;
      } catch (error) {
        console.warn('Server scrobble failed, queuing for sync:', error);
      }
    }
    
    await offlineLibrary.queueSyncOperation({
      type: 'scrobble',
      entityType: 'song',
      entityId: songId,
      data: { timestamp: Date.now() }
    });
  };

  const contextValue: OfflineNavidromeContextType = {
    getAlbums,
    getArtists,
    getSongs,
    getPlaylists,
    starItem,
    unstarItem,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    scrobble,
    isOfflineMode: !offlineLibrary.isOnline,
    hasPendingOperations: offlineLibrary.stats.pendingOperations > 0,
    lastSync: offlineLibrary.lastSync
  };

  return (
    <OfflineNavidromeContext.Provider value={contextValue}>
      {children}
    </OfflineNavidromeContext.Provider>
  );
};

// Main provider component
export const OfflineNavidromeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <NavidromeProvider>
      <OfflineNavidromeProviderInner>
        {children}
      </OfflineNavidromeProviderInner>
    </NavidromeProvider>
  );
};

// Hook to use the offline-aware Navidrome context
export const useOfflineNavidrome = (): OfflineNavidromeContextType => {
  const context = useContext(OfflineNavidromeContext);
  if (!context) {
    throw new Error('useOfflineNavidrome must be used within an OfflineNavidromeProvider');
  }
  return context;
};
