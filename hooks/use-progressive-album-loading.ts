'use client';

import { useState, useEffect, useCallback } from 'react';
import { Album } from '@/lib/navidrome';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { useOfflineNavidrome } from '@/app/components/OfflineNavidromeProvider';
import { useOfflineLibrary } from '@/hooks/use-offline-library';

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
  const offlineApi = useOfflineNavidrome();
  const offlineLibrary = useOfflineLibrary();
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

  // We'll define the scroll listener after defining loadMoreAlbums

  // Load initial batch of albums
  const loadInitialBatch = useCallback(async () => {
    if (!api && !offlineLibrary.isInitialized) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let albumData: Album[] = [];
      
      // Try offline-first approach
      if (offlineLibrary.isInitialized) {
        try {
          // For starred albums, use the starred parameter
          if (sortBy === 'starred') {
            albumData = await offlineApi.getAlbums(true);
          } else {
            albumData = await offlineApi.getAlbums(false);
            
            // Apply client-side sorting since offline API might not support all sort options
            if (sortBy === 'newest') {
              albumData.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
            } else if (sortBy === 'alphabeticalByArtist') {
              albumData.sort((a, b) => a.artist.localeCompare(b.artist));
            } else if (sortBy === 'alphabeticalByName') {
              albumData.sort((a, b) => a.name.localeCompare(b.name));
            } else if (sortBy === 'recent') {
              // Sort by recently played - if we have timestamps
              const recentlyPlayedMap = new Map<string, number>();
              const recentlyPlayed = localStorage.getItem('recently-played-albums');
              if (recentlyPlayed) {
                try {
                  const parsed = JSON.parse(recentlyPlayed);
                  Object.entries(parsed).forEach(([id, timestamp]) => {
                    recentlyPlayedMap.set(id, timestamp as number);
                  });
                  albumData.sort((a, b) => {
                    const timestampA = recentlyPlayedMap.get(a.id) || 0;
                    const timestampB = recentlyPlayedMap.get(b.id) || 0;
                    return timestampB - timestampA;
                  });
                } catch (error) {
                  console.error('Error parsing recently played albums:', error);
                }
              }
            }
          }
          
          // If we got albums offline and it's non-empty, use that
          if (albumData && albumData.length > 0) {
            // Just take the initial batch for consistent behavior
            const initialBatch = albumData.slice(0, INITIAL_BATCH_SIZE);
            setAlbums(initialBatch);
            setCurrentOffset(initialBatch.length);
            setHasMore(albumData.length > initialBatch.length);
            setIsLoading(false);
            return;
          }
        } catch (offlineError) {
          console.error('Error loading albums from offline storage:', offlineError);
          // Continue to online API as fallback
        }
      }
      
      // Fall back to online API if needed
      if (api) {
        albumData = await api.getAlbums(sortBy, INITIAL_BATCH_SIZE, 0);
        setAlbums(albumData);
        setCurrentOffset(albumData.length);
        // Assume there are more unless we got fewer than we asked for
        setHasMore(albumData.length >= INITIAL_BATCH_SIZE);
      } else {
        // No API available
        setAlbums([]);
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load initial albums batch:', err);
      setError(err instanceof Error ? err.message : 'Unknown error loading albums');
      setAlbums([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [api, offlineApi, offlineLibrary, sortBy]);

  // Load more albums when scrolling
  const loadMoreAlbums = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    
    try {
      let newAlbums: Album[] = [];
      
      // Try offline-first approach (if we already have offline data)
      if (offlineLibrary.isInitialized && albums.length > 0) {
        try {
          // For starred albums, use the starred parameter
          let allAlbums: Album[] = [];
          if (sortBy === 'starred') {
            allAlbums = await offlineApi.getAlbums(true);
          } else {
            allAlbums = await offlineApi.getAlbums(false);
            
            // Apply client-side sorting
            if (sortBy === 'newest') {
              allAlbums.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
            } else if (sortBy === 'alphabeticalByArtist') {
              allAlbums.sort((a, b) => a.artist.localeCompare(b.artist));
            } else if (sortBy === 'alphabeticalByName') {
              allAlbums.sort((a, b) => a.name.localeCompare(b.name));
            } else if (sortBy === 'recent') {
              // Sort by recently played - if we have timestamps
              const recentlyPlayedMap = new Map<string, number>();
              const recentlyPlayed = localStorage.getItem('recently-played-albums');
              if (recentlyPlayed) {
                try {
                  const parsed = JSON.parse(recentlyPlayed);
                  Object.entries(parsed).forEach(([id, timestamp]) => {
                    recentlyPlayedMap.set(id, timestamp as number);
                  });
                  allAlbums.sort((a, b) => {
                    const timestampA = recentlyPlayedMap.get(a.id) || 0;
                    const timestampB = recentlyPlayedMap.get(b.id) || 0;
                    return timestampB - timestampA;
                  });
                } catch (error) {
                  console.error('Error parsing recently played albums:', error);
                }
              }
            }
          }
          
          // Slice the next batch from the offline data
          if (allAlbums && allAlbums.length > currentOffset) {
            newAlbums = allAlbums.slice(currentOffset, currentOffset + BATCH_SIZE);
            setAlbums(prev => [...prev, ...newAlbums]);
            setCurrentOffset(currentOffset + newAlbums.length);
            setHasMore(allAlbums.length > currentOffset + newAlbums.length);
            setIsLoading(false);
            return;
          }
        } catch (offlineError) {
          console.error('Error loading more albums from offline storage:', offlineError);
          // Continue to online API as fallback
        }
      }
      
      // Fall back to online API
      if (api) {
        newAlbums = await api.getAlbums(sortBy, BATCH_SIZE, currentOffset);
        setAlbums(prev => [...prev, ...newAlbums]);
        setCurrentOffset(currentOffset + newAlbums.length);
        // If we get fewer albums than we asked for, we've reached the end
        setHasMore(newAlbums.length >= BATCH_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load more albums:', err);
      setError(err instanceof Error ? err.message : 'Unknown error loading more albums');
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [api, offlineApi, offlineLibrary, albums, currentOffset, isLoading, hasMore, sortBy]);

  // Manual refresh (useful for pull-to-refresh functionality)
  const refreshAlbums = useCallback(() => {
    setAlbums([]);
    setCurrentOffset(0);
    setHasMore(true);
    loadInitialBatch();
  }, [loadInitialBatch]);

  // Setup scroll listener after function declarations
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
  }, [isLoading, hasMore, currentOffset, loadMoreAlbums]);

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
