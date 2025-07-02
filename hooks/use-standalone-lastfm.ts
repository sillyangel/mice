import { useCallback, useRef } from 'react';

interface LastFmCredentials {
  apiKey: string;
  apiSecret: string;
  sessionKey?: string;
  username?: string;
}

interface ScrobbleState {
  trackId: string | null;
  hasScrobbled: boolean;
  hasUpdatedNowPlaying: boolean;
  playStartTime: number;
  lastPlayedDuration: number;
}

interface Track {
  id: string;
  name: string;
  artist: string;
  albumName?: string;
  duration: number;
}

export function useStandaloneLastFm() {
  const scrobbleStateRef = useRef<ScrobbleState>({
    trackId: null,
    hasScrobbled: false,
    hasUpdatedNowPlaying: false,
    playStartTime: 0,
    lastPlayedDuration: 0,
  });

  const getCredentials = (): LastFmCredentials | null => {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem('lastfm-credentials');
    if (!stored) return null;
    
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  };

  const isEnabled = () => {
    if (typeof window === 'undefined') return false;
    const enabled = localStorage.getItem('standalone-lastfm-enabled');
    const credentials = getCredentials();
    return enabled === 'true' && credentials?.sessionKey;
  };

  const generateApiSignature = (params: Record<string, string>, secret: string): string => {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}${params[key]}`)
      .join('');
    
    // In a real implementation, you'd use a proper crypto library
    // For demo purposes, this is a simplified version
    return btoa(sortedParams + secret).substring(0, 32);
  };

  const makeLastFmRequest = async (method: string, params: Record<string, string>): Promise<any> => {
    const credentials = getCredentials();
    if (!credentials) throw new Error('No Last.fm credentials');

    const requestParams: Record<string, string> = {
      ...params,
      method,
      api_key: credentials.apiKey,
      sk: credentials.sessionKey || '',
      format: 'json'
    };

    const signature = generateApiSignature(requestParams, credentials.apiSecret);
    requestParams.api_sig = signature;

    const formData = new FormData();
    Object.entries(requestParams).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const response = await fetch('https://ws.audioscrobbler.com/2.0/', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Last.fm API error: ${response.statusText}`);
    }

    return response.json();
  };

  const updateNowPlaying = useCallback(async (track: Track) => {
    if (!isEnabled()) return;
    
    try {
      await makeLastFmRequest('track.updateNowPlaying', {
        track: track.name,
        artist: track.artist,
        album: track.albumName || '',
        duration: track.duration.toString()
      });
      
      scrobbleStateRef.current.hasUpdatedNowPlaying = true;
      console.log('Updated now playing on Last.fm:', track.name);
    } catch (error) {
      console.error('Failed to update now playing on Last.fm:', error);
    }
  }, []);

  const scrobbleTrack = useCallback(async (track: Track, timestamp?: number) => {
    if (!isEnabled()) return;
    
    try {
      await makeLastFmRequest('track.scrobble', {
        'track[0]': track.name,
        'artist[0]': track.artist,
        'album[0]': track.albumName || '',
        'timestamp[0]': (timestamp || Math.floor(Date.now() / 1000)).toString()
      });
      
      console.log('Scrobbled track to Last.fm:', track.name);
    } catch (error) {
      console.error('Failed to scrobble track to Last.fm:', error);
    }
  }, []);

  const shouldScrobble = (playedDuration: number, totalDuration: number): boolean => {
    // Last.fm scrobbling rules: 
    // - At least 30 seconds played OR
    // - At least half the track played (whichever is lower)
    const minimumTime = Math.min(30, totalDuration / 2);
    return playedDuration >= minimumTime;
  };

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
    if (!isEnabled() || scrobbleStateRef.current.hasScrobbled) return;

    // Calculate total played time
    const now = Date.now();
    const currentSessionDuration = (now - scrobbleStateRef.current.playStartTime) / 1000;
    const totalPlayedDuration = scrobbleStateRef.current.lastPlayedDuration + currentSessionDuration;

    // Check if we should scrobble
    if (shouldScrobble(totalPlayedDuration, duration)) {
      await scrobbleTrack(track);
      scrobbleStateRef.current.hasScrobbled = true;
    }
  }, [scrobbleTrack]);

  const onTrackEnd = useCallback(async (track: Track, currentTime: number, duration: number) => {
    if (!isEnabled()) return;

    // Calculate final played duration
    const now = Date.now();
    const finalSessionDuration = (now - scrobbleStateRef.current.playStartTime) / 1000;
    const totalPlayedDuration = scrobbleStateRef.current.lastPlayedDuration + finalSessionDuration;

    // Scrobble if we haven't already and the track qualifies
    if (!scrobbleStateRef.current.hasScrobbled && shouldScrobble(totalPlayedDuration, duration)) {
      await scrobbleTrack(track);
    }
  }, [scrobbleTrack]);

  const getAuthUrl = (apiKey: string): string => {
    return `http://www.last.fm/api/auth/?api_key=${apiKey}&cb=${encodeURIComponent(window.location.origin + '/settings')}`;
  };

  const getSessionKey = async (token: string, apiKey: string, apiSecret: string): Promise<{ sessionKey: string; username: string }> => {
    const params: Record<string, string> = {
      method: 'auth.getSession',
      token,
      api_key: apiKey,
      format: 'json'
    };

    const signature = generateApiSignature(params, apiSecret);
    const url = new URL('https://ws.audioscrobbler.com/2.0/');
    Object.entries({ ...params, api_sig: signature }).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Last.fm auth error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.message || 'Last.fm authentication failed');
    }

    return {
      sessionKey: data.session.key,
      username: data.session.name
    };
  };

  return {
    onTrackStart,
    onTrackPlay,
    onTrackPause,
    onTrackProgress,
    onTrackEnd,
    isEnabled,
    getCredentials,
    getAuthUrl,
    getSessionKey
  };
}
