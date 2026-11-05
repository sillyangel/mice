'use client';

import { useState, useEffect } from 'react';
import { Album } from '@/lib/navidrome';
import { useNavidrome } from '@/app/components/NavidromeContext';

export function useRecentlyPlayedAlbums() {
  const [recentAlbums, setRecentAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const { api } = useNavidrome();

  const fetchRecentAlbums = async () => {
    if (!api) return;
    
    try {
      setLoading(true);
      const albums = await api.getAlbums('recent', 24);
      setRecentAlbums(albums.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch recent albums:', error);
      setRecentAlbums([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentAlbums();
  }, [api]);

  return {
    recentAlbums,
    loading,
    refetch: fetchRecentAlbums
  };
}
