'use client';

import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { Track } from '@/app/components/AudioPlayerContext';
import { audioCacheService } from '@/lib/audio-cache';

interface GaplessAudioPlayerProps {
  currentTrack: Track | null;
  onTrackEnd: () => void;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onTrackStart: (track: Track) => void;
  onLoadStart: () => void;
  onCanPlay: () => void;
  volume: number;
  crossfadeDuration: number; // in seconds
}

export interface GaplessAudioPlayerRef {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  isPlaying: boolean;
}

export const GaplessAudioPlayer = forwardRef<GaplessAudioPlayerRef, GaplessAudioPlayerProps>(({
  currentTrack,
  onTrackEnd,
  onTimeUpdate,
  onTrackStart,
  onLoadStart,
  onCanPlay,
  volume = 1,
  crossfadeDuration = 3
}, ref) => {
  const primaryAudioRef = useRef<HTMLAudioElement>(null);
  const secondaryAudioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<'primary' | 'secondary'>('primary');
  const [crossfadeActive, setCrossfadeActive] = useState(false);
  const crossfadeStartTimeRef = useRef<number | null>(null);
  const trackStartedRef = useRef(false);
  // Get the currently active and inactive audio elements
  const getActiveAudio = useCallback(() => currentPlayer === 'primary' ? primaryAudioRef.current : secondaryAudioRef.current, [currentPlayer]);
  const getInactiveAudio = useCallback(() => currentPlayer === 'primary' ? secondaryAudioRef.current : primaryAudioRef.current, [currentPlayer]);

  // Load track into audio element
  const loadTrackIntoAudio = useCallback(async (track: Track, audioElement: HTMLAudioElement) => {
    // Try to get cached blob first
    const cachedBlob = audioCacheService.getCachedBlob(track.id);
    
    if (cachedBlob) {
      const objectUrl = URL.createObjectURL(cachedBlob);
      audioElement.src = objectUrl;
      console.log(`Using cached audio for track: ${track.name}`);
      
      // Clean up previous object URL
      audioElement.addEventListener('loadstart', () => {
        if (audioElement.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioElement.src);
        }
      }, { once: true });
    } else {
      // Fall back to direct URL
      audioElement.src = track.url;
      console.log(`Using direct URL for track: ${track.name}`);
    }

    audioElement.load();
  }, []);

  // Handle track change
  useEffect(() => {
    if (!currentTrack) {
      const activeAudio = getActiveAudio();
      if (activeAudio) {
        activeAudio.pause();
        setIsPlaying(false);
      }
      return;
    }

    const loadAndPlayTrack = async () => {
      try {
        // Resume AudioContext if needed
        await audioCacheService.resumeAudioContext();

        const activeAudio = getActiveAudio();
        if (!activeAudio) return;

        onLoadStart();
        trackStartedRef.current = false;

        await loadTrackIntoAudio(currentTrack, activeAudio);

        // Set volume
        activeAudio.volume = volume;

        // Auto-play if specified
        if (currentTrack.autoPlay) {
          await activeAudio.play();
          setIsPlaying(true);
        }

      } catch (error) {
        console.error('Failed to load track:', error);
      }
    };

    loadAndPlayTrack();
  }, [currentTrack, loadTrackIntoAudio, onLoadStart, volume]);

  // Handle volume changes
  useEffect(() => {
    const activeAudio = getActiveAudio();
    const inactiveAudio = getInactiveAudio();
    
    if (activeAudio && !crossfadeActive) {
      activeAudio.volume = volume;
    }
    if (inactiveAudio) {
      inactiveAudio.volume = 0;
    }
  }, [volume, crossfadeActive, currentPlayer]);

  // Crossfade logic
  const handleCrossfade = useCallback((currentTime: number, duration: number) => {
    if (crossfadeDuration <= 0 || duration - currentTime > crossfadeDuration) {
      return;
    }

    if (!crossfadeActive) {
      setCrossfadeActive(true);
      crossfadeStartTimeRef.current = currentTime;
      
      // Start preparing next track
      onTrackEnd();
    }

    // Calculate crossfade progress (0 to 1)
    const progress = crossfadeStartTimeRef.current 
      ? (currentTime - crossfadeStartTimeRef.current) / crossfadeDuration 
      : 0;

    const activeAudio = getActiveAudio();
    const inactiveAudio = getInactiveAudio();

    if (activeAudio && inactiveAudio && inactiveAudio.src) {
      // Fade out current track
      activeAudio.volume = volume * (1 - progress);
      
      // Fade in next track
      inactiveAudio.volume = volume * progress;

      // Start playing the inactive audio if it's ready
      if (inactiveAudio.readyState >= 3) { // HAVE_FUTURE_DATA
        inactiveAudio.currentTime = 0;
        inactiveAudio.play().catch(console.error);
      }
    }
  }, [crossfadeDuration, crossfadeActive, onTrackEnd, volume, currentPlayer]);

  // Time update handler
  const handleTimeUpdate = useCallback(() => {
    const activeAudio = getActiveAudio();
    if (!activeAudio || !currentTrack) return;

    const currentTime = activeAudio.currentTime;
    const duration = activeAudio.duration;

    if (!trackStartedRef.current && currentTime > 0) {
      trackStartedRef.current = true;
      onTrackStart(currentTrack);
    }

    onTimeUpdate(currentTime, duration);

    // Handle crossfade
    if (crossfadeDuration > 0 && !isNaN(duration)) {
      handleCrossfade(currentTime, duration);
    }
  }, [currentTrack, onTimeUpdate, onTrackStart, handleCrossfade, crossfadeDuration]);

  // Track ended handler
  const handleTrackEnded = useCallback(() => {
    if (crossfadeActive) {
      // Switch to the other player
      setCurrentPlayer(prev => prev === 'primary' ? 'secondary' : 'primary');
      setCrossfadeActive(false);
      crossfadeStartTimeRef.current = null;
    } else {
      // No crossfade, just end the track
      onTrackEnd();
    }
  }, [crossfadeActive, onTrackEnd]);

  // Public methods for external control
  const play = useCallback(async () => {
    const activeAudio = getActiveAudio();
    if (activeAudio) {
      try {
        await audioCacheService.resumeAudioContext();
        await activeAudio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Failed to play audio:', error);
      }
    }
  }, [currentPlayer]);

  const pause = useCallback(() => {
    const activeAudio = getActiveAudio();
    const inactiveAudio = getInactiveAudio();
    
    if (activeAudio) {
      activeAudio.pause();
    }
    if (inactiveAudio) {
      inactiveAudio.pause();
    }
    setIsPlaying(false);
  }, [currentPlayer]);

  const seek = useCallback((time: number) => {
    const activeAudio = getActiveAudio();
    if (activeAudio) {
      activeAudio.currentTime = time;
      
      // Reset crossfade if seeking
      if (crossfadeActive) {
        setCrossfadeActive(false);
        crossfadeStartTimeRef.current = null;
        
        // Stop inactive audio
        const inactiveAudio = getInactiveAudio();
        if (inactiveAudio) {
          inactiveAudio.pause();
          inactiveAudio.currentTime = 0;
        }
      }
    }
  }, [currentPlayer, crossfadeActive]);
  // Expose player controls via ref
  useImperativeHandle(ref, () => ({
    play,
    pause,
    seek,
    isPlaying
  }), [play, pause, seek, isPlaying]);
  // Attach controls to window for external access (backward compatibility)
  useEffect(() => {
    (window as typeof window & { gaplessPlayer: { play: () => Promise<void>; pause: () => void; seek: (time: number) => void; isPlaying: boolean } }).gaplessPlayer = {
      play,
      pause,
      seek,
      isPlaying
    };
  }, [play, pause, seek, isPlaying]);

  return (
    <>
      <audio
        ref={primaryAudioRef}
        onTimeUpdate={currentPlayer === 'primary' ? handleTimeUpdate : undefined}
        onEnded={currentPlayer === 'primary' ? handleTrackEnded : undefined}
        onCanPlay={currentPlayer === 'primary' ? onCanPlay : undefined}
        preload="auto"
        style={{ display: 'none' }}
      />
      <audio
        ref={secondaryAudioRef}
        onTimeUpdate={currentPlayer === 'secondary' ? handleTimeUpdate : undefined}
        onEnded={currentPlayer === 'secondary' ? handleTrackEnded : undefined}
        onCanPlay={currentPlayer === 'secondary' ? onCanPlay : undefined}
        preload="auto"
        style={{ display: 'none' }}
      />
    </>  );
});

GaplessAudioPlayer.displayName = 'GaplessAudioPlayer';
