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

  // Cache capability detection per API instance. Reset on reconfigure via resetNavidromeAPI.
  const playbackReportSupported = useRef<boolean | null>(null);

  const isScrobblingEnabled = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('lastfm-scrobbling-enabled') !== 'false';
  };

  const getPlaybackReportSupport = useCallback(async (): Promise<boolean> => {
    const api = getNavidromeAPI();
    if (!api) return false;
    if (playbackReportSupported.current === null) {
      playbackReportSupported.current = await api.hasExtension('playbackReport');
    }
    return playbackReportSupported.current;
  }, []);

  const updateNowPlaying = useCallback(async (track: Track) => {
    if (!isScrobblingEnabled()) return;

    const api = getNavidromeAPI();
    if (!api || !track.id) return;

    try {
      if (await getPlaybackReportSupport()) {
        await api.reportPlayback({ mediaId: track.id, mediaType: 'song', state: 'starting', positionMs: 0 });
      } else {
        await api.updateNowPlaying(track.id);
      }
      scrobbleStateRef.current.hasUpdatedNowPlaying = true;
    } catch (error) {
      console.error('Failed to update now playing:', error);
    }
  }, [getPlaybackReportSupport]);

  const onTrackStart = useCallback(async (track: Track) => {
    // Reset scrobble state for new track
    scrobbleStateRef.current = {
      trackId: track.id,
      hasScrobbled: false,
      hasUpdatedNowPlaying: false,
      playStartTime: Date.now(),
      lastPlayedDuration: 0,
    };

    // Update now playing
    await updateNowPlaying(track);
  }, [updateNowPlaying]);

  const onTrackPlay = useCallback(async (track: Track) => {
    scrobbleStateRef.current.playStartTime = Date.now();

    if (!scrobbleStateRef.current.hasUpdatedNowPlaying || scrobbleStateRef.current.trackId !== track.id) {
      await onTrackStart(track);
    } else if (await getPlaybackReportSupport()) {
      getNavidromeAPI()?.reportPlayback({ mediaId: track.id, mediaType: 'song', state: 'playing', positionMs: 0 });
    }
  }, [onTrackStart, getPlaybackReportSupport]);

  const onTrackPause = useCallback(async (track: Track, currentTime: number) => {
    const now = Date.now();
    const sessionDuration = (now - scrobbleStateRef.current.playStartTime) / 1000;
    scrobbleStateRef.current.lastPlayedDuration += sessionDuration;

    if (isScrobblingEnabled() && track?.id && (await getPlaybackReportSupport())) {
      getNavidromeAPI()?.reportPlayback({
        mediaId: track.id,
        mediaType: 'song',
        state: 'paused',
        positionMs: Math.round(currentTime * 1000),
      });
    }
  }, [getPlaybackReportSupport]);

  const onTrackProgress = useCallback(async (track: Track, currentTime: number, duration: number) => {
    if (!isScrobblingEnabled()) return;

    const api = getNavidromeAPI();
    if (!api || !track.id || scrobbleStateRef.current.hasScrobbled) return;

    const supports = await getPlaybackReportSupport();
    if (supports) {
      // Report playback position periodically even if below scrobble threshold.
      api.reportPlayback({
        mediaId: track.id,
        mediaType: 'song',
        state: 'playing',
        positionMs: Math.round(currentTime * 1000),
      }).catch(() => {});
    }

    // Calculate total played time
    const now = Date.now();
    const currentSessionDuration = (now - scrobbleStateRef.current.playStartTime) / 1000;
    const totalPlayedDuration = scrobbleStateRef.current.lastPlayedDuration + currentSessionDuration;

    if (!supports && api.shouldScrobble(totalPlayedDuration, duration)) {
      try {
        await api.scrobbleTrack(track.id);
        scrobbleStateRef.current.hasScrobbled = true;
      } catch (error) {
        console.error('Failed to scrobble track:', error);
      }
    }
  }, [getPlaybackReportSupport]);

  const onTrackEnd = useCallback(async (track: Track, currentTime: number, duration: number) => {
    if (!isScrobblingEnabled()) return;

    const api = getNavidromeAPI();
    if (!api || !track.id) return;

    const supports = await getPlaybackReportSupport();
    if (supports) {
      api.reportPlayback({
        mediaId: track.id,
        mediaType: 'song',
        state: 'stopped',
        positionMs: Math.round(currentTime * 1000),
        ignoreScrobble: false,
      }).catch(() => {});
      return;
    }

    // Calculate final played duration
    const now = Date.now();
    const finalSessionDuration = (now - scrobbleStateRef.current.playStartTime) / 1000;
    const totalPlayedDuration = scrobbleStateRef.current.lastPlayedDuration + finalSessionDuration;

    if (!scrobbleStateRef.current.hasScrobbled && api.shouldScrobble(totalPlayedDuration, duration)) {
      try {
        await api.scrobbleTrack(track.id);
      } catch (error) {
        console.error('Failed to scrobble completed track:', error);
      }
    }
  }, [getPlaybackReportSupport]);

  return {
    onTrackStart,
    onTrackPlay,
    onTrackPause,
    onTrackProgress,
    onTrackEnd,
  };
}