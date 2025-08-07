'use client';

import { Album, Artist, Song, Playlist } from '@/lib/navidrome';

export interface NavidromeAPIInterface {
  ping(): Promise<boolean>;
  getAlbums(type?: string, size?: number): Promise<Album[]>;
  getArtists(): Promise<Artist[]>;
  getPlaylists(): Promise<Playlist[]>;
  getAlbum(id: string): Promise<{ album: Album; songs: Song[] }>;
  star(id: string, type: string): Promise<void>;
  unstar(id: string, type: string): Promise<void>;
  createPlaylist(name: string, songIds?: string[]): Promise<Playlist>;
  updatePlaylist(id: string, name?: string, comment?: string, songIds?: string[]): Promise<void>;
  deletePlaylist(id: string): Promise<void>;
  scrobble(songId: string): Promise<void>;
}

export interface OfflineDatabase {
  albums: Album[];
  artists: Artist[];
  songs: Song[];
  playlists: Playlist[];
  favorites: {
    albums: string[];
    artists: string[];
    songs: string[];
  };
  syncQueue: SyncOperation[];
  lastSync: number;
}

export interface SyncOperationData {
  // For star/unstar operations
  star?: boolean;
  
  // For playlist operations
  name?: string;
  comment?: string;
  songIds?: string[];
  
  // For scrobble operations
  timestamp?: number;
}

export interface SyncOperation {
  id: string;
  type: 'star' | 'unstar' | 'create_playlist' | 'update_playlist' | 'delete_playlist' | 'scrobble';
  data: SyncOperationData;
  timestamp: number;
  retryCount: number;
  entityType: 'song' | 'album' | 'artist' | 'playlist';
  entityId: string;
}

export interface OfflineLibraryStats {
  albums: number;
  artists: number;
  songs: number;
  playlists: number;
  lastSync: Date | null;
  pendingOperations: number;
  storageSize: number;
}

class OfflineLibraryManager {
  private dbName = 'mice-offline-library';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async initialize(): Promise<boolean> {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not supported');
      return false;
    }

    try {
      this.db = await this.openDatabase();
      return true;
    } catch (error) {
      console.error('Failed to initialize offline library:', error);
      return false;
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('albums')) {
          const albumsStore = db.createObjectStore('albums', { keyPath: 'id' });
          albumsStore.createIndex('artist', 'artist', { unique: false });
          albumsStore.createIndex('starred', 'starred', { unique: false });
        }

        if (!db.objectStoreNames.contains('artists')) {
          const artistsStore = db.createObjectStore('artists', { keyPath: 'id' });
          artistsStore.createIndex('name', 'name', { unique: false });
          artistsStore.createIndex('starred', 'starred', { unique: false });
        }

        if (!db.objectStoreNames.contains('songs')) {
          const songsStore = db.createObjectStore('songs', { keyPath: 'id' });
          songsStore.createIndex('albumId', 'albumId', { unique: false });
          songsStore.createIndex('artistId', 'artistId', { unique: false });
          songsStore.createIndex('starred', 'starred', { unique: false });
        }

        if (!db.objectStoreNames.contains('playlists')) {
          const playlistsStore = db.createObjectStore('playlists', { keyPath: 'id' });
          playlistsStore.createIndex('name', 'name', { unique: false });
        }

        if (!db.objectStoreNames.contains('playlistSongs')) {
          const playlistSongsStore = db.createObjectStore('playlistSongs', { keyPath: ['playlistId', 'songId'] });
          playlistSongsStore.createIndex('playlistId', 'playlistId', { unique: false });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('type', 'type', { unique: false });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          const metadataStore = db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  // Library sync methods
  async syncFromServer(navidromeAPI: NavidromeAPIInterface): Promise<void> {
    if (!this.db || !navidromeAPI) return;

    try {
      console.log('Starting full library sync...');
      
      // Test connection
      const isConnected = await navidromeAPI.ping();
      if (!isConnected) {
        throw new Error('No connection to Navidrome server');
      }

      // Sync albums
      const albums = await navidromeAPI.getAlbums('alphabeticalByName', 5000);
      await this.storeAlbums(albums);

      // Sync artists
      const artists = await navidromeAPI.getArtists();
      await this.storeArtists(artists);

      // Sync playlists
      const playlists = await navidromeAPI.getPlaylists();
      await this.storePlaylists(playlists);

      // Sync songs for recently added albums (to avoid overwhelming the db)
      const recentAlbums = albums.slice(0, 100);
      for (const album of recentAlbums) {
        try {
          const { songs } = await navidromeAPI.getAlbum(album.id);
          await this.storeSongs(songs);
        } catch (error) {
          console.warn(`Failed to sync songs for album ${album.id}:`, error);
        }
      }

      // Update last sync timestamp
      await this.setMetadata('lastSync', Date.now());
      console.log('Library sync completed successfully');

    } catch (error) {
      console.error('Failed to sync library:', error);
      throw error;
    }
  }

  async syncPendingOperations(navidromeAPI: NavidromeAPIInterface): Promise<void> {
    if (!this.db || !navidromeAPI) return;

    const operations = await this.getAllSyncOperations();
    
    for (const operation of operations) {
      try {
        await this.executeOperation(operation, navidromeAPI);
        await this.removeSyncOperation(operation.id);
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error);
        
        // Increment retry count
        operation.retryCount++;
        if (operation.retryCount < 3) {
          await this.updateSyncOperation(operation);
        } else {
          // Remove after 3 failed attempts
          await this.removeSyncOperation(operation.id);
        }
      }
    }
  }

  private async executeOperation(operation: SyncOperation, api: NavidromeAPIInterface): Promise<void> {
    switch (operation.type) {
      case 'star':
        await api.star(operation.entityId, operation.entityType);
        break;
      case 'unstar':
        await api.unstar(operation.entityId, operation.entityType);
        break;
      case 'create_playlist':
        if (operation.data.name) {
          await api.createPlaylist(operation.data.name, operation.data.songIds);
        }
        break;
      case 'update_playlist':
        await api.updatePlaylist(operation.entityId, operation.data.name, operation.data.comment, operation.data.songIds);
        break;
      case 'delete_playlist':
        await api.deletePlaylist(operation.entityId);
        break;
      case 'scrobble':
        await api.scrobble(operation.entityId);
        break;
    }
  }

  // Data storage methods
  async storeAlbums(albums: Album[]): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['albums'], 'readwrite');
    const store = transaction.objectStore('albums');

    for (const album of albums) {
      store.put(album);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async storeArtists(artists: Artist[]): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['artists'], 'readwrite');
    const store = transaction.objectStore('artists');

    for (const artist of artists) {
      store.put(artist);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async storeSongs(songs: Song[]): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['songs'], 'readwrite');
    const store = transaction.objectStore('songs');

    for (const song of songs) {
      store.put(song);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async storePlaylists(playlists: Playlist[]): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['playlists'], 'readwrite');
    const store = transaction.objectStore('playlists');

    for (const playlist of playlists) {
      store.put(playlist);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Data retrieval methods
  async getAlbums(starred?: boolean): Promise<Album[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['albums'], 'readonly');
      const store = transaction.objectStore('albums');
      
      let request: IDBRequest;
      if (starred !== undefined) {
        const index = store.index('starred');
        request = index.getAll(starred ? IDBKeyRange.only('starred') : IDBKeyRange.only(undefined));
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getArtists(starred?: boolean): Promise<Artist[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['artists'], 'readonly');
      const store = transaction.objectStore('artists');
      
      let request: IDBRequest;
      if (starred !== undefined) {
        const index = store.index('starred');
        request = index.getAll(starred ? IDBKeyRange.only('starred') : IDBKeyRange.only(undefined));
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getSongs(albumId?: string, artistId?: string, starred?: boolean): Promise<Song[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['songs'], 'readonly');
      const store = transaction.objectStore('songs');
      
      let request: IDBRequest;
      
      if (albumId) {
        const index = store.index('albumId');
        request = index.getAll(albumId);
      } else if (artistId) {
        const index = store.index('artistId');
        request = index.getAll(artistId);
      } else if (starred !== undefined) {
        const index = store.index('starred');
        request = index.getAll(starred ? IDBKeyRange.only('starred') : IDBKeyRange.only(undefined));
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getPlaylists(): Promise<Playlist[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['playlists'], 'readonly');
      const store = transaction.objectStore('playlists');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getAlbum(id: string): Promise<{ album: Album; songs: Song[] } | null> {
    if (!this.db) return null;

    try {
      const [album, songs] = await Promise.all([
        this.getAlbumById(id),
        this.getSongs(id)
      ]);

      if (!album) return null;

      return { album, songs };
    } catch (error) {
      console.error('Failed to get album:', error);
      return null;
    }
  }

  private async getAlbumById(id: string): Promise<Album | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['albums'], 'readonly');
      const store = transaction.objectStore('albums');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Sync queue methods
  async addSyncOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    if (!this.db) return;

    const fullOperation: SyncOperation = {
      ...operation,
      id: `${operation.type}_${operation.entityId}_${Date.now()}`,
      timestamp: Date.now(),
      retryCount: 0
    };

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    store.put(fullOperation);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  private async getAllSyncOperations(): Promise<SyncOperation[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async updateSyncOperation(operation: SyncOperation): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    store.put(operation);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  private async removeSyncOperation(id: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    store.delete(id);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Metadata methods
  async setMetadata(key: string, value: unknown): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['metadata'], 'readwrite');
    const store = transaction.objectStore('metadata');
    store.put({ key, value });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getMetadata(key: string): Promise<unknown> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Search methods
  async searchOffline(query: string): Promise<{ artists: Artist[]; albums: Album[]; songs: Song[] }> {
    if (!this.db) return { artists: [], albums: [], songs: [] };

    try {
      const [allAlbums, allArtists, allSongs] = await Promise.all([
        this.getAlbums(),
        this.getArtists(),
        this.getSongs()
      ]);

      const searchLower = query.toLowerCase();

      const albums = allAlbums.filter(album =>
        album.name.toLowerCase().includes(searchLower) ||
        album.artist.toLowerCase().includes(searchLower)
      );

      const artists = allArtists.filter(artist =>
        artist.name.toLowerCase().includes(searchLower)
      );

      const songs = allSongs.filter(song =>
        song.title.toLowerCase().includes(searchLower) ||
        (song.artist && song.artist.toLowerCase().includes(searchLower)) ||
        (song.album && song.album.toLowerCase().includes(searchLower))
      );

      return { artists, albums, songs };
    } catch (error) {
      console.error('Offline search failed:', error);
      return { artists: [], albums: [], songs: [] };
    }
  }

  // Offline favorites management
  async starOffline(id: string, type: 'song' | 'album' | 'artist'): Promise<void> {
    if (!this.db) return;

    // Add to sync queue
    await this.addSyncOperation({
      type: 'star',
      entityType: type,
      entityId: id,
      data: {}
    });

    // Update local data
    const storeName = type === 'song' ? 'songs' : type === 'album' ? 'albums' : 'artists';
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        item.starred = new Date().toISOString();
        store.put(item);
      }
    };
  }

  async unstarOffline(id: string, type: 'song' | 'album' | 'artist'): Promise<void> {
    if (!this.db) return;

    // Add to sync queue
    await this.addSyncOperation({
      type: 'unstar',
      entityType: type,
      entityId: id,
      data: {}
    });

    // Update local data
    const storeName = type === 'song' ? 'songs' : type === 'album' ? 'albums' : 'artists';
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        delete item.starred;
        store.put(item);
      }
    };
  }

  // Playlist management
  async createPlaylistOffline(name: string, songIds?: string[]): Promise<Playlist> {
    if (!this.db) throw new Error('Database not initialized');

    const playlistId = `offline_${Date.now()}`;
    const playlist: Playlist = {
      id: playlistId,
      name,
      comment: '',
      owner: 'offline',
      public: false,
      songCount: songIds?.length || 0,
      duration: 0,
      created: new Date().toISOString(),
      changed: new Date().toISOString()
    };

    // Store playlist
    const transaction = this.db.transaction(['playlists'], 'readwrite');
    const store = transaction.objectStore('playlists');
    store.put(playlist);

    // Add to sync queue
    await this.addSyncOperation({
      type: 'create_playlist',
      entityType: 'playlist',
      entityId: playlistId,
      data: { name, songIds }
    });

    return playlist;
  }

  // Update playlist
  async updatePlaylist(id: string, name?: string, comment?: string, songIds?: string[]): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['playlists', 'playlistSongs'], 'readwrite');
    const playlistStore = transaction.objectStore('playlists');
    const playlistSongsStore = transaction.objectStore('playlistSongs');

    // Get existing playlist
    const playlist = await new Promise<Playlist>((resolve, reject) => {
      const request = playlistStore.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Update playlist metadata
    const updatedPlaylist = {
      ...playlist,
      ...(name && { name }),
      ...(comment && { comment }),
      updatedAt: new Date().toISOString()
    };

    playlistStore.put(updatedPlaylist);

    // Update song associations if provided
    if (songIds) {
      // Remove existing songs
      const existingSongs = await new Promise<{ playlistId: string; songId: string }[]>((resolve, reject) => {
        const index = playlistSongsStore.index('playlistId');
        const request = index.getAll(id);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      for (const song of existingSongs) {
        playlistSongsStore.delete([song.playlistId, song.songId]);
      }

      // Add new songs
      for (const songId of songIds) {
        playlistSongsStore.put({
          playlistId: id,
          songId: songId
        });
      }
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Delete playlist
  async deletePlaylist(id: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['playlists', 'playlistSongs'], 'readwrite');
    const playlistStore = transaction.objectStore('playlists');
    const playlistSongsStore = transaction.objectStore('playlistSongs');

    // Delete playlist
    playlistStore.delete(id);

    // Delete associated songs
    const index = playlistSongsStore.index('playlistId');
    const songs = await new Promise<{ playlistId: string; songId: string }[]>((resolve, reject) => {
      const request = index.getAll(id);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    for (const song of songs) {
      playlistSongsStore.delete([song.playlistId, song.songId]);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Statistics
  async getLibraryStats(): Promise<OfflineLibraryStats> {
    if (!this.db) {
      return {
        albums: 0,
        artists: 0,
        songs: 0,
        playlists: 0,
        lastSync: null,
        pendingOperations: 0,
        storageSize: 0
      };
    }

    try {
      const [albums, artists, songs, playlists, syncOps, lastSync] = await Promise.all([
        this.getAlbums(),
        this.getArtists(),
        this.getSongs(),
        this.getPlaylists(),
        this.getAllSyncOperations(),
        this.getMetadata('lastSync')
      ]);

      // Estimate storage size (rough calculation)
      const storageSize = this.estimateStorageSize(albums, artists, songs, playlists);

      return {
        albums: albums.length,
        artists: artists.length,
        songs: songs.length,
        playlists: playlists.length,
        lastSync: lastSync && typeof lastSync === 'number' ? new Date(lastSync) : null,
        pendingOperations: syncOps.length,
        storageSize
      };
    } catch (error) {
      console.error('Failed to get library stats:', error);
      return {
        albums: 0,
        artists: 0,
        songs: 0,
        playlists: 0,
        lastSync: null,
        pendingOperations: 0,
        storageSize: 0
      };
    }
  }

  private estimateStorageSize(albums: Album[], artists: Artist[], songs: Song[], playlists: Playlist[]): number {
    // Rough estimation: each item is approximately 1KB in JSON
    return (albums.length + artists.length + songs.length + playlists.length) * 1024;
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    if (!this.db) return;

    const storeNames = ['albums', 'artists', 'songs', 'playlists', 'playlistSongs', 'syncQueue', 'metadata'];
    
    for (const storeName of storeNames) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}

export const offlineLibraryManager = new OfflineLibraryManager();
