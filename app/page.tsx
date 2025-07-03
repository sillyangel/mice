'use client';

import { ScrollArea, ScrollBar } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent } from '../components/ui/tabs';
import { AlbumArtwork } from './components/album-artwork';
import { useNavidrome } from './components/NavidromeContext';
import { useEffect, useState } from 'react';
import { Album } from '@/lib/navidrome';
import { useNavidromeConfig } from './components/NavidromeConfigContext';
import { useSearchParams } from 'next/navigation';
import { useAudioPlayer } from './components/AudioPlayerContext';

type TimeOfDay = 'morning' | 'afternoon' | 'evening';
export default function MusicPage() {
  const { albums, isLoading, api, isConnected } = useNavidrome();
  const { playAlbum, playTrack, shuffle, toggleShuffle, addToQueue } = useAudioPlayer();
  const searchParams = useSearchParams();
  const [recentAlbums, setRecentAlbums] = useState<Album[]>([]);
  const [newestAlbums, setNewestAlbums] = useState<Album[]>([]);
  const [favoriteAlbums, setFavoriteAlbums] = useState<Album[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [shortcutProcessed, setShortcutProcessed] = useState(false);

  useEffect(() => {
    if (albums.length > 0) {
      // Split albums into recent and newest for display
      const recent = albums.slice(0, Math.ceil(albums.length / 2));
      const newest = albums.slice(Math.ceil(albums.length / 2));
      setRecentAlbums(recent);
      setNewestAlbums(newest);
    }
  }, [albums]);

  useEffect(() => {
    const loadFavoriteAlbums = async () => {
      if (!api || !isConnected) return;
      
      setFavoritesLoading(true);
      try {
        const starredAlbums = await api.getAlbums('starred', 20); // Limit to 20 for homepage
        setFavoriteAlbums(starredAlbums);
      } catch (error) {
        console.error('Failed to load favorite albums:', error);
      } finally {
        setFavoritesLoading(false);
      }
    };

    loadFavoriteAlbums();
  }, [api, isConnected]);

  // Handle PWA shortcuts
  useEffect(() => {
    const action = searchParams.get('action');
    if (!action || shortcutProcessed || !api || !isConnected) return;

    const handleShortcuts = async () => {
      try {
        switch (action) {
          case 'resume':
            // Try to resume from localStorage or play a recent track
            const lastTrack = localStorage.getItem('lastPlayedTrack');
            if (lastTrack) {
              const trackData = JSON.parse(lastTrack);
              await playTrack(trackData);
            } else if (recentAlbums.length > 0) {
              // Fallback: play first track from most recent album
              await playAlbum(recentAlbums[0].id);
            }
            break;

          case 'recent':
            if (recentAlbums.length > 0) {
              // Get the 10 most recent albums and shuffle them
              const tenRecentAlbums = recentAlbums.slice(0, 10);
              const shuffledAlbums = [...tenRecentAlbums].sort(() => Math.random() - 0.5);
              
              // Enable shuffle if not already on
              if (!shuffle) {
                toggleShuffle();
              }
              
              // Play first album and add remaining albums to queue
              await playAlbum(shuffledAlbums[0].id);
              
              // Add remaining albums to queue
              for (let i = 1; i < shuffledAlbums.length; i++) {
                try {
                  const albumSongs = await api.getAlbumSongs(shuffledAlbums[i].id);
                  albumSongs.forEach(song => {
                    addToQueue({
                      id: song.id,
                      name: song.title,
                      url: api.getStreamUrl(song.id),
                      artist: song.artist || 'Unknown Artist',
                      artistId: song.artistId || '',
                      album: song.album || 'Unknown Album',
                      albumId: song.parent,
                      duration: song.duration || 0,
                      coverArt: song.coverArt,
                      starred: !!song.starred
                    });
                  });
                } catch (error) {
                  console.error('Failed to load album tracks:', error);
                }
              }
            }
            break;

          case 'shuffle-favorites':
            if (favoriteAlbums.length > 0) {
              // Shuffle all favorite albums
              const shuffledFavorites = [...favoriteAlbums].sort(() => Math.random() - 0.5);
              
              // Enable shuffle if not already on
              if (!shuffle) {
                toggleShuffle();
              }
              
              // Play first album and add remaining albums to queue
              await playAlbum(shuffledFavorites[0].id);
              
              // Add remaining albums to queue
              for (let i = 1; i < shuffledFavorites.length; i++) {
                try {
                  const albumSongs = await api.getAlbumSongs(shuffledFavorites[i].id);
                  albumSongs.forEach(song => {
                    addToQueue({
                      id: song.id,
                      name: song.title,
                      url: api.getStreamUrl(song.id),
                      artist: song.artist || 'Unknown Artist',
                      artistId: song.artistId || '',
                      album: song.album || 'Unknown Album',
                      albumId: song.parent,
                      duration: song.duration || 0,
                      coverArt: song.coverArt,
                      starred: !!song.starred
                    });
                  });
                } catch (error) {
                  console.error('Failed to load album tracks:', error);
                }
              }
            }
            break;
        }
        setShortcutProcessed(true);
      } catch (error) {
        console.error('Failed to handle PWA shortcut:', error);
      }
    };

    // Delay to ensure data is loaded
    const timeout = setTimeout(handleShortcuts, 1000);
    return () => clearTimeout(timeout);
  }, [searchParams, api, isConnected, recentAlbums, favoriteAlbums, shortcutProcessed, playAlbum, playTrack, shuffle, toggleShuffle, addToQueue]);

  // Get greeting and time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : 'Good afternoon';
  let timeOfDay: TimeOfDay;
  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning';
  } else if (hour >= 12 && hour < 18) {
    timeOfDay = 'afternoon';
  } else {
    timeOfDay = 'evening';
  }


  // Try to get user name from navidrome context, fallback to 'user'
  let userName = '';
  // If you add user info to NavidromeContext, update this logic
  const { config } = useNavidromeConfig();
  if (config && config.username) {
    userName = config.username;
  }


  return (
    <div className="container mx-auto p-6 pb-24 max-w-none">
      <div className="relative rounded-lg p-8">
          <div className="relative rounded-sm p-10">
            <div
              className="absolute inset-0 bg-center bg-cover bg-no-repeat blur-xl bg-linear-to-r from-primary to-secondary"
 style={{
                backgroundImage:
 timeOfDay === 'morning'
 ? 'linear-gradient(to right, #ff9a9e, #fad0c4, #fad0c4)' // Warm tones for morning
 : timeOfDay === 'evening'
 ? 'linear-gradient(to right, #a18cd1, #fbc2eb)' // Cool tones for evening
 : 'linear-gradient(to right, #a8edea, #fed6e3)', // Default/afternoon colors
 }} />
            <div className="relative z-10 flex items-center space-x-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-4">{greeting}{userName ? `, ${userName}` : ''}!</h1>
              </div>
          </div>
        </div>
       </div>
      <>
      <Tabs defaultValue="music" className="h-full space-y-6">
        <TabsContent value="music" className="border-none p-0 outline-hidden">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight">
                Recently Played
              </p>
              <p className="text-sm text-muted-foreground">
                Albums you&apos;ve listened to recently.
              </p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="relative">
            <ScrollArea>
              <div className="flex space-x-4 pb-4">
                {isLoading ? (
                  // Loading skeletons
                  Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="w-[220px] h-[320px] bg-muted animate-pulse rounded-md shrink-0" />
                  ))
                ) : (
                  recentAlbums.map((album) => (
                    <AlbumArtwork
                      key={album.id}
                      album={album}
                      className="w-[220px] shrink-0"
                      aspectRatio="square"
                      width={220}
                      height={220}
                    />
                  ))
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
          
          {/* Favorite Albums Section */}
          {favoriteAlbums.length > 0 && (
            <>
              <div className="mt-6 space-y-1">
                <p className="text-2xl font-semibold tracking-tight">
                  Favorite Albums
                </p>
                <p className="text-sm text-muted-foreground">
                  Your starred albums collection.
                </p>
              </div>
              <Separator className="my-4" />
              <div className="relative">
                <ScrollArea>
                  <div className="flex space-x-4 pb-4">
                    {favoritesLoading ? (
                      // Loading skeletons
                      Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="w-[220px] h-[320px] bg-muted animate-pulse rounded-md shrink-0" />
                      ))
                    ) : (
                      favoriteAlbums.map((album) => (
                        <AlbumArtwork
                          key={album.id}
                          album={album}
                          className="w-[220px] shrink-0"
                          aspectRatio="square"
                          width={220}
                          height={220}
                        />
                      ))
                    )}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            </>
          )}
          
          <div className="mt-6 space-y-1">
            <p className="text-2xl font-semibold tracking-tight">
              Your Library
            </p>
            <p className="text-sm text-muted-foreground">
              Albums from your music collection.
            </p>
          </div>
          <Separator className="my-4" />
          <div className="relative">
            <ScrollArea>
            <div className="flex space-x-4 pb-4">
            {isLoading ? (
                  // Loading skeletons
                  Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="w-[220px] h-[320px] bg-muted animate-pulse rounded-md shrink-0" />
                  ))
                ) : (
                  newestAlbums.map((album) => (
                    <AlbumArtwork
                      key={album.id}
                      album={album}
                      className="w-[220px] shrink-0"
                      aspectRatio="square"
                      width={220}
                      height={220}
                    />
                  ))
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
      </>
    </div>
  );
}