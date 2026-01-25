'use client';

import { useState, useEffect, useCallback } from 'react';
import { Album } from '@/lib/navidrome';
import { useNavidrome } from '@/app/components/NavidromeContext';

const INITIAL_BATCH_SIZE = 24;  // Initial number of albums to load
const BATCH_SIZE = 24;          // Number of albums to load in each batch
const SCROLL_THRESHOLD = 200;   // Pixels from bottom before loading more

export type AlbumSortOption = 'alphabeticalByName' | 'newest' | 'recent' | 'frequent' | 'random' | 'alphabeticalByArtist' | 'starred' | 'highest';

export function useProgressiveAlbumLoading(sortBy: AlbumSortOption = 'alphabeticalByName') {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const { api } = useNavidrome();
  const [error, setError] = useState<string | null>(null);

  // Load initial batch
  useEffect(() => {
    loadInitialBatch();
  }, [sortBy]);

  // Cleanup when sort changes
  useEffect(() => {
    return () => {
      setAlbums([]);
      setCurrentOffset(0);
      setHasMore(true);
    };
  }, [sortBy]);

  // Load initial batch of albums
  const loadInitialBatch = useCallback(async () => {
    if (!api) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const albumData = await api.getAlbums(sortBy, INITIAL_BATCH_SIZE, 0);
      setAlbums(albumData);
      setCurrentOffset(albumData.length);
      // Assume there are more unless we got fewer than we asked for
      setHasMore(albumData.length >= INITIAL_BATCH_SIZE);
    } catch (err) {
      console.error('Failed to load initial albums batch:', err);
      setError(err instanceof Error ? err.message : 'Unknown error loading albums');
      setAlbums([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [api, sortBy]);

  // Load more albums when scrolling
  const loadMoreAlbums = useCallback(async () => {
    if (isLoading || !hasMore || !api) return;
    
    setIsLoading(true);
    
    try {
      const newAlbums = await api.getAlbums(sortBy, BATCH_SIZE, currentOffset);
      setAlbums(prev => [...prev, ...newAlbums]);
      setCurrentOffset(currentOffset + newAlbums.length);
      // If we get fewer albums than we asked for, we've reached the end
      setHasMore(newAlbums.length >= BATCH_SIZE);
    } catch (err) {
      console.error('Failed to load more albums:', err);
      setError(err instanceof Error ? err.message : 'Unknown error loading more albums');
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [api, currentOffset, isLoading, hasMore, sortBy]);

  // Manual refresh (useful for pull-to-refresh functionality)
  const refreshAlbums = useCallback(() => {
    setAlbums([]);
    setCurrentOffset(0);
    setHasMore(true);
    loadInitialBatch();
  }, [loadInitialBatch]);

  // Setup scroll listener
  useEffect(() => {
    const handleScroll = () => {
      // Don't trigger if already loading
      if (isLoading || !hasMore) return;

      // Check if we're near the bottom
      const scrollHeight = document.documentElement.scrollHeight;
      const currentScroll = window.innerHeight + document.documentElement.scrollTop;
      
      if (scrollHeight - currentScroll <= SCROLL_THRESHOLD) {
        loadMoreAlbums();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoading, hasMore, loadMoreAlbums]);

  return {
    albums,
    isLoading,
    hasMore,
    loadMoreAlbums,
    refreshAlbums,
    error,
    resetAndLoad: refreshAlbums // Alias for consistency
  };
}
