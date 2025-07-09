'use client';

import { useState, useEffect } from 'react';
import { useNavidrome } from '@/app/components/NavidromeContext';

export interface FavoriteAlbum {
  id: string;
  name: string;
  artist: string;
  coverArt?: string;
}

export function useFavoriteAlbums() {
  const [favoriteAlbums, setFavoriteAlbums] = useState<FavoriteAlbum[]>([]);
  const { api } = useNavidrome();

  // Load favorite albums from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('favorite-albums');
    if (saved) {
      try {
        setFavoriteAlbums(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse favorite albums:', error);
      }
    }
  }, []);

  // Save to localStorage when favorites change
  useEffect(() => {
    localStorage.setItem('favorite-albums', JSON.stringify(favoriteAlbums));
  }, [favoriteAlbums]);

  const addFavoriteAlbum = (album: FavoriteAlbum) => {
    setFavoriteAlbums(prev => {
      const exists = prev.some(fav => fav.id === album.id);
      if (exists) return prev;
      return [...prev, album].slice(0, 10); // Keep only 10 favorites
    });
  };

  const removeFavoriteAlbum = (albumId: string) => {
    setFavoriteAlbums(prev => prev.filter(fav => fav.id !== albumId));
  };

  const isFavoriteAlbum = (albumId: string) => {
    return favoriteAlbums.some(fav => fav.id === albumId);
  };

  const toggleFavoriteAlbum = async (albumId: string) => {
    if (!api) return;
    
    try {
      if (isFavoriteAlbum(albumId)) {
        removeFavoriteAlbum(albumId);
      } else {
        // Fetch album details to add to favorites
        const { album } = await api.getAlbum(albumId);
        const favoriteAlbum: FavoriteAlbum = {
          id: album.id,
          name: album.name,
          artist: album.artist,
          coverArt: album.coverArt ? api.getCoverArtUrl(album.coverArt, 64) : undefined
        };
        addFavoriteAlbum(favoriteAlbum);
      }
    } catch (error) {
      console.error('Failed to toggle favorite album:', error);
    }
  };

  return {
    favoriteAlbums,
    addFavoriteAlbum,
    removeFavoriteAlbum,
    isFavoriteAlbum,
    toggleFavoriteAlbum
  };
}
