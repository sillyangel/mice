'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAudioPlayer, Track } from '@/app/components/AudioPlayerContext';
import { FullScreenPlayer } from '@/app/components/FullScreenPlayer';
import { FaPlay, FaPause, FaVolumeHigh, FaForward, FaBackward, FaCompress, FaVolumeXmark, FaExpand, FaShuffle } from "react-icons/fa6";
import { Heart } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useLastFmScrobbler } from '@/hooks/use-lastfm-scrobbler';
import { useStandaloneLastFm } from '@/hooks/use-standalone-lastfm';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useGlobalSearch } from './GlobalSearchProvider';
import { DraggableMiniPlayer } from './DraggableMiniPlayer';

export const AudioPlayer: React.FC = () => {
  const { 
    currentTrack, 
    playPreviousTrack, 
    addToQueue, 
    playNextTrack, 
    clearQueue, 
    queue, 
    toggleShuffle, 
    shuffle, 
    toggleCurrentTrackStar,
    audioSettings,
    updateAudioSettings,
    equalizerPreset,
    setEqualizerPreset,
    audioEffects
  } = useAudioPlayer();
  const router = useRouter();
  const isMobile = useIsMobile();
  
  // Swipe gesture state for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;
  const audioRef = useRef<HTMLAudioElement>(null);
  const preloadAudioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isClient, setIsClient] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  // Notifications and title management
  const [lastNotifiedTrackId, setLastNotifiedTrackId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const audioCurrent = audioRef.current;
  const { toast } = useToast();
  
  // Swipe gesture handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // Swipe left -> next track
      playNextTrack();
    } else if (isRightSwipe) {
      // Swipe right -> previous track
      playPreviousTrack();
    }
  };
  
  // Last.fm scrobbler integration (Navidrome)
  const {
    onTrackStart: navidromeOnTrackStart,
    onTrackPlay: navidromeOnTrackPlay,
    onTrackPause: navidromeOnTrackPause,
    onTrackProgress: navidromeOnTrackProgress,
    onTrackEnd: navidromeOnTrackEnd,
  } = useLastFmScrobbler();

  // Standalone Last.fm integration
  const {
    onTrackStart: standaloneOnTrackStart,
    onTrackPlay: standaloneOnTrackPlay,
    onTrackPause: standaloneOnTrackPause,
    onTrackProgress: standaloneOnTrackProgress,
    onTrackEnd: standaloneOnTrackEnd,
  } = useStandaloneLastFm();

  // Combined Last.fm handlers
  const onTrackStart = useCallback((track: Track) => {
    navidromeOnTrackStart(track);
    standaloneOnTrackStart(track);
  }, [navidromeOnTrackStart, standaloneOnTrackStart]);

  const onTrackPlay = useCallback((track: Track) => {
    navidromeOnTrackPlay(track);
    standaloneOnTrackPlay(track);
  }, [navidromeOnTrackPlay, standaloneOnTrackPlay]);

  const onTrackPause = useCallback((track: Track, currentTime: number) => {
    navidromeOnTrackPause(track, currentTime);
    standaloneOnTrackPause(currentTime);
  }, [navidromeOnTrackPause, standaloneOnTrackPause]);

  const onTrackProgress = useCallback((track: Track, currentTime: number, duration: number) => {
    navidromeOnTrackProgress(track, currentTime, duration);
    standaloneOnTrackProgress(track, currentTime, duration);
  }, [navidromeOnTrackProgress, standaloneOnTrackProgress]);

  const onTrackEnd = useCallback((track: Track, currentTime: number, duration: number) => {
    navidromeOnTrackEnd(track, currentTime, duration);
    standaloneOnTrackEnd(track, currentTime, duration);
  }, [navidromeOnTrackEnd, standaloneOnTrackEnd]);
  
  const handleOpenQueue = () => {
    setIsFullScreen(false);
    router.push('/queue');
  };
  
  useEffect(() => {
    setIsClient(true);
    
    if (currentTrack) {
      // Load saved volume
      const savedVolume = localStorage.getItem('navidrome-volume');
      if (savedVolume) {
        try {
          const volumeValue = parseFloat(savedVolume);
          if (volumeValue >= 0 && volumeValue <= 1) {
            setVolume(volumeValue);
          }
        } catch (error) {
          console.error('Failed to parse saved volume:', error);
        }
      }
    }
    
    // Mobile-specific audio initialization
    if (isMobile) {
      // Detect if running as PWA
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      
      // Add a document click listener to initialize audio context on first user interaction
      const initializeAudioOnMobile = async () => {
        if (!audioInitialized) {
          try {
            const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (AudioContextClass) {
              const audioContext = new AudioContextClass();

              if (audioContext.state === 'suspended') {
                await audioContext.resume();
              }

              // For PWA, we need to explicitly unlock audio
              if (isPWA && audioRef.current) {
                // Create a silent audio buffer to unlock audio
                const buffer = audioContext.createBuffer(1, 1, 22050);
                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContext.destination);
                source.start(0);

                // Also try to load the audio element
                try {
                  audioRef.current.volume = 0;
                  const playPromise = audioRef.current.play();
                  if (playPromise) {
                    await playPromise;
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                  }
                  audioRef.current.volume = volume;
                } catch (unlockError) {
                  console.error('PWA audio unlock failed:', unlockError);
                }
              }

              setAudioInitialized(true);
            }
          } catch (error) {
            console.error('Mobile audio context initialization failed:', error);
          }
        }
      };

      // Listen for any user interaction to initialize audio
      const handleFirstUserInteraction = () => {
        initializeAudioOnMobile();
        document.removeEventListener('touchstart', handleFirstUserInteraction);
        document.removeEventListener('click', handleFirstUserInteraction);
      };

      document.addEventListener('touchstart', handleFirstUserInteraction, { passive: true });
      document.addEventListener('click', handleFirstUserInteraction);

      return () => {
        document.removeEventListener('touchstart', handleFirstUserInteraction);
        document.removeEventListener('click', handleFirstUserInteraction);
      };
    }
    
    // Clean up old localStorage entries with track IDs
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('navidrome-track-time-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }, [isMobile, audioInitialized, volume, currentTrack]);

  // Apply volume to audio element when volume changes
  useEffect(() => {
    const audioCurrent = audioRef.current;
    if (audioCurrent) {
      // Apply volume through audio effects chain if available
      if (audioEffects) {
        audioEffects.setVolume(volume);
      } else {
        audioCurrent.volume = volume;
      }
    }
    // Save volume to localStorage
    localStorage.setItem('navidrome-volume', volume.toString());
  }, [volume, audioEffects]);

  // Save position when component unmounts or track changes
  useEffect(() => {
    const audioCurrent = audioRef.current;
    return () => {
      if (audioCurrent && currentTrack && audioCurrent.currentTime > 5) {
        localStorage.setItem('navidrome-current-track-time', audioCurrent.currentTime.toString());
      }
    };
  }, [currentTrack]);

  useEffect(() => {
    const audioCurrent = audioRef.current;
    const preloadAudioCurrent = preloadAudioRef.current;
    
    if (currentTrack && audioCurrent && audioCurrent.src !== currentTrack.url) {
      // Always clear current track time when changing tracks
      localStorage.removeItem('navidrome-current-track-time');
      
      // Track selection for the audio element
      if (!currentTrack.url || currentTrack.url === 'undefined' || currentTrack.url === '') {
        console.error('Invalid audio URL:', currentTrack.url);
        return;
      }

      // If we have audio effects and ReplayGain is enabled, apply it
      if (audioEffects && audioSettings.replayGainEnabled && currentTrack.replayGain) {
        audioEffects.setReplayGain(currentTrack.replayGain);
      }

      // For gapless playback, start preloading the next track
      if (audioSettings.gaplessPlayback && queue.length > 0) {
        const nextTrack = queue[0];
        if (preloadAudioCurrent && nextTrack) {
          preloadAudioCurrent.src = nextTrack.url;
          preloadAudioCurrent.load();
        }
      }
      
      // Clear any previous error handlers
      audioCurrent.onerror = null;
      audioCurrent.onloadstart = null;
      audioCurrent.oncanplay = null;
      
      // Simple error handling
      audioCurrent.onerror = (e) => {
        const event = e as Event;
        const error = event.target as HTMLAudioElement;
        console.error('Audio element error:', {
          error: error.error,
          networkState: error.networkState,
          readyState: error.readyState,
          src: error.src
        });
      };
      
      // Set source without any CORS configuration
      audioCurrent.removeAttribute('crossorigin');
      audioCurrent.src = currentTrack.url;
      
      // Force load
      audioCurrent.load();
      
      // For iOS, ensure audio element is properly loaded
      if (isMobile) {
        audioCurrent.load();
      }
      
      // Notify scrobbler about new track
      onTrackStart(currentTrack);
      
      // Check for saved timestamp (only restore if more than 5 seconds in)
      const savedTime = localStorage.getItem('navidrome-current-track-time');
      if (savedTime) {
        const time = parseFloat(savedTime);
        // Only restore if we were at least 5 seconds in and not near the end
        if (time > 5 && time < (currentTrack.duration - 15)) {
          const restorePosition = () => {
            if (audioCurrent.readyState >= 2) { // HAVE_CURRENT_DATA
              audioCurrent.currentTime = time;
              audioCurrent.removeEventListener('loadeddata', restorePosition);
            }
          };
          
          if (audioCurrent.readyState >= 2) {
            audioCurrent.currentTime = time;
          } else {
            audioCurrent.addEventListener('loadeddata', restorePosition);
          }
        }
        // Always clear after attempting to restore
        localStorage.removeItem('navidrome-current-track-time');
      }
      
      // Auto-play only if the track has the autoPlay flag and audio is initialized
      if (currentTrack.autoPlay && (!isMobile || audioInitialized)) {
        // Start crossfade fade-in if enabled
        if (audioSettings.crossfadeDuration > 0 && audioEffects) {
          audioEffects.startCrossfade();
        }
        
        // Add a small delay for iOS compatibility
        const playPromise = isMobile ? 
          new Promise(resolve => setTimeout(resolve, 100)).then(() => audioCurrent.play()) :
          audioCurrent.play();
          
        playPromise.then(() => {
          setIsPlaying(true);
          // Notify scrobbler about play
          onTrackPlay(currentTrack);
        }).catch((error) => {
          console.error('Failed to auto-play:', error);
          setIsPlaying(false);
          
          // On iOS, auto-play might fail - that's normal
          if (isMobile) {
            console.error('Auto-play failed on mobile - user interaction required');
          }
        });
      } else {
        setIsPlaying(false);
      }
    }
  }, [currentTrack, onTrackStart, onTrackPlay, isMobile, audioInitialized, audioEffects, audioSettings.gaplessPlayback, audioSettings.replayGainEnabled, audioSettings.crossfadeDuration, queue]);

  useEffect(() => {
    const audioCurrent = audioRef.current;
    let lastSavedTime = 0;

    const updateProgress = () => {
      if (audioCurrent && currentTrack) {
        setProgress((audioCurrent.currentTime / audioCurrent.duration) * 100);
        
        // Save current time every 10 seconds, but only if we've moved forward significantly
        const currentTime = audioCurrent.currentTime;
        if (Math.abs(currentTime - lastSavedTime) >= 10 && currentTime > 5) {
          localStorage.setItem('navidrome-current-track-time', currentTime.toString());
          lastSavedTime = currentTime;
        }

        // Update scrobbler with progress
        onTrackProgress(currentTrack, currentTime, audioCurrent.duration);
      }
    };

    const handleTrackEnd = () => {
      if (currentTrack && audioCurrent) {
        // Clear saved time when track ends
        localStorage.removeItem('navidrome-current-track-time');
        
        // Notify scrobbler about track end
        onTrackEnd(currentTrack, audioCurrent.currentTime, audioCurrent.duration);

        // If crossfade is enabled and we have more tracks in queue
        if (audioSettings.crossfadeDuration > 0 && queue.length > 0 && audioEffects) {
          // Start fading out current track
          audioEffects.setCrossfadeTime(audioSettings.crossfadeDuration);
        }
      }
      playNextTrack();
    };

    const handleSeeked = () => {
      if (audioCurrent && currentTrack) {
        // Save immediately when user seeks
        localStorage.setItem('navidrome-current-track-time', audioCurrent.currentTime.toString());
        lastSavedTime = audioCurrent.currentTime;
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if (currentTrack) {
        onTrackPlay(currentTrack);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (audioCurrent && currentTrack) {
        onTrackPause(currentTrack, audioCurrent.currentTime);
      }
    };
    
    if (audioCurrent) {
      audioCurrent.addEventListener('timeupdate', updateProgress);
      audioCurrent.addEventListener('ended', handleTrackEnd);
      audioCurrent.addEventListener('seeked', handleSeeked);
      audioCurrent.addEventListener('play', handlePlay);
      audioCurrent.addEventListener('pause', handlePause);
    }
    
    return () => {
      if (audioCurrent) {
        audioCurrent.removeEventListener('timeupdate', updateProgress);
        audioCurrent.removeEventListener('ended', handleTrackEnd);
        audioCurrent.removeEventListener('seeked', handleSeeked);
        audioCurrent.removeEventListener('play', handlePlay);
        audioCurrent.removeEventListener('pause', handlePause);
      }
    };
  }, [playNextTrack, currentTrack, onTrackProgress, onTrackEnd, onTrackPlay, onTrackPause, audioEffects, audioSettings.crossfadeDuration, queue.length]);

  // Update document title and optionally show a notification when a new song starts
  useEffect(() => {
    if (!isClient || !currentTrack) {
      if (!currentTrack) {
        document.title = 'mice';
      }
      return;
    }

    // Update favicon/title like Spotify
    const baseTitle = `${currentTrack.name} • ${currentTrack.artist} – mice`;
    document.title = isPlaying ? baseTitle : `(Paused) ${baseTitle}`;

    // Notifications
    const notifyEnabled = localStorage.getItem('playback-notifications-enabled') === 'true';
    const canNotify = 'Notification' in window && Notification.permission !== 'denied';
    if (notifyEnabled && canNotify && lastNotifiedTrackId !== currentTrack.id) {
      try {
        if (Notification.permission === 'default') {
          Notification.requestPermission().then((perm) => {
            if (perm === 'granted') {
              new Notification('Now Playing', {
                body: `${currentTrack.name} — ${currentTrack.artist}`,
                icon: currentTrack.coverArt || '/icon-192.png',
                badge: '/icon-192.png',
              });
              setLastNotifiedTrackId(currentTrack.id);
            }
          });
        } else if (Notification.permission === 'granted') {
          new Notification('Now Playing', {
            body: `${currentTrack.name} — ${currentTrack.artist}`,
            icon: currentTrack.coverArt || '/icon-192.png',
            badge: '/icon-192.png',
          });
          setLastNotifiedTrackId(currentTrack.id);
        }
      } catch (e) {
        console.warn('Notification failed:', e);
      }
    }
  }, [currentTrack, isPlaying, isClient, lastNotifiedTrackId]);

  // Media Session API integration - Enhanced for mobile
  useEffect(() => {
    if (!isClient || !currentTrack) return;
    
    // Check if MediaSession is supported
    if (!('mediaSession' in navigator)) {
      return;
    }

    try {
      // Set metadata
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.name,
        artist: currentTrack.artist,
        album: currentTrack.album,
        artwork: currentTrack.coverArt ? [
          { src: currentTrack.coverArt, sizes: '96x96', type: 'image/jpeg' },
          { src: currentTrack.coverArt, sizes: '128x128', type: 'image/jpeg' },
          { src: currentTrack.coverArt, sizes: '192x192', type: 'image/jpeg' },
          { src: currentTrack.coverArt, sizes: '256x256', type: 'image/jpeg' },
          { src: currentTrack.coverArt, sizes: '384x384', type: 'image/jpeg' },
          { src: currentTrack.coverArt, sizes: '512x512', type: 'image/jpeg' }
        ] : [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ],
      });

      // Set playback state
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      // Set action handlers with error handling
      navigator.mediaSession.setActionHandler('play', () => {
        const audioCurrent = audioRef.current;
        if (audioCurrent && currentTrack) {
          audioCurrent.play().then(() => {
            setIsPlaying(true);
            onTrackPlay(currentTrack);
          }).catch(console.error);
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        const audioCurrent = audioRef.current;
        if (audioCurrent && currentTrack) {
          audioCurrent.pause();
          setIsPlaying(false);
          onTrackPause(currentTrack, audioCurrent.currentTime);
        }
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        playPreviousTrack();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        playNextTrack();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        const audioCurrent = audioRef.current;
        if (audioCurrent && details.seekTime !== undefined) {
          audioCurrent.currentTime = details.seekTime;
        }
      });

      // Add togglefavorite action for iOS
      try {
        // togglefavorite is an iOS-specific action that may not be in TypeScript definitions
        const mediaSession = navigator.mediaSession as MediaSession & {
          setActionHandler(action: 'togglefavorite', handler: MediaSessionActionHandler | null): void;
        };
        mediaSession.setActionHandler('togglefavorite', () => {
          toggleCurrentTrackStar();
        });
      } catch (error) {
        // togglefavorite might not be supported on all platforms
        console.error('togglefavorite action not supported:', error);
      }

      // Update position state for better scrubbing support
      const updatePositionState = () => {
        const audioCurrent = audioRef.current;
        if (audioCurrent && currentTrack && 'setPositionState' in navigator.mediaSession) {
          try {
            navigator.mediaSession.setPositionState({
              duration: audioCurrent.duration || 0,
              playbackRate: audioCurrent.playbackRate || 1.0,
              position: audioCurrent.currentTime || 0,
            });
          } catch (error) {
            console.error('Position state update failed:', error);
          }
        }
      };

      // Update position state periodically
      const positionInterval = setInterval(updatePositionState, 1000);

      return () => {
        clearInterval(positionInterval);
        if ('mediaSession' in navigator) {
          navigator.mediaSession.setActionHandler('play', null);
          navigator.mediaSession.setActionHandler('pause', null);
          navigator.mediaSession.setActionHandler('previoustrack', null);
          navigator.mediaSession.setActionHandler('nexttrack', null);
          navigator.mediaSession.setActionHandler('seekto', null);
          try {
            const mediaSession = navigator.mediaSession as MediaSession & {
              setActionHandler(action: 'togglefavorite', handler: MediaSessionActionHandler | null): void;
            };
            mediaSession.setActionHandler('togglefavorite', null);
          } catch (error) {
            // togglefavorite might not be supported
          }
        }
      };
    } catch (error) {
      console.error('MediaSession setup failed:', error);
    }
  }, [currentTrack, isPlaying, isClient, playPreviousTrack, playNextTrack, onTrackPlay, onTrackPause, toggleCurrentTrackStar]);
  
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation(); // Prevent triggering fullscreen
    if (audioCurrent && currentTrack) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * audioCurrent.duration;
      audioCurrent.currentTime = newTime;
      
      // Save the new position immediately
      localStorage.setItem('navidrome-current-track-time', newTime.toString());
    }
  };

  const togglePlayPause = async () => {
    if (audioCurrent && currentTrack) {
      // Detect if running as PWA
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      
      if (isPlaying) {
        audioCurrent.pause();
        setIsPlaying(false);
        onTrackPause(currentTrack, audioCurrent.currentTime);
      } else {
        try {
          // PWA-specific initialization if needed
          if (isPWA && !audioInitialized) {
            try {
              const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
              if (AudioContextClass) {
                const audioContext = new AudioContextClass();
                if (audioContext.state === 'suspended') {
                  await audioContext.resume();
                }
                setAudioInitialized(true);
              }
            } catch (contextError) {
              console.error('PWA audio context initialization failed:', contextError);
            }
          }
          
          // On mobile, ensure audio element is properly loaded before playing
          if (isMobile) {
            // Ensure the audio element has the correct source
            if (audioCurrent.src !== currentTrack.url) {
              audioCurrent.src = currentTrack.url;
              audioCurrent.load();
            }
            
            // Wait for the audio to be ready to play
            if (audioCurrent.readyState < 3) { // HAVE_FUTURE_DATA
              await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                  audioCurrent.removeEventListener('canplay', handleCanPlay);
                  audioCurrent.removeEventListener('error', handleError);
                  reject(new Error('Audio load timeout'));
                }, 10000);
                
                const handleCanPlay = () => {
                  clearTimeout(timeout);
                  audioCurrent.removeEventListener('canplay', handleCanPlay);
                  audioCurrent.removeEventListener('error', handleError);
                  resolve(void 0);
                };
                const handleError = () => {
                  clearTimeout(timeout);
                  audioCurrent.removeEventListener('canplay', handleCanPlay);
                  audioCurrent.removeEventListener('error', handleError);
                  reject(new Error('Audio failed to load'));
                };
                audioCurrent.addEventListener('canplay', handleCanPlay);
                audioCurrent.addEventListener('error', handleError);
              });
            }
          }

          await audioCurrent.play();
          setIsPlaying(true);
          setAudioInitialized(true);
          onTrackPlay(currentTrack);
        } catch (error) {
          console.error('Failed to play audio:', error);
          
          // Additional mobile-specific handling
          if (isMobile) {
            try {
              // Try creating and resuming audio context
              const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
              if (AudioContextClass) {
                const audioContext = new AudioContextClass();
                if (audioContext.state === 'suspended') {
                  await audioContext.resume();
                }
                setAudioInitialized(true);
              }
              
              // Force load and retry
              audioCurrent.load();
              await new Promise(resolve => setTimeout(resolve, 200)); // Small delay for iOS
              await audioCurrent.play();
              setIsPlaying(true);
              onTrackPlay(currentTrack);
            } catch (retryError) {
              console.error('Audio play retry failed:', retryError);
              setIsPlaying(false);
              
              // Show user-friendly error on mobile
              toast({
                variant: "destructive",
                title: "Playback Error",
                description: isPWA 
                  ? "Unable to play audio in PWA mode. Try refreshing the app or playing in Safari browser."
                  : "Unable to play audio. Please try again or check your connection.",
              });
            }
          } else {
            setIsPlaying(false);
          }
        }
      }
    }
  };

  // Volume control functions for keyboard shortcuts
  const handleVolumeUp = useCallback(() => {
    setVolume(prevVolume => Math.min(1, prevVolume + 0.1));
  }, []);

  const handleVolumeDown = useCallback(() => {
    setVolume(prevVolume => Math.max(0, prevVolume - 0.1));
  }, []);

  const handleToggleMute = useCallback(() => {
    setVolume(prevVolume => prevVolume === 0 ? 1 : 0);
  }, []);

  const { openSpotlight } = useGlobalSearch();

  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    onPlayPause: togglePlayPause,
    onNextTrack: playNextTrack,
    onPreviousTrack: playPreviousTrack,
    onVolumeUp: handleVolumeUp,
    onVolumeDown: handleVolumeDown,
    onToggleMute: handleToggleMute,
    onSpotlightSearch: openSpotlight,
    disabled: !currentTrack || isFullScreen // Disable if no track or in fullscreen (let FullScreenPlayer handle it)
  });

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };
  
  function formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) {
      return "0:00";
    }
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${secs}`;
  }
  
  if (!isClient || !currentTrack) {
    return null;
  }

  // Mobile compact mini player :3
  if (isMobile) {
    return (
      <>
        <div className="fixed bottom-16 left-0 right-0 z-[60] bg-background/95 backdrop-blur-sm border-t shadow-lg mobile-audio-player mobile-safe-bottom">
          <div className="px-4 py-3">
            {/* Progress bar at top for mobile */}
            <div className="mb-3">
              <Progress 
                value={progress} 
                className="h-1 cursor-pointer progress-mobile" 
                onClick={handleProgressClick}
              />
            </div>
            
            <div className="flex items-center justify-between">
              {/* Track info with swipe gestures */}
              <div 
                className="flex items-center flex-1 min-w-0 cursor-pointer"
                onClick={() => setIsFullScreen(true)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <Image 
                  src={currentTrack.coverArt || '/default-user.jpg'} 
                  alt={currentTrack.name} 
                  width={48} 
                  height={48} 
                  className="w-12 h-12 rounded-lg mr-3 shrink-0 shadow-sm" 
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{currentTrack.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
                </div>
              </div>

              {/* Mobile controls - Only heart and play/pause */}
              <div className="flex items-center space-x-2">
                <button 
                  className="p-3 hover:bg-muted/50 rounded-full transition-all duration-200 active:scale-95 touch-manipulation" 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCurrentTrackStar();
                  }}
                  type="button"
                  aria-label={currentTrack.starred ? 'Remove from favorites' : 'Add to favorites'}
                  title={currentTrack.starred ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart 
                    className={`w-4 h-4 ${currentTrack.starred ? 'text-primary fill-primary' : ''}`} 
                  />
                </button>
                <button 
                  className="p-4 hover:bg-muted/50 rounded-full transition-all duration-200 active:scale-95 bg-primary/10 touch-manipulation" 
                  onClick={togglePlayPause}
                  style={{ touchAction: 'manipulation' }}
                  type="button"
                  data-testid="play-pause-button"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <FaPause className="w-5 h-5" /> : <FaPlay className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Full Screen Player for mobile - rendered outside mini player */}
        <FullScreenPlayer 
          isOpen={isFullScreen} 
          onClose={() => setIsFullScreen(false)} 
          onOpenQueue={handleOpenQueue}
        />
        
        {/* Single audio element - shared across all UI states */}
        <audio 
          ref={audioRef} 
          playsInline
          preload="metadata"
          style={{ display: 'none' }}
        />
        <audio ref={preloadAudioRef} hidden preload="metadata" />
      </>
    );
  }

  // Desktop mini player (collapsed state)
  if (isMinimized) {
    return (
      <>
        <DraggableMiniPlayer onExpand={() => setIsMinimized(false)} />
        
        {/* Single audio element - shared across all UI states */}
        <audio 
          ref={audioRef} 
          playsInline
          preload="metadata"
          style={{ display: 'none' }}
        />
        <audio ref={preloadAudioRef} hidden preload="metadata" />
      </>
    );
  }

  // Desktop compact floating player (default state)
  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 z-50">
        <div className="bg-background/95 backdrop-blur-xs border rounded-lg shadow-lg p-3 cursor-pointer hover:scale-[1.01] transition-transform">
          <div className="flex items-center">
            {/* Track info */}
            <div className="flex items-center flex-1 min-w-0">
              <Image 
                src={
                  currentTrack.coverArt && 
                  (currentTrack.coverArt.startsWith('http') || currentTrack.coverArt.startsWith('/'))
                    ? currentTrack.coverArt 
                    : '/default-user.jpg'
                } 
                alt={currentTrack.name} 
                width={48} 
                height={48} 
                className="w-12 h-12 rounded-md mr-4 shrink-0" 
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-base">{currentTrack.name}</p>
                <p className="text-sm text-muted-foreground truncate">{currentTrack.artist}</p>
              </div>
            </div>

            {/* Center section with controls and progress */}
            <div className="flex flex-col items-center flex-1 justify-center">
              {/* Control buttons */}  
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={toggleShuffle} 
                  className={`p-2 hover:bg-gray-700/50 rounded-full transition-colors ${shuffle ? 'text-primary bg-primary/20' : ''}`} 
                  title={shuffle ? 'Shuffle On - Queue is shuffled' : 'Shuffle Off - Click to shuffle queue'}
                >
                  <FaShuffle className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-gray-700/50 rounded-full transition-colors" onClick={playPreviousTrack}>
                  <FaBackward className="w-4 h-4" />
                </button>
                <button className="p-3 hover:bg-gray-700/50 rounded-full transition-colors" onClick={togglePlayPause}>
                  {isPlaying ? <FaPause className="w-5 h-5" /> : <FaPlay className="w-5 h-5" />}
                </button>
                <button className="p-2 hover:bg-gray-700/50 rounded-full transition-colors" onClick={playNextTrack}>
                  <FaForward className="w-4 h-4" />
                </button>
                <button 
                  className="p-2 hover:bg-gray-700/50 rounded-full transition-colors flex items-center justify-center" 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCurrentTrackStar();
                  }}
                  title={currentTrack.starred ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart 
                    className={`w-5 h-5 ${currentTrack.starred ? 'text-primary fill-primary' : ''}`} 
                  />
                </button>
              </div>
              
              {/* Progress bar */}
              {/* <div className="flex items-center space-x-2 w-80">
                <span className="text-xs text-muted-foreground w-8 text-right">
                  {formatTime(audioCurrent?.currentTime ?? 0)}
                </span>
                <Progress value={progress} className="flex-1 cursor-pointer h-1" onClick={handleProgressClick}/>
                <span className="text-xs text-muted-foreground w-8">
                  {formatTime(audioCurrent?.duration ?? 0)}
                </span>
              </div> */}
            </div>

            {/* Right side buttons */}
            <div className="flex items-center justify-end space-x-2 flex-1">
              <button 
                className="p-2 hover:bg-gray-700/50 rounded-full transition-colors" 
                onClick={() => setIsFullScreen(true)}
                title="Full Screen"
              >
                <FaExpand className="w-4 h-4" />
              </button>
              <button 
                className="p-2 hover:bg-gray-700/50 rounded-full transition-colors" 
                onClick={() => setIsMinimized(true)}
                title="Minimize"
              >
                <FaCompress className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Full Screen Player */}
        <FullScreenPlayer 
          isOpen={isFullScreen} 
          onClose={() => setIsFullScreen(false)} 
          onOpenQueue={handleOpenQueue}
        />
      </div>
      
      {/* Single audio element - shared across all UI states with mobile support */}
      <audio 
        ref={audioRef} 
        playsInline
        preload="metadata"
        style={{ display: 'none' }}
      />
      <audio ref={preloadAudioRef} hidden preload="metadata" />
    </>
  );
};