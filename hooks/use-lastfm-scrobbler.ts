import { useCallback, useRef } from 'react';
import { getNavidromeAPI } from '@/lib/navidrome';
import { Track } from '@/app/components/AudioPlayerContext';

interface ScrobbleState {
  trackId: string | null;
  hasScrobbled: boolean;
  hasUpdatedNowPlaying: boolean;
  playStartTime: number;
  lastPlayedDuration: number;
}

export function useLastFmScrobbler() {
  const scrobbleStateRef = useRef<ScrobbleState>({
    trackId: null,
    hasScrobbled: false,
    hasUpdatedNowPlaying: false,
    playStartTime: 0,
    lastPlayedDuration: 0,
  });

  const isScrobblingEnabled = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('lastfm-scrobbling-enabled') !== 'false';
  };

  const updateNowPlaying = useCallback(async (track: Track) => {
    if (!isScrobblingEnabled()) return;
    
    const api = getNavidromeAPI();
    if (!api || !track.id) return;

    try {
      await api.updateNowPlaying(track.id);
      scrobbleStateRef.current.hasUpdatedNowPlaying = true;
      console.log('Updated now playing for Last.fm:', track.name);
    } catch (error) {
      console.error('Failed to update now playing:', error);
    }
  }, []);

  const onTrackStart = useCallback(async (track: Track) => {
    // Reset scrobble state for new track
    scrobbleStateRef.current = {
      trackId: track.id,
      hasScrobbled: false,
      hasUpdatedNowPlaying: false,
      playStartTime: Date.now(),
      lastPlayedDuration: 0,
    };

    // Update now playing on Last.fm
    await updateNowPlaying(track);
  }, [updateNowPlaying]);

  const onTrackPlay = useCallback(async (track: Track) => {
    scrobbleStateRef.current.playStartTime = Date.now();
    
    // Update now playing if we haven't already for this track
    if (!scrobbleStateRef.current.hasUpdatedNowPlaying || scrobbleStateRef.current.trackId !== track.id) {
      await onTrackStart(track);
    }
  }, [onTrackStart]);

  const onTrackPause = useCallback((currentTime: number) => {
    const now = Date.now();
    const sessionDuration = (now - scrobbleStateRef.current.playStartTime) / 1000;
    scrobbleStateRef.current.lastPlayedDuration += sessionDuration;
  }, []);

  const onTrackProgress = useCallback(async (track: Track, currentTime: number, duration: number) => {
    if (!isScrobblingEnabled()) return;
    
    const api = getNavidromeAPI();
    if (!api || !track.id || scrobbleStateRef.current.hasScrobbled) return;

    // Calculate total played time
    const now = Date.now();
    const currentSessionDuration = (now - scrobbleStateRef.current.playStartTime) / 1000;
    const totalPlayedDuration = scrobbleStateRef.current.lastPlayedDuration + currentSessionDuration;

    // Check if we should scrobble according to Last.fm guidelines
    if (api.shouldScrobble(totalPlayedDuration, duration)) {
      try {
        await api.scrobbleTrack(track.id);
        scrobbleStateRef.current.hasScrobbled = true;
        console.log('Scrobbled track to Last.fm:', track.name);
      } catch (error) {
        console.error('Failed to scrobble track:', error);
      }
    }
  }, []);

  const onTrackEnd = useCallback(async (track: Track, currentTime: number, duration: number) => {
    if (!isScrobblingEnabled()) return;
    
    const api = getNavidromeAPI();
    if (!api || !track.id) return;

    // Calculate final played duration
    const now = Date.now();
    const finalSessionDuration = (now - scrobbleStateRef.current.playStartTime) / 1000;
    const totalPlayedDuration = scrobbleStateRef.current.lastPlayedDuration + finalSessionDuration;

    // Scrobble if we haven't already and the track qualifies
    if (!scrobbleStateRef.current.hasScrobbled && api.shouldScrobble(totalPlayedDuration, duration)) {
      try {
        await api.scrobbleTrack(track.id);
        console.log('Final scrobble for completed track:', track.name);
      } catch (error) {
        console.error('Failed to scrobble completed track:', error);
      }
    }
  }, []);

  return {
    onTrackStart,
    onTrackPlay,
    onTrackPause,
    onTrackProgress,
    onTrackEnd,
  };
}
