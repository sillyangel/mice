'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Song, Album, Artist } from '@/lib/navidrome';
import { getNavidromeAPI } from '@/lib/navidrome';
import { useToast } from "@/hooks/use-toast";

export interface Track {
  id: string;
  name: string;
  url: string;
  artist: string;
  album: string;
  duration: number;
  coverArt?: string;
  albumId: string;
  artistId: string;
  autoPlay?: boolean; // Flag to control auto-play
}

interface AudioPlayerContextProps {
  currentTrack: Track | null;
  playTrack: (track: Track, autoPlay?: boolean) => void;
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
  shuffle: boolean;
  toggleShuffle: () => void;
  shuffleAllAlbums: () => Promise<void>;
  playArtist: (artistId: string) => Promise<void>;
}

const AudioPlayerContext = createContext<AudioPlayerContextProps | undefined>(undefined);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [playedTracks, setPlayedTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [shuffle, setShuffle] = useState(false);
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
        const track = JSON.parse(savedCurrentTrack);
        // Clear autoPlay flag when loading from localStorage to prevent auto-play on refresh
        track.autoPlay = false;
        setCurrentTrack(track);
      } catch (error) {
        console.error('Failed to parse saved current track:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (currentTrack) {
      // Remove autoPlay flag when saving to localStorage
      const { autoPlay, ...trackToSave } = currentTrack;
      localStorage.setItem('navidrome-currentTrack', JSON.stringify(trackToSave));
    } else {
      localStorage.removeItem('navidrome-currentTrack');
    }
  }, [currentTrack]);

  const songToTrack = useMemo(() => (song: Song): Track => {
    if (!api) {
      throw new Error('Navidrome API not configured');
    }
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

  const playTrack = useCallback((track: Track, autoPlay: boolean = false) => {
    // Clear saved timestamp when manually playing a track
    localStorage.removeItem('navidrome-current-track-time');
    
    if (currentTrack) {
      setPlayedTracks((prev) => [...prev, currentTrack]);
    }
    
    // Set autoPlay flag on the track
    const trackWithAutoPlay = { ...track, autoPlay };
    setCurrentTrack(trackWithAutoPlay);
    
    // Scrobble the track if API is available
    if (api) {
      api.scrobble(track.id).catch(error => {
        console.error('Failed to scrobble track:', error);
      });
    }
  }, [currentTrack, api]);

  const addToQueue = useCallback((track: Track) => {
    setQueue((prevQueue) => {
      if (shuffle && prevQueue.length > 0) {
        // If shuffle is enabled, insert the track at a random position
        const randomIndex = Math.floor(Math.random() * (prevQueue.length + 1));
        const newQueue = [...prevQueue];
        newQueue.splice(randomIndex, 0, track);
        return newQueue;
      } else {
        // Normal behavior: add to the end
        return [...prevQueue, track];
      }
    });
  }, [shuffle]);

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
      // Always pick the first track from the queue
      // If shuffle is enabled, the queue will already be shuffled
      const nextTrack = queue[0];
      setQueue((prevQueue) => prevQueue.slice(1));
      playTrack(nextTrack, true); // Auto-play next track
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
      
      playTrack(previousTrack, true); // Auto-play previous track
    }
  }, [playedTracks, currentTrack, playTrack]);

  const addAlbumToQueue = useCallback(async (albumId: string) => {
    if (!api) {
      toast({
        variant: "destructive",
        title: "Configuration Required",
        description: "Please configure Navidrome connection in settings",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { album, songs } = await api.getAlbum(albumId);
      const tracks = songs.map(songToTrack);
      
      setQueue((prevQueue) => {
        if (shuffle && prevQueue.length > 0) {
          // If shuffle is enabled, shuffle the new tracks and insert them randomly
          const shuffledTracks = [...tracks];
          // Fisher-Yates shuffle algorithm
          for (let i = shuffledTracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledTracks[i], shuffledTracks[j]] = [shuffledTracks[j], shuffledTracks[i]];
          }
          
          // Insert each track at a random position
          const newQueue = [...prevQueue];
          shuffledTracks.forEach(track => {
            const randomIndex = Math.floor(Math.random() * (newQueue.length + 1));
            newQueue.splice(randomIndex, 0, track);
          });
          return newQueue;
        } else {
          // Normal behavior: add to the end
          return [...prevQueue, ...tracks];
        }
      });
      
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
  }, [api, songToTrack, toast, shuffle]);

  const addArtistToQueue = useCallback(async (artistId: string) => {
    if (!api) {
      toast({
        variant: "destructive",
        title: "Configuration Required",
        description: "Please configure Navidrome connection in settings",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { artist, albums } = await api.getArtist(artistId);
      let allTracks: Track[] = [];
      
      // Collect all tracks from all albums
      for (const album of albums) {
        const { songs } = await api.getAlbum(album.id);
        const tracks = songs.map(songToTrack);
        allTracks = allTracks.concat(tracks);
      }
      
      setQueue((prevQueue) => {
        if (shuffle && prevQueue.length > 0) {
          // If shuffle is enabled, shuffle the new tracks and insert them randomly
          const shuffledTracks = [...allTracks];
          // Fisher-Yates shuffle algorithm
          for (let i = shuffledTracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledTracks[i], shuffledTracks[j]] = [shuffledTracks[j], shuffledTracks[i]];
          }
          
          // Insert each track at a random position
          const newQueue = [...prevQueue];
          shuffledTracks.forEach(track => {
            const randomIndex = Math.floor(Math.random() * (newQueue.length + 1));
            newQueue.splice(randomIndex, 0, track);
          });
          return newQueue;
        } else {
          // Normal behavior: add to the end
          return [...prevQueue, ...allTracks];
        }
      });
      
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
  }, [api, songToTrack, toast, shuffle]);
  const playAlbum = useCallback(async (albumId: string) => {
    if (!api) {
      toast({
        variant: "destructive",
        title: "Configuration Required",
        description: "Please configure Navidrome connection in settings",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { album, songs } = await api.getAlbum(albumId);
      const tracks = songs.map(songToTrack);
      
      if (tracks.length > 0) {
        if (shuffle) {
          // If shuffle is enabled, shuffle the tracks
          const shuffledTracks = [...tracks];
          // Fisher-Yates shuffle algorithm
          for (let i = shuffledTracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledTracks[i], shuffledTracks[j]] = [shuffledTracks[j], shuffledTracks[i]];
          }
          
          // Play the first shuffled track and set the rest as queue
          playTrack(shuffledTracks[0], true); // Enable autoplay
          setQueue(shuffledTracks.slice(1));
        } else {
          // Normal order: play first track and set the rest as queue
          playTrack(tracks[0], true); // Enable autoplay
          setQueue(tracks.slice(1));
        }
      }
      
      toast({
        title: "Playing Album",
        description: `Now playing "${album.name}"${shuffle ? ' (shuffled)' : ''}`,
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
  }, [api, playTrack, songToTrack, toast, shuffle]);

  const playAlbumFromTrack = useCallback(async (albumId: string, startingSongId: string) => {
    if (!api) {
      toast({
        variant: "destructive",
        title: "Configuration Required",
        description: "Please configure Navidrome connection in settings",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { album, songs } = await api.getAlbum(albumId);
      const tracks = songs.map(songToTrack);
      
      // Find the starting track index
      const startingIndex = tracks.findIndex(track => track.id === startingSongId);
      
      if (startingIndex === -1) {
        throw new Error('Starting song not found in album');
      }
      
      if (shuffle) {
        // If shuffle is enabled, create a shuffled queue but start with the selected track
        const remainingTracks = [...tracks];
        remainingTracks.splice(startingIndex, 1); // Remove the starting track
        
        // Shuffle the remaining tracks
        for (let i = remainingTracks.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [remainingTracks[i], remainingTracks[j]] = [remainingTracks[j], remainingTracks[i]];
        }
        
        setQueue(remainingTracks);
        playTrack(tracks[startingIndex], true); // Enable autoplay
      } else {
        // Normal order: set the remaining tracks after the starting track as queue
        setQueue(tracks.slice(startingIndex + 1));
        playTrack(tracks[startingIndex], true); // Enable autoplay
      }
      
      toast({
        title: "Playing Album",
        description: `Playing "${album.name}" from "${tracks[startingIndex].name}"${shuffle ? ' (shuffled)' : ''}`,
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
  }, [api, playTrack, songToTrack, toast, shuffle]);

  const skipToTrackInQueue = useCallback((index: number) => {
    if (index >= 0 && index < queue.length) {
      const targetTrack = queue[index];
      // Remove all tracks before the target track (including the target track)
      setQueue((prevQueue) => prevQueue.slice(index + 1));
      // Play the target track with autoplay enabled
      playTrack(targetTrack, true);
    }
  }, [queue, playTrack]);

  const toggleShuffle = useCallback(() => {
    setShuffle(prev => {
      const newShuffleState = !prev;
      
      // If turning shuffle ON, shuffle the current queue
      if (newShuffleState && queue.length > 0) {
        setQueue(prevQueue => {
          const shuffledQueue = [...prevQueue];
          // Fisher-Yates shuffle algorithm
          for (let i = shuffledQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledQueue[i], shuffledQueue[j]] = [shuffledQueue[j], shuffledQueue[i]];
          }
          return shuffledQueue;
        });
      }
      
      return newShuffleState;
    });
  }, [queue.length]);

  const shuffleAllAlbums = useCallback(async () => {
    if (!api) {
      toast({
        variant: "destructive",
        title: "Configuration Required",
        description: "Please configure Navidrome connection in settings",
      });
      return;
    }

    setIsLoading(true);
    try {
      const albums = await api.getAlbums('alphabeticalByName', 500, 0);
      let allTracks: Track[] = [];
      
      // Concatenate all tracks from each album into a single array
      for (const album of albums) {
        const { songs } = await api.getAlbum(album.id);
        const tracks = songs.map(songToTrack);
        allTracks = allTracks.concat(tracks);
      }
      
      // Shuffle the combined tracks array
      allTracks.sort(() => Math.random() - 0.5);
      
      // Set the shuffled tracks as the new queue
      setQueue(allTracks);
      
      toast({
        title: "Shuffle All Albums",
        description: `Shuffled ${allTracks.length} tracks from all albums`,
      });
    } catch (error) {
      console.error('Failed to shuffle all albums:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to shuffle all albums",
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, songToTrack, toast]);

  const playArtist = useCallback(async (artistId: string) => {
    if (!api) {
      toast({
        variant: "destructive",
        title: "Configuration Required",
        description: "Please configure Navidrome connection in settings",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { artist, albums } = await api.getArtist(artistId);
      let allTracks: Track[] = [];
      
      // Collect all tracks from all albums
      for (const album of albums) {
        const { songs } = await api.getAlbum(album.id);
        const tracks = songs.map(songToTrack);
        allTracks = allTracks.concat(tracks);
      }
      
      if (allTracks.length > 0) {
        if (shuffle) {
          // If shuffle is enabled, shuffle all tracks
          const shuffledTracks = [...allTracks];
          // Fisher-Yates shuffle algorithm
          for (let i = shuffledTracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledTracks[i], shuffledTracks[j]] = [shuffledTracks[j], shuffledTracks[i]];
          }
          
          // Play the first shuffled track and set the rest as queue
          playTrack(shuffledTracks[0], true); // Enable autoplay
          setQueue(shuffledTracks.slice(1));
        } else {
          // Normal order: play first track and set the rest as queue
          playTrack(allTracks[0], true); // Enable autoplay
          setQueue(allTracks.slice(1));
        }
      }
      
      toast({
        title: "Playing Artist",
        description: `Now playing all albums by "${artist.name}"${shuffle ? ' (shuffled)' : ''}`,
      });
    } catch (error) {
      console.error('Failed to play artist:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to play artist albums",
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, songToTrack, toast, shuffle, playTrack]);

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
    skipToTrackInQueue,
    shuffle,
    toggleShuffle,
    shuffleAllAlbums,
    playArtist
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
    skipToTrackInQueue,
    shuffle,
    toggleShuffle,
    shuffleAllAlbums,
    playArtist
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