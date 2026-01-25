'use client';

export interface LibraryItem {
  id: string;
  lastModified: number;
  synced: boolean;
}

export interface OfflineAlbum extends LibraryItem {
  name: string;
  artist: string;
  artistId: string;
  coverArt?: string;
  songCount: number;
  duration: number;
  playCount?: number;
  created: string;
  starred?: string;
  year?: number;
  genre?: string;
}

export interface OfflineArtist extends LibraryItem {
  name: string;
  albumCount: number;
  starred?: string;
  coverArt?: string;
}

export interface OfflineSong extends LibraryItem {
  parent: string;
  isDir: boolean;
  title: string;
  album: string;
  artist: string;
  track?: number;
  year?: number;
  genre?: string;
  coverArt?: string;
  size: number;
  contentType: string;
  suffix: string;
  duration: number;
  bitRate?: number;
  path: string;
  playCount?: number;
  discNumber?: number;
  created: string;
  albumId: string;
  artistId: string;
  type: string;
  starred?: string;
}

export interface OfflinePlaylist extends LibraryItem {
  name: string;
  comment?: string;
  owner: string;
  public: boolean;
  songCount: number;
  duration: number;
  created: string;
  changed: string;
  coverArt?: string;
  songIds: string[];
}

export interface SyncMetadata<T = unknown> {
  key: string;
  value: T;
  lastUpdated: number;
}

// Shape for queued operations' data payloads
export type SyncOperationData =
  | { star: true } // star
  | { star: false } // unstar
  | { name: string; songIds?: string[] } // create_playlist
  | { name?: string; comment?: string; songIds?: string[] } // update_playlist
  | Record<string, never>; // delete_playlist, scrobble, or empty

export interface SyncOperation {
  id: string;
  type: 'star' | 'unstar' | 'create_playlist' | 'update_playlist' | 'delete_playlist' | 'scrobble';
  entityType: 'song' | 'album' | 'artist' | 'playlist';
  entityId: string;
  data: SyncOperationData;
  timestamp: number;
  retryCount: number;
}

export interface LibrarySyncStats {
  albums: number;
  artists: number;
  songs: number;
  playlists: number;
  lastSync: Date | null;
  pendingOperations: number;
  storageSize: number;
  syncInProgress: boolean;
}

class OfflineLibraryDB {
  private dbName = 'stillnavidrome-offline';
  private dbVersion = 2;
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    if (this.isInitialized && this.db) {
      return true;
    }

    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not supported');
      return false;
    }

    try {
      this.db = await this.openDatabase();
      this.isInitialized = true;
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

        // Albums store
        if (!db.objectStoreNames.contains('albums')) {
          const albumsStore = db.createObjectStore('albums', { keyPath: 'id' });
          albumsStore.createIndex('artist', 'artist', { unique: false });
          albumsStore.createIndex('artistId', 'artistId', { unique: false });
          albumsStore.createIndex('starred', 'starred', { unique: false });
          albumsStore.createIndex('synced', 'synced', { unique: false });
          albumsStore.createIndex('lastModified', 'lastModified', { unique: false });
        }

        // Artists store
        if (!db.objectStoreNames.contains('artists')) {
          const artistsStore = db.createObjectStore('artists', { keyPath: 'id' });
          artistsStore.createIndex('name', 'name', { unique: false });
          artistsStore.createIndex('starred', 'starred', { unique: false });
          artistsStore.createIndex('synced', 'synced', { unique: false });
          artistsStore.createIndex('lastModified', 'lastModified', { unique: false });
        }

        // Songs store
        if (!db.objectStoreNames.contains('songs')) {
          const songsStore = db.createObjectStore('songs', { keyPath: 'id' });
          songsStore.createIndex('albumId', 'albumId', { unique: false });
          songsStore.createIndex('artistId', 'artistId', { unique: false });
          songsStore.createIndex('starred', 'starred', { unique: false });
          songsStore.createIndex('synced', 'synced', { unique: false });
          songsStore.createIndex('lastModified', 'lastModified', { unique: false });
          songsStore.createIndex('title', 'title', { unique: false });
        }

        // Playlists store
        if (!db.objectStoreNames.contains('playlists')) {
          const playlistsStore = db.createObjectStore('playlists', { keyPath: 'id' });
          playlistsStore.createIndex('name', 'name', { unique: false });
          playlistsStore.createIndex('owner', 'owner', { unique: false });
          playlistsStore.createIndex('synced', 'synced', { unique: false });
          playlistsStore.createIndex('lastModified', 'lastModified', { unique: false });
        }

        // Sync operations queue
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('entityType', 'entityType', { unique: false });
        }

        // Metadata store for sync info and settings
        if (!db.objectStoreNames.contains('metadata')) {
          const metadataStore = db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  // Metadata operations
  async setMetadata<T>(key: string, value: T): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['metadata'], 'readwrite');
    const store = transaction.objectStore('metadata');
    
    const metadata: SyncMetadata<T> = {
      key,
      value,
      lastUpdated: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(metadata);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMetadata<T = unknown>(key: string): Promise<T | null> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['metadata'], 'readonly');
    const store = transaction.objectStore('metadata');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result as SyncMetadata<T> | undefined;
        resolve(result ? (result.value as T) : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Album operations
  async storeAlbums(albums: OfflineAlbum[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['albums'], 'readwrite');
    const store = transaction.objectStore('albums');

    return new Promise((resolve, reject) => {
      let completed = 0;
      const total = albums.length;

      if (total === 0) {
        resolve();
        return;
      }

      albums.forEach(album => {
        const albumWithMeta = {
          ...album,
          lastModified: Date.now(),
          synced: true
        };

        const request = store.put(albumWithMeta);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getAlbums(starred?: boolean): Promise<OfflineAlbum[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['albums'], 'readonly');
    const store = transaction.objectStore('albums');

    return new Promise((resolve, reject) => {
      const request = starred 
        ? store.index('starred').getAll(IDBKeyRange.only('starred'))
        : store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAlbum(id: string): Promise<OfflineAlbum | null> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['albums'], 'readonly');
    const store = transaction.objectStore('albums');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Artist operations
  async storeArtists(artists: OfflineArtist[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['artists'], 'readwrite');
    const store = transaction.objectStore('artists');

    return new Promise((resolve, reject) => {
      let completed = 0;
      const total = artists.length;

      if (total === 0) {
        resolve();
        return;
      }

      artists.forEach(artist => {
        const artistWithMeta = {
          ...artist,
          lastModified: Date.now(),
          synced: true
        };

        const request = store.put(artistWithMeta);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getArtists(starred?: boolean): Promise<OfflineArtist[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['artists'], 'readonly');
    const store = transaction.objectStore('artists');

    return new Promise((resolve, reject) => {
      const request = starred 
        ? store.index('starred').getAll(IDBKeyRange.only('starred'))
        : store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Song operations
  async storeSongs(songs: OfflineSong[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['songs'], 'readwrite');
    const store = transaction.objectStore('songs');

    return new Promise((resolve, reject) => {
      let completed = 0;
      const total = songs.length;

      if (total === 0) {
        resolve();
        return;
      }

      songs.forEach(song => {
        const songWithMeta = {
          ...song,
          lastModified: Date.now(),
          synced: true
        };

        const request = store.put(songWithMeta);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getSongs(albumId?: string, starred?: boolean): Promise<OfflineSong[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['songs'], 'readonly');
    const store = transaction.objectStore('songs');

    return new Promise((resolve, reject) => {
      let request: IDBRequest<OfflineSong[]>;

      if (albumId) {
        request = store.index('albumId').getAll(IDBKeyRange.only(albumId));
      } else if (starred) {
        request = store.index('starred').getAll(IDBKeyRange.only('starred'));
      } else {
        request = store.getAll();
      }

  request.onsuccess = () => resolve(request.result as OfflineSong[]);
      request.onerror = () => reject(request.error);
    });
  }

  // Playlist operations
  async storePlaylists(playlists: OfflinePlaylist[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['playlists'], 'readwrite');
    const store = transaction.objectStore('playlists');

    return new Promise((resolve, reject) => {
      let completed = 0;
      const total = playlists.length;

      if (total === 0) {
        resolve();
        return;
      }

      playlists.forEach(playlist => {
        const playlistWithMeta = {
          ...playlist,
          lastModified: Date.now(),
          synced: true
        };

        const request = store.put(playlistWithMeta);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getPlaylists(): Promise<OfflinePlaylist[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['playlists'], 'readonly');
    const store = transaction.objectStore('playlists');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Sync operations
  async addSyncOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    const syncOp: SyncOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const request = store.add(syncOp);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncOperations(): Promise<SyncOperation[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeSyncOperation(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Statistics and management
  async getStats(): Promise<LibrarySyncStats> {
    if (!this.db) throw new Error('Database not initialized');

    const [albums, artists, songs, playlists, syncOps, lastSyncNum] = await Promise.all([
      this.getAlbums(),
      this.getArtists(),
      this.getSongs(),
      this.getPlaylists(),
      this.getSyncOperations(),
      this.getMetadata<number>('lastSync')
    ]);

    // Estimate storage size
    const storageSize = await this.estimateStorageSize();

    return {
      albums: albums.length,
      artists: artists.length,
      songs: songs.length,
      playlists: playlists.length,
  lastSync: typeof lastSyncNum === 'number' ? new Date(lastSyncNum) : null,
      pendingOperations: syncOps.length,
      storageSize,
  syncInProgress: (await this.getMetadata<boolean>('syncInProgress')) ?? false
    };
  }

  async estimateStorageSize(): Promise<number> {
    if (!this.db) return 0;

    try {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    } catch {
      // Fallback estimation if storage API not available
      const [albums, artists, songs, playlists] = await Promise.all([
        this.getAlbums(),
        this.getArtists(),
        this.getSongs(),
        this.getPlaylists()
      ]);

      // Rough estimation: average 2KB per item
      return (albums.length + artists.length + songs.length + playlists.length) * 2048;
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['albums', 'artists', 'songs', 'playlists', 'syncQueue', 'metadata'], 'readwrite');
    
    const stores = [
      transaction.objectStore('albums'),
      transaction.objectStore('artists'),
      transaction.objectStore('songs'),
      transaction.objectStore('playlists'),
      transaction.objectStore('syncQueue'),
      transaction.objectStore('metadata')
    ];

    return new Promise((resolve, reject) => {
      let completed = 0;
      const total = stores.length;

      stores.forEach(store => {
        const request = store.clear();
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Star/unstar operations (offline-first)
  async starItem(id: string, type: 'song' | 'album' | 'artist'): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const storeName = `${type}s`;
    const transaction = this.db.transaction([storeName, 'syncQueue'], 'readwrite');
    const store = transaction.objectStore(storeName);
    const syncStore = transaction.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
      // Update the item locally first
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.starred = 'starred';
          item.lastModified = Date.now();
          item.synced = false;

          const putRequest = store.put(item);
          putRequest.onsuccess = () => {
            // Add to sync queue
            const syncOp: SyncOperation = {
              id: crypto.randomUUID(),
              type: 'star',
              entityType: type,
              entityId: id,
              data: { star: true },
              timestamp: Date.now(),
              retryCount: 0
            };

            const syncRequest = syncStore.add(syncOp);
            syncRequest.onsuccess = () => resolve();
            syncRequest.onerror = () => reject(syncRequest.error);
          };
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error(`${type} not found`));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async unstarItem(id: string, type: 'song' | 'album' | 'artist'): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const storeName = `${type}s`;
    const transaction = this.db.transaction([storeName, 'syncQueue'], 'readwrite');
    const store = transaction.objectStore(storeName);
    const syncStore = transaction.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          delete item.starred;
          item.lastModified = Date.now();
          item.synced = false;

          const putRequest = store.put(item);
          putRequest.onsuccess = () => {
            const syncOp: SyncOperation = {
              id: crypto.randomUUID(),
              type: 'unstar',
              entityType: type,
              entityId: id,
              data: { star: false },
              timestamp: Date.now(),
              retryCount: 0
            };

            const syncRequest = syncStore.add(syncOp);
            syncRequest.onsuccess = () => resolve();
            syncRequest.onerror = () => reject(syncRequest.error);
          };
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error(`${type} not found`));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }
}

// Singleton instance
export const offlineLibraryDB = new OfflineLibraryDB();