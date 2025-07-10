'use client';

// Types for caching (simplified versions to avoid circular imports)
interface Album {
  id: string;
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

interface Artist {
  id: string;
  name: string;
  albumCount: number;
  starred?: string;
  coverArt?: string;
}

interface Song {
  id: string;
  parent: string;
  isDir: boolean;
  title: string;
  artist?: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  year?: number;
  genre?: string;
  coverArt?: string;
  size?: number;
  contentType?: string;
  suffix?: string;
  starred?: string;
  duration?: number;
  bitRate?: number;
  path?: string;
  playCount?: number;
  created: string;
}

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of items in cache
}

class Cache<T> {
  private cache = new Map<string, CacheItem<T>>();
  private config: CacheConfig;

  constructor(config: CacheConfig = { defaultTTL: 24 * 60 * 60 * 1000, maxSize: 1000 }) {
    this.config = config;
  }

  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.config.defaultTTL);
    
    // Remove expired items before adding new one
    this.cleanup();
    
    // If cache is at max size, remove oldest item
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check if item has expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    this.cleanup();
    return this.cache.size;
  }

  keys(): string[] {
    this.cleanup();
    return Array.from(this.cache.keys());
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    this.cleanup();
    const items = Array.from(this.cache.values());
    const totalSize = items.length;
    const oldestItem = items.reduce((oldest, item) => 
      !oldest || item.timestamp < oldest.timestamp ? item : oldest, null as CacheItem<T> | null);
    const newestItem = items.reduce((newest, item) => 
      !newest || item.timestamp > newest.timestamp ? item : newest, null as CacheItem<T> | null);

    return {
      size: totalSize,
      maxSize: this.config.maxSize,
      oldestTimestamp: oldestItem?.timestamp,
      newestTimestamp: newestItem?.timestamp,
      defaultTTL: this.config.defaultTTL
    };
  }
}

// Specific cache instances
export const albumCache = new Cache<Album[]>({ defaultTTL: 24 * 60 * 60 * 1000, maxSize: 500 }); // 24 hours
export const artistCache = new Cache<Artist[]>({ defaultTTL: 24 * 60 * 60 * 1000, maxSize: 200 }); // 24 hours
export const songCache = new Cache<Song[]>({ defaultTTL: 12 * 60 * 60 * 1000, maxSize: 1000 }); // 12 hours
export const imageCache = new Cache<string>({ defaultTTL: 7 * 24 * 60 * 60 * 1000, maxSize: 1000 }); // 7 days for image URLs

// Cache management utilities
export const CacheManager = {
  clearAll() {
    albumCache.clear();
    artistCache.clear();
    songCache.clear();
    imageCache.clear();
    
    // Also clear localStorage cache data
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache-') || key.startsWith('library-cache-')) {
          localStorage.removeItem(key);
        }
      });
    }
  },

  getStats() {
    return {
      albums: albumCache.getStats(),
      artists: artistCache.getStats(),
      songs: songCache.getStats(),
      images: imageCache.getStats()
    };
  },

  getCacheSizeBytes() {
    if (typeof window === 'undefined') return 0;
    
    let size = 0;
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache-') || key.startsWith('library-cache-')) {
        size += localStorage.getItem(key)?.length || 0;
      }
    });
    return size;
  }
};

// Persistent cache for localStorage
export const PersistentCache = {
  set<T>(key: string, data: T, ttl: number = 24 * 60 * 60 * 1000): void {
    if (typeof window === 'undefined') return;
    
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    };
    
    try {
      localStorage.setItem(`cache-${key}`, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to store in localStorage cache:', error);
    }
  },

  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(`cache-${key}`);
      if (!stored) return null;
      
      const item: CacheItem<T> = JSON.parse(stored);
      
      // Check if expired
      if (Date.now() > item.expiresAt) {
        localStorage.removeItem(`cache-${key}`);
        return null;
      }
      
      return item.data;
    } catch (error) {
      console.warn('Failed to read from localStorage cache:', error);
      return null;
    }
  },

  delete(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`cache-${key}`);
  },

  clear(): void {
    if (typeof window === 'undefined') return;
    
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache-')) {
        localStorage.removeItem(key);
      }
    });
  }
};
