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

export const AudioPlayer: React.FC = () => {
  const { currentTrack, playPreviousTrack, addToQueue, playNextTrack, clearQueue, queue, toggleShuffle, shuffle, toggleCurrentTrackStar } = useAudioPlayer();
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

  const onTrackPause = useCallback((currentTime: number) => {
    navidromeOnTrackPause(currentTime);
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
    
    // Mobile-specific audio initialization
    if (isMobile) {
      // Detect if running as PWA
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      
      console.log('🔍 Audio initialization debug:', {
        isMobile,
        isPWA,
        audioInitialized,
        userAgent: navigator.userAgent
      });
      
      // Add a document click listener to initialize audio context on first user interaction
      const initializeAudioOnMobile = async () => {
        if (!audioInitialized) {
          try {
            console.log('🎵 Initializing mobile audio context...', { isPWA });
            
            const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (AudioContextClass) {
              const audioContext = new AudioContextClass();
              console.log('Audio context state:', audioContext.state);
              
              if (audioContext.state === 'suspended') {
                console.log('Resuming suspended audio context...');
                await audioContext.resume();
                console.log('Audio context resumed, new state:', audioContext.state);
              }
              
              // For PWA, we need to explicitly unlock audio
              if (isPWA && audioRef.current) {
                console.log('PWA detected, performing audio unlock...');
                
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
                  console.log('✅ PWA audio unlock successful');
                } catch (unlockError) {
                  console.log('⚠️ PWA audio unlock failed:', unlockError);
                }
              }
              
              setAudioInitialized(true);
              console.log('✅ Mobile audio context initialized successfully');
            }
          } catch (error) {
            console.log('❌ Mobile audio context initialization failed:', error);
          }
        }
      };

      // Listen for any user interaction to initialize audio
      const handleFirstUserInteraction = () => {
        console.log('🎯 First user interaction detected, initializing audio...');
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
  }, [isMobile, audioInitialized, volume]);

  // Apply volume to audio element when volume changes
  useEffect(() => {
    const audioCurrent = audioRef.current;
    if (audioCurrent) {
      audioCurrent.volume = volume;
    }
    // Save volume to localStorage
    localStorage.setItem('navidrome-volume', volume.toString());
  }, [volume]);

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
    
    if (currentTrack && audioCurrent && audioCurrent.src !== currentTrack.url) {
      // Always clear current track time when changing tracks
      localStorage.removeItem('navidrome-current-track-time');
      
      console.log('🔄 Setting audio source:', currentTrack.url);
      
      // Debug: Check if URL is valid
      if (!currentTrack.url || currentTrack.url === 'undefined' || currentTrack.url === '') {
        console.error('❌ Invalid audio URL:', currentTrack.url);
        return;
      }
      
      // Debug: Log current audio element state
      console.log('🔍 Audio element state before loading:', {
        src: audioCurrent.src,
        readyState: audioCurrent.readyState,
        networkState: audioCurrent.networkState,
        crossOrigin: audioCurrent.crossOrigin,
        canPlayType_mp3: audioCurrent.canPlayType('audio/mpeg'),
        canPlayType_mp4: audioCurrent.canPlayType('audio/mp4'),
        canPlayType_webm: audioCurrent.canPlayType('audio/webm'),
        canPlayType_ogg: audioCurrent.canPlayType('audio/ogg'),
        canPlayType_flac: audioCurrent.canPlayType('audio/flac'),
        canPlayType_wav: audioCurrent.canPlayType('audio/wav')
      });
      
      // Clear any previous error handlers
      audioCurrent.onerror = null;
      audioCurrent.onloadstart = null;
      audioCurrent.oncanplay = null;
      
      // Simple error handling
      audioCurrent.onerror = (e) => {
        const event = e as Event;
        const error = event.target as HTMLAudioElement;
        console.error('❌ Audio element error:', {
          error: error.error,
          networkState: error.networkState,
          readyState: error.readyState,
          src: error.src
        });
      };
      
      audioCurrent.onloadstart = () => {
        console.log('📥 Audio load started');
      };
      
      audioCurrent.oncanplay = () => {
        console.log('✅ Audio can play');
      };
      
      // Set source without any CORS configuration
      audioCurrent.removeAttribute('crossorigin');
      audioCurrent.src = currentTrack.url;
      
      // Force load and log state after setting source
      audioCurrent.load();
      
      // Log state after load
      setTimeout(() => {
        console.log('🔍 Audio element state after load:', {
          src: audioCurrent.src,
          readyState: audioCurrent.readyState,
          networkState: audioCurrent.networkState,
          error: audioCurrent.error,
          duration: audioCurrent.duration
        });
      }, 100);
      
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
            console.log('Auto-play failed on mobile - user interaction required');
          }
        });
      } else {
        setIsPlaying(false);
      }
    }
  }, [currentTrack, onTrackStart, onTrackPlay, isMobile, audioInitialized]);

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
        onTrackPause(audioCurrent.currentTime);
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
  }, [playNextTrack, currentTrack, onTrackProgress, onTrackEnd, onTrackPlay, onTrackPause]);

  // Media Session API integration - Enhanced for mobile
  useEffect(() => {
    if (!isClient || !currentTrack) return;
    
    // Check if MediaSession is supported
    if (!('mediaSession' in navigator)) {
      console.log('MediaSession API not supported');
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
          onTrackPause(audioCurrent.currentTime);
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
        console.log('togglefavorite action not supported:', error);
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
            console.log('Position state update failed:', error);
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
      
      console.log('🎵 togglePlayPause called:', {
        isPlaying,
        isMobile,
        isPWA,
        audioInitialized,
        currentTrackUrl: currentTrack.url,
        audioSrc: audioCurrent.src,
        audioReadyState: audioCurrent.readyState
      });
      
      if (isPlaying) {
        console.log('⏸️ Pausing audio');
        audioCurrent.pause();
        setIsPlaying(false);
        onTrackPause(audioCurrent.currentTime);
      } else {
        try {
          // PWA-specific initialization if needed
          if (isPWA && !audioInitialized) {
            console.log('🔧 PWA detected - initializing audio context...');
            try {
              const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
              if (AudioContextClass) {
                const audioContext = new AudioContextClass();
                if (audioContext.state === 'suspended') {
                  await audioContext.resume();
                }
                setAudioInitialized(true);
                console.log('✅ PWA audio context initialized');
              }
            } catch (contextError) {
              console.log('⚠️ PWA audio context initialization failed:', contextError);
            }
          }
          
          // On mobile, ensure audio element is properly loaded before playing
          if (isMobile) {
            // Ensure the audio element has the correct source
            if (audioCurrent.src !== currentTrack.url) {
              console.log('🔄 Setting audio source:', currentTrack.url);
              audioCurrent.src = currentTrack.url;
              audioCurrent.load(); // Force reload the audio element
            }
            
            // Wait for the audio to be ready to play
            if (audioCurrent.readyState < 3) { // HAVE_FUTURE_DATA
              console.log('⏳ Waiting for audio to be ready...');
              await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                  audioCurrent.removeEventListener('canplay', handleCanPlay);
                  audioCurrent.removeEventListener('error', handleError);
                  reject(new Error('Audio load timeout'));
                }, 10000); // 10 second timeout
                
                const handleCanPlay = () => {
                  console.log('✅ Audio ready to play');
                  clearTimeout(timeout);
                  audioCurrent.removeEventListener('canplay', handleCanPlay);
                  audioCurrent.removeEventListener('error', handleError);
                  resolve(void 0);
                };
                const handleError = () => {
                  console.log('❌ Audio load error');
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

          console.log('▶️ Attempting to play audio...');
          await audioCurrent.play();
          setIsPlaying(true);
          setAudioInitialized(true);
          onTrackPlay(currentTrack);
          console.log('✅ Audio play successful');
        } catch (error) {
          console.error('❌ Failed to play audio:', error);
          
          // Additional mobile-specific handling
          if (isMobile) {
            try {
              console.log('🔄 Attempting mobile audio recovery...');
              
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
              console.log('🔄 Retrying audio play...');
              await audioCurrent.play();
              setIsPlaying(true);
              onTrackPlay(currentTrack);
              console.log('✅ Audio play retry successful');
            } catch (retryError) {
              console.error('❌ Audio play retry failed:', retryError);
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
        <div className="fixed bottom-4 left-4 z-50">
          <div 
            className="bg-background/95 backdrop-blur-xs border rounded-lg shadow-lg cursor-pointer hover:scale-[1.02] transition-transform w-80"
            onClick={() => setIsMinimized(false)}
          >
            <div className="flex items-center p-3">
              <Image 
                src={currentTrack.coverArt || '/default-user.jpg'} 
                alt={currentTrack.name} 
                width={40} 
                height={40} 
                className="w-10 h-10 rounded-md shrink-0" 
              />
              <div className="flex-1 min-w-0 mx-3">
                <div className="overflow-hidden">
                  <p className="font-semibold text-sm whitespace-nowrap animate-infinite-scroll">
                    {currentTrack.name}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
              </div>
              {/* Heart icon for favoriting */}
              <button 
                className="p-1.5 hover:bg-gray-700/50 rounded-full transition-colors mr-2" 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCurrentTrackStar();
                }}
                title={currentTrack.starred ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart 
                  className={`w-4 h-4 ${currentTrack.starred ? 'text-primary fill-primary' : 'text-gray-400'}`} 
                />
              </button>
              <div className="flex items-center justify-center space-x-2">
            <button className="p-1.5 hover:bg-gray-700/50 rounded-full transition-colors" onClick={playPreviousTrack}>
              <FaBackward className="w-3 h-3" />
            </button>
            <button className="p-2 hover:bg-gray-700/50 rounded-full transition-colors" onClick={togglePlayPause}>
              {isPlaying ? <FaPause className="w-4 h-4" /> : <FaPlay className="w-4 h-4" />}
            </button>
            <button className="p-1.5 hover:bg-gray-700/50 rounded-full transition-colors" onClick={playNextTrack}>
              <FaForward className="w-3 h-3" />
            </button>
          </div>
            </div>
          </div>
        </div>
        
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