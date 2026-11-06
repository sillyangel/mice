'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Song, getNavidromeAPI } from '@/lib/navidrome';
import { useToast } from "@/hooks/use-toast";
import { AudioEffects } from '@/lib/audio-effects';

export interface Track {
  id: string;
  queueId?: string;
  name: string;
  url: string;
  artist: string;
  album: string;
  duration: number;
  coverArt?: string;
  albumId: string;
  artistId: string;
  autoPlay?: boolean;
  starred?: boolean;
  replayGain?: number;
  suffix?: string;
  format?: string;
}

interface AudioSettings {
  crossfadeDuration: number;
  equalizer: string;
  replayGainEnabled: boolean;
  gaplessPlayback: boolean;
}

const MAX_HISTORY = 100;
let queueSeq = 0;

function ensureQueueId(track: Track): Track {
  if (track.queueId) return track;
  queueSeq += 1;
  return { ...track, queueId: `q_${Date.now().toString(36)}_${queueSeq}` };
}

function createFreshQueuedTrack(track: Track): Track {
  queueSeq += 1;
  return { ...track, queueId: `q_${Date.now().toString(36)}_${queueSeq}` };
}

function ensureQueueIds(tracks: Track[]): Track[] {
  let changed = false;
  const next = tracks.map((t) => {
    if (t.queueId) return t;
    changed = true;
    return ensureQueueId(t);
  });
  return changed ? next : tracks;
}

function fisherYatesShuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function appendHistoryBounded(history: Track[], item: Track): Track[] {
  const next = [...history, item];
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
}

export interface AudioQueueContextProps {
  queue: Track[];
  playedTracks: Track[];
}

interface AudioPlayerContextProps {
  currentTrack: Track | null;
  playTrack: (track: Track, autoPlay?: boolean) => void;
  playTracks: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  addTracksToQueue: (tracks: Track[]) => void;
  insertAtBeginningOfQueue: (track: Track) => void;
  playNextTrack: () => void;
  clearQueue: () => void;
  addAlbumToQueue: (albumId: string) => Promise<void>;
  playAlbum: (albumId: string) => Promise<void>;
  playAlbumFromTrack: (albumId: string, startingSongId: string) => Promise<void>;
  removeTrackFromQueue: (index: number) => void;
  removeTrackByQueueId: (queueId: string) => void;
  moveTrackToTopByQueueId: (queueId: string) => void;
  reorderQueue: (oldIndex: number, newIndex: number) => void;
  reorderQueueByIds: (activeQueueId: string, overQueueId: string) => void;
  skipToTrackInQueue: (index: number) => void;
  skipToTrackByQueueId: (queueId: string) => void;
  addArtistToQueue: (artistId: string) => Promise<void>;
  playPreviousTrack: () => void;
  isLoading: boolean;
  shuffle: boolean;
  toggleShuffle: () => void;
  shuffleAllAlbums: () => Promise<void>;
  playArtist: (artistId: string) => Promise<void>;
  clearHistory: () => void;
  toggleCurrentTrackStar: () => Promise<void>;
  updateTrackStarred: (trackId: string, starred: boolean) => void;
  // Lightweight queue head primitives so AudioPlayer doesn't re-render on mid-queue edits
  nextTrackUrl: string | null;
  hasNextTrack: boolean;
  // Audio settings
  audioSettings: AudioSettings;
  updateAudioSettings: (settings: Partial<AudioSettings>) => void;
  equalizerPreset: string;
  setEqualizerPreset: (preset: string) => void;
  audioEffects: AudioEffects | null;
  // Playback state
  isPlaying: boolean;
  togglePlayPause: () => Promise<void>;
  // Minimized / compact player state
  isMinimized: boolean;
  setIsMinimized: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMinimized: () => void;
}

export interface AudioPlayerActionsContextProps {
  playTrack: (track: Track, autoPlay?: boolean) => void;
  playTracks: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  addTracksToQueue: (tracks: Track[]) => void;
  insertAtBeginningOfQueue: (track: Track) => void;
  clearQueue: () => void;
  addAlbumToQueue: (albumId: string) => Promise<void>;
  playAlbum: (albumId: string) => Promise<void>;
  playAlbumFromTrack: (albumId: string, startingSongId: string) => Promise<void>;
  addArtistToQueue: (artistId: string) => Promise<void>;
  playArtist: (artistId: string) => Promise<void>;
  shuffleAllAlbums: () => Promise<void>;
}

const AudioPlayerContext = createContext<AudioPlayerContextProps | undefined>(undefined);
const AudioPlayerActionsContext = createContext<AudioPlayerActionsContextProps | undefined>(undefined);
const AudioQueueContext = createContext<AudioQueueContextProps | undefined>(undefined);

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  crossfadeDuration: 3,
  equalizer: 'normal',
  replayGainEnabled: true,
  gaplessPlayback: true
};

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [playedTracks, setPlayedTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(DEFAULT_AUDIO_SETTINGS);
  const [equalizerPreset, setEqualizerPreset] = useState('normal');
  const [audioEffects, setAudioEffects] = useState<AudioEffects | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('player-minimized');
      if (saved !== null) {
        setIsMinimized(saved === 'true');
      }
    } catch {}
  }, []);

  const handleSetIsMinimized: React.Dispatch<React.SetStateAction<boolean>> = useCallback((val) => {
    setIsMinimized((prev) => {
      const next = typeof val === 'function' ? (val as (prev: boolean) => boolean)(prev) : val;
      try {
        localStorage.setItem('player-minimized', String(next));
      } catch {}
      return next;
    });
  }, []);

  const toggleMinimized = useCallback(() => {
    handleSetIsMinimized((prev) => !prev);
  }, [handleSetIsMinimized]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackRef = useRef<Track | null>(null);
  const queueRef = useRef<Track[]>([]);
  const playedTracksRef = useRef<Track[]>([]);
  const unshuffledQueueRef = useRef<Track[] | null>(null);
  const shuffleRef = useRef<boolean>(false);

  currentTrackRef.current = currentTrack;
  queueRef.current = queue;
  playedTracksRef.current = playedTracks;
  shuffleRef.current = shuffle;

  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const api = useMemo(() => {
    const navidromeApi = getNavidromeAPI();
    if (!navidromeApi) {
      console.warn('⚠️ Navidrome API not configured');
    }
    return navidromeApi;
  }, []);

  useEffect(() => {
    const savedQueue = localStorage.getItem('navidrome-audioQueue');
    if (savedQueue) {
      try {
        const parsed = JSON.parse(savedQueue) as Track[];
        if (Array.isArray(parsed)) {
          setQueue(ensureQueueIds(parsed));
        }
      } catch (error) {
        console.error('Failed to parse saved queue:', error);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('navidrome-audioQueue', JSON.stringify(queue));
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [queue]);

  useEffect(() => {
    const savedCurrentTrack = localStorage.getItem('navidrome-currentTrack');
    if (savedCurrentTrack) {
      try {
        const track = JSON.parse(savedCurrentTrack);
        const savedTime = localStorage.getItem('navidrome-current-track-time');
        track.autoPlay = savedTime !== null && parseFloat(savedTime) > 0;
        setCurrentTrack(track);
      } catch (error) {
        console.error('Failed to parse saved current track:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (currentTrack) {
      const { autoPlay, ...trackToSave } = currentTrack;
      localStorage.setItem('navidrome-currentTrack', JSON.stringify(trackToSave));
    } else {
      localStorage.removeItem('navidrome-currentTrack');
    }
  }, [currentTrack]);

  // Initialize audio effects when audio element is available
  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement && !audioEffects) {
      const effects = new AudioEffects(audioElement);
      setAudioEffects(effects);

      const savedSettings = localStorage.getItem('navidrome-audio-settings');
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          setAudioSettings(settings);
          effects.setPreset(settings.equalizer);
          setEqualizerPreset(settings.equalizer);
        } catch (error) {
          console.error('Failed to load audio settings:', error);
        }
      }

      return () => {
        effects.disconnect();
      };
    }
  }, [audioEffects]);

  const saveSettings = useCallback(() => {
    try {
      localStorage.setItem('navidrome-audio-settings', JSON.stringify(audioSettings));
      localStorage.setItem('navidrome-equalizer-preset', equalizerPreset);
      const playbackSettings = {
        replayGainEnabled: audioSettings.replayGainEnabled,
        gaplessPlayback: audioSettings.gaplessPlayback,
        crossfadeDuration: audioSettings.crossfadeDuration,
        volume: audioRef.current?.volume || 1,
        lastPosition: audioRef.current?.currentTime || 0
      };
      localStorage.setItem('navidrome-playback-settings', JSON.stringify(playbackSettings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [audioSettings, equalizerPreset]);

  useEffect(() => {
    saveSettings();
  }, [audioSettings, equalizerPreset, saveSettings]);

  useEffect(() => {
    if (audioEffects) {
      audioEffects.setPreset(equalizerPreset);
    }
  }, [equalizerPreset, audioEffects]);

  const updateAudioSettings = useCallback((settings: Partial<AudioSettings>) => {
    setAudioSettings(prev => {
      const newSettings = { ...prev, ...settings };
      localStorage.setItem('navidrome-audio-settings', JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  const songToTrack = useMemo(() => (song: Song): Track => {
    if (!api) {
      throw new Error('Navidrome API not configured');
    }

    return {
      id: song.id,
      name: song.title,
      url: api.getStreamUrlForSong(song),
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      coverArt: song.coverArt ? api.getCoverArtUrl(song.coverArt, 300) : undefined,
      albumId: song.albumId,
      artistId: song.artistId,
      starred: !!song.starred,
      replayGain: song.replayGain || 0,
      suffix: song.suffix
    };
  }, [api]);

  const playTrack = useCallback((track: Track, autoPlay: boolean = false) => {
    localStorage.removeItem('navidrome-current-track-time');
    const prevCurrent = currentTrackRef.current;
    if (prevCurrent) {
      setPlayedTracks((prev) => appendHistoryBounded(prev, prevCurrent));
    }
    setCurrentTrack({ ...track, autoPlay });
  }, []);

  const playTracks = useCallback((tracks: Track[], startIndex: number = 0) => {
    if (tracks.length === 0) return;
    const safeStart = Math.max(0, Math.min(startIndex, tracks.length - 1));
    const first = tracks[safeStart];
    const remainingOrdered = tracks.slice(safeStart + 1).map(createFreshQueuedTrack);

    playTrack(first, true);
    if (shuffleRef.current) {
      unshuffledQueueRef.current = remainingOrdered;
      setQueue(fisherYatesShuffle(remainingOrdered));
    } else {
      unshuffledQueueRef.current = null;
      setQueue(remainingOrdered);
    }
  }, [playTrack]);

  const addToQueue = useCallback((track: Track) => {
    const queuedTrack = createFreshQueuedTrack(track);
    if (unshuffledQueueRef.current) {
      unshuffledQueueRef.current = [...unshuffledQueueRef.current, queuedTrack];
    }
    setQueue((prevQueue) => {
      if (shuffleRef.current && prevQueue.length > 0) {
        const randomIndex = Math.floor(Math.random() * (prevQueue.length + 1));
        const newQueue = [...prevQueue];
        newQueue.splice(randomIndex, 0, queuedTrack);
        return newQueue;
      }
      return [...prevQueue, queuedTrack];
    });
  }, []);

  const addTracksToQueue = useCallback((tracks: Track[]) => {
    if (tracks.length === 0) return;
    const queuedTracks = tracks.map(createFreshQueuedTrack);
    if (unshuffledQueueRef.current) {
      unshuffledQueueRef.current = [...unshuffledQueueRef.current, ...queuedTracks];
    }
    setQueue((prevQueue) => {
      if (shuffleRef.current && prevQueue.length > 0) {
        return fisherYatesShuffle([...prevQueue, ...queuedTracks]);
      }
      return [...prevQueue, ...queuedTracks];
    });
  }, []);

  const insertAtBeginningOfQueue = useCallback((track: Track) => {
    const queuedTrack = createFreshQueuedTrack(track);
    if (unshuffledQueueRef.current) {
      unshuffledQueueRef.current = [queuedTrack, ...unshuffledQueueRef.current];
    }
    setQueue((prevQueue) => [queuedTrack, ...prevQueue]);
  }, []);

  const clearQueue = useCallback(() => {
    unshuffledQueueRef.current = null;
    setQueue([]);
  }, []);

  const removeTrackFromQueue = useCallback((index: number) => {
    setQueue((prevQueue) => {
      if (index < 0 || index >= prevQueue.length) return prevQueue;
      const removed = prevQueue[index];
      if (removed?.queueId && unshuffledQueueRef.current) {
        unshuffledQueueRef.current = unshuffledQueueRef.current.filter((t) => t.queueId !== removed.queueId);
      }
      return prevQueue.filter((_, i) => i !== index);
    });
  }, []);

  const removeTrackByQueueId = useCallback((queueId: string) => {
    if (unshuffledQueueRef.current) {
      unshuffledQueueRef.current = unshuffledQueueRef.current.filter((t) => t.queueId !== queueId);
    }
    setQueue((prevQueue) => prevQueue.filter((t) => t.queueId !== queueId));
  }, []);

  const moveTrackToTopByQueueId = useCallback((queueId: string) => {
    setQueue((prevQueue) => {
      const idx = prevQueue.findIndex((t) => t.queueId === queueId);
      if (idx <= 0) return prevQueue;
      const next = [...prevQueue];
      const [item] = next.splice(idx, 1);
      next.unshift(item);
      return next;
    });
  }, []);

  const reorderQueue = useCallback((oldIndex: number, newIndex: number) => {
    setQueue((prevQueue) => {
      if (
        oldIndex === newIndex ||
        oldIndex < 0 ||
        newIndex < 0 ||
        oldIndex >= prevQueue.length ||
        newIndex >= prevQueue.length
      ) {
        return prevQueue;
      }
      const newQueue = [...prevQueue];
      const [movedItem] = newQueue.splice(oldIndex, 1);
      newQueue.splice(newIndex, 0, movedItem);
      return newQueue;
    });
  }, []);

  const reorderQueueByIds = useCallback((activeQueueId: string, overQueueId: string) => {
    if (activeQueueId === overQueueId) return;
    setQueue((prevQueue) => {
      const oldIndex = prevQueue.findIndex((t) => t.queueId === activeQueueId);
      const newIndex = prevQueue.findIndex((t) => t.queueId === overQueueId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prevQueue;
      const newQueue = [...prevQueue];
      const [movedItem] = newQueue.splice(oldIndex, 1);
      newQueue.splice(newIndex, 0, movedItem);
      return newQueue;
    });
  }, []);

  const playNextTrack = useCallback(() => {
    localStorage.removeItem('navidrome-current-track-time');
    const curQueue = queueRef.current;
    if (curQueue.length > 0) {
      const nextTrack = curQueue[0];
      if (nextTrack.queueId && unshuffledQueueRef.current) {
        unshuffledQueueRef.current = unshuffledQueueRef.current.filter((t) => t.queueId !== nextTrack.queueId);
      }
      setQueue((prevQueue) => prevQueue.slice(1));
      playTrack(nextTrack, true);
    }
  }, [playTrack]);

  const playPreviousTrack = useCallback(() => {
    localStorage.removeItem('navidrome-current-track-time');
    const history = playedTracksRef.current;
    if (history.length > 0) {
      const previousTrack = history[history.length - 1];
      setPlayedTracks((prev) => prev.slice(0, -1));

      const cur = currentTrackRef.current;
      if (cur) {
        const requeued = ensureQueueId(cur);
        setQueue((prevQueue) => [requeued, ...prevQueue]);
      }

      localStorage.removeItem('navidrome-current-track-time');
      setCurrentTrack({ ...previousTrack, autoPlay: true });
    }
  }, []);

  const skipToTrackInQueue = useCallback((index: number) => {
    const curQueue = queueRef.current;
    if (index >= 0 && index < curQueue.length) {
      const targetTrack = curQueue[index];
      const skippedIds = new Set(curQueue.slice(0, index + 1).map((t) => t.queueId));
      if (unshuffledQueueRef.current) {
        unshuffledQueueRef.current = unshuffledQueueRef.current.filter((t) => !skippedIds.has(t.queueId));
      }
      setQueue((prevQueue) => prevQueue.slice(index + 1));
      playTrack(targetTrack, true);
    }
  }, [playTrack]);

  const skipToTrackByQueueId = useCallback((queueId: string) => {
    const idx = queueRef.current.findIndex((t) => t.queueId === queueId);
    if (idx !== -1) {
      skipToTrackInQueue(idx);
    }
  }, [skipToTrackInQueue]);

  const toggleShuffle = useCallback(() => {
    const nextShuffle = !shuffleRef.current;
    shuffleRef.current = nextShuffle;
    setShuffle(nextShuffle);

    const curQueue = queueRef.current;
    if (curQueue.length <= 1) {
      if (!nextShuffle) unshuffledQueueRef.current = null;
      return;
    }

    if (nextShuffle) {
      unshuffledQueueRef.current = [...curQueue];
      setQueue(fisherYatesShuffle(curQueue));
    } else if (unshuffledQueueRef.current) {
      const remainingById = new Map(curQueue.map((t) => [t.queueId, t]));
      const restored: Track[] = [];
      for (const orig of unshuffledQueueRef.current) {
        const match = remainingById.get(orig.queueId);
        if (match) {
          restored.push(match);
          remainingById.delete(orig.queueId);
        }
      }
      // Preserve any tracks inserted without an original snapshot entry
      remainingById.forEach((extra) => restored.push(extra));
      unshuffledQueueRef.current = null;
      setQueue(restored);
    }
  }, []);

  const addAlbumToQueue = useCallback(async (albumId: string) => {
    if (!api) {
      toastRef.current({
        variant: "destructive",
        title: "Configuration Required",
        description: "Please configure Navidrome connection in settings",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { album, songs } = await api.getAlbum(albumId);
      addTracksToQueue(songs.map(songToTrack));

      toastRef.current({
        title: "Album Added",
        description: `Added "${album.name}" to queue`,
      });
    } catch (error) {
      console.error('Failed to add album to queue:', error);
      toastRef.current({
        variant: "destructive",
        title: "Error",
        description: "Failed to add album to queue",
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, songToTrack, addTracksToQueue]);

  const addArtistToQueue = useCallback(async (artistId: string) => {
    if (!api) {
      toastRef.current({
        variant: "destructive",
        title: "Configuration Required",
        description: "Please configure Navidrome connection in settings",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { artist, albums } = await api.getArtist(artistId);
      const albumResponses = await Promise.all(albums.map((album) => api.getAlbum(album.id)));
      const allTracks = albumResponses.flatMap(({ songs }) => songs.map(songToTrack));
      addTracksToQueue(allTracks);

      toastRef.current({
        title: "Artist Added",
        description: `Added all albums by "${artist.name}" to queue`,
      });
    } catch (error) {
      console.error('Failed to add artist to queue:', error);
      toastRef.current({
        variant: "destructive",
        title: "Error",
        description: "Failed to add artist to queue",
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, songToTrack, addTracksToQueue]);

  const playAlbum = useCallback(async (albumId: string) => {
    if (!api) {
      toastRef.current({
        variant: "destructive",
        title: "Configuration Required",
        description: "Please configure Navidrome connection in settings",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { songs } = await api.getAlbum(albumId);
      const tracks = songs.map(songToTrack);
      if (tracks.length > 0) {
        if (shuffleRef.current) {
          const randomFirstIdx = Math.floor(Math.random() * tracks.length);
          const first = tracks[randomFirstIdx];
          const restOrdered = tracks.filter((_, idx) => idx !== randomFirstIdx).map(createFreshQueuedTrack);
          unshuffledQueueRef.current = restOrdered;
          playTrack(first, true);
          setQueue(fisherYatesShuffle(restOrdered));
        } else {
          playTracks(tracks, 0);
        }
      }
    } catch (error) {
      console.error('Failed to play album:', error);
      toastRef.current({
        variant: "destructive",
        title: "Error",
        description: "Failed to play album",
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, playTrack, playTracks, songToTrack]);

  const playAlbumFromTrack = useCallback(async (albumId: string, startingSongId: string) => {
    if (!api) {
      toastRef.current({
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
      const startingIndex = tracks.findIndex(track => track.id === startingSongId);

      if (startingIndex === -1) {
        throw new Error('Starting song not found in album');
      }

      if (shuffleRef.current) {
        const restOrdered = tracks
          .filter((_, idx) => idx !== startingIndex)
          .map(createFreshQueuedTrack);
        unshuffledQueueRef.current = restOrdered;
        setQueue(fisherYatesShuffle(restOrdered));
        playTrack(tracks[startingIndex], true);
      } else {
        playTracks(tracks, startingIndex);
      }

      toastRef.current({
        title: "Playing Album",
        description: `Playing "${album.name}" from "${tracks[startingIndex].name}"${shuffleRef.current ? ' (shuffled)' : ''}`,
      });
    } catch (error) {
      console.error('Failed to play album from track:', error);
      toastRef.current({
        variant: "destructive",
        title: "Error",
        description: "Failed to play album from selected track",
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, playTrack, playTracks, songToTrack]);

  const shuffleAllAlbums = useCallback(async () => {
    if (!api) {
      toastRef.current({
        variant: "destructive",
        title: "Configuration Required",
        description: "Please configure Navidrome connection in settings",
      });
      return;
    }

    setIsLoading(true);
    try {
      const songs = await api.getRandomSongs(200);
      const allTracks = songs.map(songToTrack).map(createFreshQueuedTrack);
      unshuffledQueueRef.current = null;
      if (allTracks.length > 0 && !currentTrackRef.current) {
        playTrack(allTracks[0], true);
        setQueue(allTracks.slice(1));
      } else {
        setQueue(allTracks);
      }

      toastRef.current({
        title: "Shuffle All Albums",
        description: `Shuffled ${allTracks.length} tracks`,
      });
    } catch (error) {
      console.error('Failed to shuffle all albums:', error);
      toastRef.current({
        variant: "destructive",
        title: "Error",
        description: "Failed to shuffle all albums",
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, songToTrack, playTrack]);

  const playArtist = useCallback(async (artistId: string) => {
    if (!api) {
      toastRef.current({
        variant: "destructive",
        title: "Configuration Required",
        description: "Please configure Navidrome connection in settings",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { artist, albums } = await api.getArtist(artistId);
      const albumResponses = await Promise.all(albums.map((album) => api.getAlbum(album.id)));
      const allTracks = albumResponses.flatMap(({ songs }) => songs.map(songToTrack));

      if (allTracks.length > 0) {
        if (shuffleRef.current) {
          const firstIdx = Math.floor(Math.random() * allTracks.length);
          const first = allTracks[firstIdx];
          const restOrdered = allTracks.filter((_, idx) => idx !== firstIdx).map(createFreshQueuedTrack);
          unshuffledQueueRef.current = restOrdered;
          playTrack(first, true);
          setQueue(fisherYatesShuffle(restOrdered));
        } else {
          playTracks(allTracks, 0);
        }
      }

      toastRef.current({
        title: "Playing Artist",
        description: `Now playing all albums by "${artist.name}"${shuffleRef.current ? ' (shuffled)' : ''}`,
      });
    } catch (error) {
      console.error('Failed to play artist:', error);
      toastRef.current({
        variant: "destructive",
        title: "Error",
        description: "Failed to play artist albums",
      });
    } finally {
      setIsLoading(false);
    }
  }, [api, songToTrack, playTrack, playTracks]);

  const clearHistory = useCallback(() => {
    setPlayedTracks([]);
    localStorage.removeItem('navidrome-playedTracks');
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('navidrome-playedTracks', JSON.stringify(playedTracks));
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [playedTracks]);

  useEffect(() => {
    const savedPlayedTracks = localStorage.getItem('navidrome-playedTracks');
    if (savedPlayedTracks) {
      try {
        const parsed = JSON.parse(savedPlayedTracks) as Track[];
        if (Array.isArray(parsed)) {
          setPlayedTracks(parsed.slice(-MAX_HISTORY));
        }
      } catch (error) {
        console.error('Failed to parse saved played tracks:', error);
      }
    }
  }, []);

  const togglePlayPause = useCallback(async () => {
    const audioElement = audioRef.current;
    if (!audioElement || !currentTrackRef.current) return;

    try {
      if (!audioElement.paused) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        await audioElement.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Failed to toggle playback:', error);
      toastRef.current({
        variant: "destructive",
        title: "Playback Error",
        description: "Failed to control playback. Please try again.",
      });
    }
  }, []);

  const toggleCurrentTrackStar = useCallback(async () => {
    const cur = currentTrackRef.current;
    if (!cur || !api) {
      toastRef.current({
        variant: "destructive",
        title: "Error",
        description: "No track currently playing or API not configured",
      });
      return;
    }

    const newStarredStatus = !cur.starred;
    try {
      if (newStarredStatus) {
        await api.star(cur.id, 'song');
      } else {
        await api.unstar(cur.id, 'song');
      }
      setCurrentTrack((prev) => prev ? { ...prev, starred: newStarredStatus } : null);
    } catch (error) {
      console.error('Failed to update track starred status:', error);
      toastRef.current({
        variant: "destructive",
        title: "Error",
        description: "Failed to update track favorite status",
      });
    }
  }, [api]);

  const updateTrackStarred = useCallback(async (trackId: string, starred: boolean) => {
    if (!api) {
      toastRef.current({
        variant: "destructive",
        title: "Configuration Required",
        description: "Please configure Navidrome connection in settings",
      });
      return;
    }

    try {
      if (starred) {
        await api.star(trackId, 'song');
      } else {
        await api.unstar(trackId, 'song');
      }

      if (currentTrackRef.current?.id === trackId) {
        setCurrentTrack((prev) => prev ? { ...prev, starred } : null);
      }

      setQueue((prev) => {
        let changed = false;
        const next = prev.map((track) => {
          if (track.id !== trackId || track.starred === starred) return track;
          changed = true;
          return { ...track, starred };
        });
        return changed ? next : prev;
      });
    } catch (error) {
      console.error('Failed to update track starred status:', error);
      toastRef.current({
        variant: "destructive",
        title: "Error",
        description: "Failed to update track favorite status",
      });
    }
  }, [api]);

  const nextTrackUrl = queue.length > 0 ? queue[0].url : null;
  const hasNextTrack = queue.length > 0;

  const actionsValue = useMemo<AudioPlayerActionsContextProps>(() => ({
    playTrack,
    playTracks,
    addToQueue,
    addTracksToQueue,
    insertAtBeginningOfQueue,
    clearQueue,
    addAlbumToQueue,
    playAlbum,
    playAlbumFromTrack,
    addArtistToQueue,
    playArtist,
    shuffleAllAlbums,
  }), [
    playTrack,
    playTracks,
    addToQueue,
    addTracksToQueue,
    insertAtBeginningOfQueue,
    clearQueue,
    addAlbumToQueue,
    playAlbum,
    playAlbumFromTrack,
    addArtistToQueue,
    playArtist,
    shuffleAllAlbums,
  ]);

  const queueContextValue = useMemo<AudioQueueContextProps>(() => ({
    queue,
    playedTracks,
  }), [queue, playedTracks]);

  const contextValue = useMemo<AudioPlayerContextProps>(() => ({
    currentTrack,
    playTrack,
    playTracks,
    addToQueue,
    addTracksToQueue,
    insertAtBeginningOfQueue,
    playNextTrack,
    clearQueue,
    addAlbumToQueue,
    removeTrackFromQueue,
    removeTrackByQueueId,
    moveTrackToTopByQueueId,
    reorderQueue,
    reorderQueueByIds,
    addArtistToQueue,
    playPreviousTrack,
    isLoading,
    playAlbum,
    playAlbumFromTrack,
    skipToTrackInQueue,
    skipToTrackByQueueId,
    shuffle,
    toggleShuffle,
    shuffleAllAlbums,
    playArtist,
    clearHistory,
    nextTrackUrl,
    hasNextTrack,
    audioSettings,
    updateAudioSettings,
    equalizerPreset,
    setEqualizerPreset,
    audioEffects,
    isPlaying,
    togglePlayPause,
    toggleCurrentTrackStar,
    updateTrackStarred,
    isMinimized,
    setIsMinimized: handleSetIsMinimized,
    toggleMinimized,
  }), [
    currentTrack,
    playTrack,
    playTracks,
    addToQueue,
    addTracksToQueue,
    insertAtBeginningOfQueue,
    playNextTrack,
    clearQueue,
    addAlbumToQueue,
    removeTrackFromQueue,
    removeTrackByQueueId,
    moveTrackToTopByQueueId,
    reorderQueue,
    reorderQueueByIds,
    addArtistToQueue,
    playPreviousTrack,
    isLoading,
    playAlbum,
    playAlbumFromTrack,
    skipToTrackInQueue,
    skipToTrackByQueueId,
    shuffle,
    toggleShuffle,
    shuffleAllAlbums,
    playArtist,
    clearHistory,
    nextTrackUrl,
    hasNextTrack,
    audioSettings,
    updateAudioSettings,
    equalizerPreset,
    setEqualizerPreset,
    audioEffects,
    isPlaying,
    togglePlayPause,
    toggleCurrentTrackStar,
    updateTrackStarred,
    isMinimized,
    handleSetIsMinimized,
    toggleMinimized,
  ]);

  return (
    <AudioPlayerActionsContext.Provider value={actionsValue}>
      <AudioPlayerContext.Provider value={contextValue}>
        <AudioQueueContext.Provider value={queueContextValue}>
          {children}
        </AudioQueueContext.Provider>
      </AudioPlayerContext.Provider>
    </AudioPlayerActionsContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};

export const useAudioPlayerActions = () => {
  const context = useContext(AudioPlayerActionsContext);
  if (!context) {
    throw new Error('useAudioPlayerActions must be used within an AudioPlayerProvider');
  }
  return context;
};

export const useAudioQueue = () => {
  const context = useContext(AudioQueueContext);
  if (!context) {
    throw new Error('useAudioQueue must be used within an AudioPlayerProvider');
  }
  return context;
};