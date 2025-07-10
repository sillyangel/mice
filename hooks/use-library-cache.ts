'use client';

import { useState, useEffect } from 'react';

interface LibraryCacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export function useLibraryCache<T>(
  key: string, 
  fetcher: () => Promise<T>, 
  ttl: number = 30 * 60 * 1000 // 30 minutes default
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const getCacheKey = (key: string) => `library-cache-${key}`;

  const getFromCache = (key: string): T | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const cached = localStorage.getItem(getCacheKey(key));
      if (!cached) return null;
      
      const item: LibraryCacheItem<T> = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() > item.expiresAt) {
        localStorage.removeItem(getCacheKey(key));
        return null;
      }
      
      return item.data;
    } catch (error) {
      console.warn('Failed to get cached data:', error);
      localStorage.removeItem(getCacheKey(key));
      return null;
    }
  };

  const setToCache = (key: string, data: T, ttl: number) => {
    if (typeof window === 'undefined') return;
    
    const item: LibraryCacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    };
    
    try {
      localStorage.setItem(getCacheKey(key), JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      // Check cache first
      const cached = getFromCache(key);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
      
      // Fetch fresh data
      try {
        const result = await fetcher();
        setData(result);
        setToCache(key, result, ttl);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [key, ttl]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetcher();
      setData(result);
      setToCache(key, result, ttl);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(getCacheKey(key));
  };

  return { data, loading, error, refresh, clearCache };
}
