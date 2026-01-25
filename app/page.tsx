'use client';

import { ScrollArea, ScrollBar } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent } from '../components/ui/tabs';
import { AlbumArtwork } from './components/album-artwork';
import { useNavidrome } from './components/NavidromeContext';
import { useEffect, useState, Suspense } from 'react';
import { Album, Song, getNavidromeAPI } from '@/lib/navidrome';
import { useNavidromeConfig } from './components/NavidromeConfigContext';
import { useSearchParams } from 'next/navigation';
import { useAudioPlayer } from './components/AudioPlayerContext';
import { SongRecommendations } from './components/SongRecommendations';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { UserProfile } from './components/UserProfile';
import CompactListeningStreak from './components/CompactListeningStreak';

type TimeOfDay = 'morning' | 'afternoon' | 'evening';

function MusicPageContent() {
  const { api } = useNavidrome();
  const { playAlbum, playTrack, shuffle, toggleShuffle, addToQueue } = useAudioPlayer();
  const searchParams = useSearchParams();
  const [allAlbums, setAllAlbums] = useState<Album[]>([]);
  const [recentAlbums, setRecentAlbums] = useState<Album[]>([]);
  const [newestAlbums, setNewestAlbums] = useState<Album[]>([]);
  const [favoriteAlbums, setFavoriteAlbums] = useState<Album[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [shortcutProcessed, setShortcutProcessed] = useState(false);
  const isMobile = useIsMobile();

  // Load albums
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!api) return;
      setAlbumsLoading(true);
      try {
        const list = await api.getAlbums('newest', 500);
        if (!mounted) return;
        setAllAlbums(list || []);
        // Split albums into two sections
        const recent = list.slice(0, Math.ceil(list.length / 2));
        const newest = list.slice(Math.ceil(list.length / 2));
        setRecentAlbums(recent);
        setNewestAlbums(newest);
      } catch (e) {
        console.error('Failed to load albums:', e);
        if (mounted) {
          setAllAlbums([]);
          setRecentAlbums([]);
          setNewestAlbums([]);
        }
      } finally {
        if (mounted) setAlbumsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [api]);

  useEffect(() => {
    let mounted = true;
    const loadFavoriteAlbums = async () => {
      if (!api) return;
      setFavoritesLoading(true);
      try {
        const starred = await api.getAlbums('starred', 20);
        if (mounted) setFavoriteAlbums(starred || []);
      } catch (error) {
        console.error('Failed to load favorite albums:', error);
        if (mounted) setFavoriteAlbums([]);
      } finally {
        if (mounted) setFavoritesLoading(false);
      }
    };
    loadFavoriteAlbums();
    return () => { mounted = false; };
  }, [api]);

  // Handle PWA shortcuts
  useEffect(() => {
    const action = searchParams.get('action');
    if (!action || shortcutProcessed) return;

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
              const navidromeApi = getNavidromeAPI();
              if (navidromeApi) {
                for (let i = 1; i < shuffledAlbums.length; i++) {
                  try {
                    const songs = await navidromeApi.getAlbumSongs(shuffledAlbums[i].id);
                    songs.forEach((song: Song) => {
                      addToQueue({
                        id: song.id,
                        name: song.title,
                        url: navidromeApi.getStreamUrl(song.id),
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
              const navidromeApiFav = getNavidromeAPI();
              if (navidromeApiFav) {
                for (let i = 1; i < shuffledFavorites.length; i++) {
                  try {
                    const songs = await navidromeApiFav.getAlbumSongs(shuffledFavorites[i].id);
                    songs.forEach((song: Song) => {
                      addToQueue({
                        id: song.id,
                        name: song.title,
                        url: navidromeApiFav.getStreamUrl(song.id),
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
  }, [searchParams, recentAlbums, favoriteAlbums, shortcutProcessed, playAlbum, playTrack, shuffle, toggleShuffle, addToQueue]);

  // Try to get user name from navidrome context, fallback to 'user'
  let userName = '';
  // If you add user info to NavidromeContext, update this logic
  const { config } = useNavidromeConfig();
  if (config && config.username) {
    userName = config.username;
  }


  return (
    <div className="p-6 pb-24 w-full">
      {/* Connection status (offline indicator) */}

      {/* Song Recommendations Section */}
      <div className="mb-8">
        <SongRecommendations userName={userName} />
      </div>
            
      {/* Listening Streak Section - Only shown when 3+ days streak */}
      <div className="mb-6">
        <CompactListeningStreak />
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
                {albumsLoading ? (
                  // Loading skeletons
                  Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="w-[220px] shrink-0 space-y-3">
                      <Skeleton className="aspect-square w-full" />
                      <div className="space-y-2 p-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
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
                        <div key={i} className="w-[220px] shrink-0 space-y-3">
                          <Skeleton className="aspect-square w-full" />
                          <div className="space-y-2 p-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                            <Skeleton className="h-3 w-2/3" />
                          </div>
                        </div>
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
            {albumsLoading ? (
                  // Loading skeletons
                  Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="w-[220px] shrink-0 space-y-3">
                      <Skeleton className="aspect-square w-full" />
                      <div className="space-y-2 p-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
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

export default function MusicPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <MusicPageContent />
    </Suspense>
  );
}