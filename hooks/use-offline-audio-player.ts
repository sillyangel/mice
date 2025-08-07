'use client';

import { useCallback } from 'react';
import { useAudioPlayer, Track } from '@/app/components/AudioPlayerContext';
import { useOfflineDownloads } from '@/hooks/use-offline-downloads';
import { useOfflineLibrary } from '@/hooks/use-offline-library';
import { Album, Song } from '@/lib/navidrome';
import { getNavidromeAPI } from '@/lib/navidrome';

export interface OfflineTrack extends Track {
  isOffline?: boolean;
  offlineUrl?: string;
}

export function useOfflineAudioPlayer() {
  const { 
    playTrack, 
    addToQueue, 
    currentTrack, 
    ...audioPlayerProps 
  } = useAudioPlayer();
  
  const { isSupported: isOfflineSupported, checkOfflineStatus } = useOfflineDownloads();
  const { isOnline, scrobbleOffline } = useOfflineLibrary();
  
  const api = getNavidromeAPI();

  // Convert song to track with offline awareness
  const songToTrack = useCallback(async (song: Song): Promise<OfflineTrack> => {
    let track: OfflineTrack = {
      id: song.id,
      name: song.title,
      url: api?.getStreamUrl(song.id) || '',
      artist: song.artist,
      album: song.album || '',
      duration: song.duration,
      coverArt: song.coverArt ? api?.getCoverArtUrl(song.coverArt, 1200) : undefined,
      albumId: song.albumId,
      artistId: song.artistId,
      starred: !!song.starred
    };

    // Check if song is available offline
    if (isOfflineSupported) {
      const offlineStatus = await checkOfflineStatus(song.id, 'song');
      if (offlineStatus) {
        track.isOffline = true;
        track.offlineUrl = `offline-song-${song.id}`;
      }
    }

    return track;
  }, [api, isOfflineSupported, checkOfflineStatus]);

  // Play track with offline fallback
  const playTrackOffline = useCallback(async (song: Song | OfflineTrack) => {
    try {
      let track: OfflineTrack;
      
      if ('url' in song) {
        // Already a track
        track = song as OfflineTrack;
      } else {
        // Convert song to track
        track = await songToTrack(song);
      }

      // If offline and track has offline URL, use that
      if (!isOnline && track.isOffline && track.offlineUrl) {
        track.url = track.offlineUrl;
      }

      playTrack(track);
      
      // Scrobble with offline support
      scrobbleOffline(track.id);
      
    } catch (error) {
      console.error('Failed to play track:', error);
      throw error;
    }
  }, [songToTrack, playTrack, scrobbleOffline, isOnline]);

  // Play album with offline awareness
  const playAlbumOffline = useCallback(async (album: Album, songs: Song[], startIndex: number = 0) => {
    try {
      if (songs.length === 0) return;

      // Convert all songs to tracks with offline awareness
      const tracks = await Promise.all(songs.map(songToTrack));
      
      // Filter to only available tracks (online or offline)
      const availableTracks = tracks.filter((track: OfflineTrack) => {
        if (isOnline) return true; // All tracks available when online
        return track.isOffline; // Only offline tracks when offline
      });

      if (availableTracks.length === 0) {
        throw new Error('No tracks available for playback');
      }

      // Adjust start index if needed
      const safeStartIndex = Math.min(startIndex, availableTracks.length - 1);
      
      // Play first track
      playTrack(availableTracks[safeStartIndex]);
      
      // Add remaining tracks to queue
      const remainingTracks = [
        ...availableTracks.slice(safeStartIndex + 1),
        ...availableTracks.slice(0, safeStartIndex)
      ];
      
      remainingTracks.forEach(track => addToQueue(track));
      
      // Scrobble first track
      scrobbleOffline(availableTracks[safeStartIndex].id);
      
    } catch (error) {
      console.error('Failed to play album offline:', error);
      throw error;
    }
  }, [songToTrack, playTrack, addToQueue, scrobbleOffline, isOnline]);

  // Add track to queue with offline awareness
  const addToQueueOffline = useCallback(async (song: Song | OfflineTrack) => {
    try {
      let track: OfflineTrack;
      
      if ('url' in song) {
        track = song as OfflineTrack;
      } else {
        track = await songToTrack(song);
      }

      // Check if track is available
      if (!isOnline && !track.isOffline) {
        throw new Error('Track not available offline');
      }

      // If offline and track has offline URL, use that
      if (!isOnline && track.isOffline && track.offlineUrl) {
        track.url = track.offlineUrl;
      }

      addToQueue(track);
      
    } catch (error) {
      console.error('Failed to add track to queue:', error);
      throw error;
    }
  }, [songToTrack, addToQueue, isOnline]);

  // Shuffle play with offline awareness
  const shufflePlayOffline = useCallback(async (songs: Song[]) => {
    try {
      if (songs.length === 0) return;

      // Convert all songs to tracks
      const tracks = await Promise.all(songs.map(songToTrack));
      
      // Filter available tracks
      const availableTracks = tracks.filter((track: OfflineTrack) => {
        if (isOnline) return true;
        return track.isOffline;
      });

      if (availableTracks.length === 0) {
        throw new Error('No tracks available for shuffle play');
      }

      // Shuffle the available tracks
      const shuffledTracks = [...availableTracks].sort(() => Math.random() - 0.5);
      
      // Play first track
      playTrack(shuffledTracks[0]);
      
      // Add remaining tracks to queue
      shuffledTracks.slice(1).forEach(track => addToQueue(track));
      
      // Scrobble first track
      scrobbleOffline(shuffledTracks[0].id);
      
    } catch (error) {
      console.error('Failed to shuffle play offline:', error);
      throw error;
    }
  }, [songToTrack, playTrack, addToQueue, scrobbleOffline, isOnline]);

  // Get availability info for a song
  const getTrackAvailability = useCallback(async (song: Song): Promise<{
    isAvailable: boolean;
    isOffline: boolean;
    requiresConnection: boolean;
  }> => {
    try {
      const track = await songToTrack(song);
      
      return {
        isAvailable: isOnline || !!track.isOffline,
        isOffline: !!track.isOffline,
        requiresConnection: !track.isOffline
      };
    } catch (error) {
      console.error('Failed to check track availability:', error);
      return {
        isAvailable: false,
        isOffline: false,
        requiresConnection: true
      };
    }
  }, [songToTrack, isOnline]);

  // Get album availability info
  const getAlbumAvailability = useCallback(async (songs: Song[]): Promise<{
    totalTracks: number;
    availableTracks: number;
    offlineTracks: number;
    onlineOnlyTracks: number;
  }> => {
    try {
      const tracks = await Promise.all(songs.map(songToTrack));
      
      const offlineTracks = tracks.filter((t: OfflineTrack) => t.isOffline).length;
      const onlineOnlyTracks = tracks.filter((t: OfflineTrack) => !t.isOffline).length;
      const availableTracks = isOnline ? tracks.length : offlineTracks;
      
      return {
        totalTracks: tracks.length,
        availableTracks,
        offlineTracks,
        onlineOnlyTracks
      };
    } catch (error) {
      console.error('Failed to check album availability:', error);
      return {
        totalTracks: songs.length,
        availableTracks: 0,
        offlineTracks: 0,
        onlineOnlyTracks: songs.length
      };
    }
  }, [songToTrack, isOnline]);

  // Enhanced track info with offline status
  const getCurrentTrackInfo = useCallback(() => {
    if (!currentTrack) return null;
    
    const offlineTrack = currentTrack as OfflineTrack;
    
    return {
      ...currentTrack,
      isAvailableOffline: offlineTrack.isOffline || false,
      isPlayingOffline: !isOnline && !!offlineTrack.isOffline
    };
  }, [currentTrack, isOnline]);

  return {
    // Original audio player props
    ...audioPlayerProps,
    currentTrack,
    
    // Enhanced offline methods
    playTrackOffline,
    playAlbumOffline,
    addToQueueOffline,
    shufflePlayOffline,
    
    // Utility methods
    songToTrack,
    getTrackAvailability,
    getAlbumAvailability,
    getCurrentTrackInfo,
    
    // State
    isOnline,
    isOfflineSupported
  };
}
