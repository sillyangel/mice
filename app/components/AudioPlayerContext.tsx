'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Song, Album, Artist } from '@/lib/navidrome';
import { getNavidromeAPI } from '@/lib/navidrome';
import { useToast } from "@/hooks/use-toast";

interface Track {
  id: string;
  name: string;
  url: string;
  artist: string;
  album: string;
  duration: number;
  coverArt?: string;
  albumId: string;
  artistId: string;
}

interface AudioPlayerContextProps {
  currentTrack: Track | null;
  playTrack: (track: Track) => void;
  queue: Track[];
  addToQueue: (track: Track) => void;
  playNextTrack: () => void;
  clearQueue: () => void;
  addAlbumToQueue: (albumId: string) => Promise<void>;
  playAlbum: (albumId: string) => Promise<void>;
  playAlbumFromTrack: (albumId: string, startingSongId: string) => Promise<void>;
  removeTrackFromQueue: (index: number) => void;
  skipToTrackInQueue: (index: number) => void;
  addArtistToQueue: (artistId: string) => Promise<void>;
  playPreviousTrack: () => void;
  isLoading: boolean;
}

const AudioPlayerContext = createContext<AudioPlayerContextProps | undefined>(undefined);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [playedTracks, setPlayedTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const api = useMemo(() => getNavidromeAPI(), []);

  useEffect(() => {
    const savedQueue = localStorage.getItem('navidrome-audioQueue');
    if (savedQueue) {
      try {
        setQueue(JSON.parse(savedQueue));
      } catch (error) {
        console.error('Failed to parse saved queue:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('navidrome-audioQueue', JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    const savedCurrentTrack = localStorage.getItem('navidrome-currentTrack');
    if (savedCurrentTrack) {
      try {
        setCurrentTrack(JSON.parse(savedCurrentTrack));
      } catch (error) {
        console.error('Failed to parse saved current track:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (currentTrack) {
      localStorage.setItem('navidrome-currentTrack', JSON.stringify(currentTrack));
    } else {
      localStorage.removeItem('navidrome-currentTrack');
    }
  }, [currentTrack]);

  const songToTrack = useMemo(() => (song: Song): Track => {
    return {
      id: song.id,
      name: song.title,
      url: api.getStreamUrl(song.id),
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      coverArt: song.coverArt ? api.getCoverArtUrl(song.coverArt, 300) : undefined,
      albumId: song.albumId,
      artistId: song.artistId
    };
  }, [api]);

  const playTrack = useCallback((track: Track) => {
    // Clear saved timestamp when manually playing a track
    localStorage.removeItem('navidrome-current-track-time');
    
    if (currentTrack) {
      setPlayedTracks((prev) => [...prev, currentTrack]);
    }
    setCurrentTrack(track);
    
    // Scrobble the track
    api.scrobble(track.id).catch(error => {
      console.error('Failed to scrobble track:', error);
    });
  }, [currentTrack, api]);

  const addToQueue = useCallback((track: Track) => {
    setQueue((prevQueue) => [...prevQueue, track]);
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const removeTrackFromQueue = useCallback((index: number) => {
    setQueue((prevQueue) => prevQueue.filter((_, i) => i !== index));
  }, []);

  const playNextTrack = useCallback(() => {
    // Clear saved timestamp when changing tracks
    localStorage.removeItem('navidrome-current-track-time');
    
    if (queue.length > 0) {
      const nextTrack = queue[0];
      setQueue((prevQueue) => prevQueue.slice(1));
      playTrack(nextTrack);
    }
  }, [queue, playTrack]);

  const playPreviousTrack = useCallback(() => {
    // Clear saved timestamp when changing tracks  
    localStorage.removeItem('navidrome-current-track-time');
    
    if (playedTracks.length > 0) {
      const previousTrack = playedTracks[playedTracks.length - 1];
      setPlayedTracks((prevPlayedTracks) => prevPlayedTracks.slice(0, -1));
      
      // Add current track back to beginning of queue
      if (currentTrack) {
        setQueue((prevQueue) => [currentTrack, ...prevQueue]);
      }
      
      setCurrentTrack(previousTrack);
    }
  }, [playedTracks, currentTrack]);

  const addAlbumToQueue = useCallback(async (albumId: string) => {
    setIsLoading(true);
    try {
      const { album, songs } = await api.getAlbum(albumId);
      const tracks = songs.map(songToTrack);
      setQueue((prevQueue) => [...prevQueue, ...tracks]);
      
      toast({
        title: "Album Added",
        description: `Added "${album.name}" to queue`,
      });
    } catch (error) {
      console.error('Failed to add album to queue:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add album to queue",
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, songToTrack, toast]);

  const addArtistToQueue = useCallback(async (artistId: string) => {
    setIsLoading(true);
    try {
      const { artist, albums } = await api.getArtist(artistId);
      
      // Add all albums from this artist to queue
      for (const album of albums) {
        const { songs } = await api.getAlbum(album.id);
        const tracks = songs.map(songToTrack);
        setQueue((prevQueue) => [...prevQueue, ...tracks]);
      }
      
      toast({
        title: "Artist Added",
        description: `Added all albums by "${artist.name}" to queue`,
      });
    } catch (error) {
      console.error('Failed to add artist to queue:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add artist to queue",
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, songToTrack, toast]);
  const playAlbum = useCallback(async (albumId: string) => {
    setIsLoading(true);
    try {
      const { album, songs } = await api.getAlbum(albumId);
      const tracks = songs.map(songToTrack);
      
      // Clear the queue and set the new tracks
      setQueue(tracks.slice(1)); // All tracks except the first one
      
      // Play the first track immediately
      if (tracks.length > 0) {
        playTrack(tracks[0]);
      }
      
      toast({
        title: "Playing Album",
        description: `Now playing "${album.name}"`,
      });
    } catch (error) {
      console.error('Failed to play album:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to play album",
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, playTrack, songToTrack, toast]);

  const playAlbumFromTrack = useCallback(async (albumId: string, startingSongId: string) => {
    setIsLoading(true);
    try {
      const { album, songs } = await api.getAlbum(albumId);
      const tracks = songs.map(songToTrack);
      
      // Find the starting track index
      const startingIndex = tracks.findIndex(track => track.id === startingSongId);
      
      if (startingIndex === -1) {
        throw new Error('Starting song not found in album');
      }
      
      // Clear the queue and set the remaining tracks after the starting track
      setQueue(tracks.slice(startingIndex + 1));
      
      // Play the starting track immediately
      playTrack(tracks[startingIndex]);
      
      toast({
        title: "Playing Album",
        description: `Playing "${album.name}" from "${tracks[startingIndex].name}"`,
      });
    } catch (error) {
      console.error('Failed to play album from track:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to play album from selected track",
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, playTrack, songToTrack, toast]);

  const skipToTrackInQueue = useCallback((index: number) => {
    if (index >= 0 && index < queue.length) {
      const targetTrack = queue[index];
      // Remove all tracks before the target track (including the target track)
      setQueue((prevQueue) => prevQueue.slice(index + 1));
      // Play the target track
      playTrack(targetTrack);
    }
  }, [queue, playTrack]);

  const contextValue = useMemo(() => ({
    currentTrack, 
    playTrack, 
    queue, 
    addToQueue, 
    playNextTrack, 
    clearQueue, 
    addAlbumToQueue, 
    removeTrackFromQueue, 
    addArtistToQueue, 
    playPreviousTrack,
    isLoading,
    playAlbum,
    playAlbumFromTrack,
    skipToTrackInQueue
  }), [
    currentTrack, 
    queue, 
    isLoading, 
    playTrack, 
    addToQueue, 
    playNextTrack, 
    clearQueue, 
    addAlbumToQueue, 
    removeTrackFromQueue, 
    addArtistToQueue, 
    playPreviousTrack,
    playAlbum,
    playAlbumFromTrack,
    skipToTrackInQueue
  ]);

  return (
    <AudioPlayerContext.Provider value={contextValue}>
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};