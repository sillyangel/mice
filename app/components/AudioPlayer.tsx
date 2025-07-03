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

export const AudioPlayer: React.FC = () => {
  const { currentTrack, playPreviousTrack, addToQueue, playNextTrack, clearQueue, queue, toggleShuffle, shuffle, toggleCurrentTrackStar } = useAudioPlayer();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const preloadAudioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isClient, setIsClient] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const audioCurrent = audioRef.current;
  const { toast } = useToast();
  
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
    
    // Clean up old localStorage entries with track IDs
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('navidrome-track-time-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }, []);

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
      if (audioCurrent && currentTrack && audioCurrent.currentTime > 10) {
        localStorage.setItem('navidrome-current-track-time', audioCurrent.currentTime.toString());
      }
    };
  }, [currentTrack]);

  useEffect(() => {
    const audioCurrent = audioRef.current;
    
    if (currentTrack && audioCurrent && audioCurrent.src !== currentTrack.url) {
      // Always clear current track time when changing tracks
      localStorage.removeItem('navidrome-current-track-time');
      
      audioCurrent.src = currentTrack.url;
      
      // Notify scrobbler about new track
      onTrackStart(currentTrack);
      
      // Check for saved timestamp (only restore if more than 10 seconds in)
      const savedTime = localStorage.getItem('navidrome-current-track-time');
      if (savedTime) {
        const time = parseFloat(savedTime);
        // Only restore if we were at least 10 seconds in and not near the end
        if (time > 10 && time < (currentTrack.duration - 30)) {
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
      
      // Auto-play only if the track has the autoPlay flag
      if (currentTrack.autoPlay) {
        audioCurrent.play().then(() => {
          setIsPlaying(true);
          // Notify scrobbler about play
          onTrackPlay(currentTrack);
        }).catch((error) => {
          console.error('Failed to auto-play:', error);
          setIsPlaying(false);
        });
      } else {
        setIsPlaying(false);
      }
    }
  }, [currentTrack, onTrackStart, onTrackPlay]);

  useEffect(() => {
    const audioCurrent = audioRef.current;
    let lastSavedTime = 0;

    const updateProgress = () => {
      if (audioCurrent && currentTrack) {
        setProgress((audioCurrent.currentTime / audioCurrent.duration) * 100);
        
        // Save current time every 30 seconds, but only if we've moved forward significantly
        const currentTime = audioCurrent.currentTime;
        if (Math.abs(currentTime - lastSavedTime) >= 30 && currentTime > 10) {
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

  // Media Session API integration
  useEffect(() => {
    if (!isClient || !currentTrack || !('mediaSession' in navigator)) return;

    // Set metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.name,
      artist: currentTrack.artist,
      album: currentTrack.album,
      artwork: currentTrack.coverArt ? [
        { src: currentTrack.coverArt, sizes: '512x512', type: 'image/jpeg' }
      ] : undefined,
    });

    // Set playback state
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    // Set action handlers
    navigator.mediaSession.setActionHandler('play', () => {
      const audioCurrent = audioRef.current;
      if (audioCurrent && currentTrack) {
        audioCurrent.play();
        setIsPlaying(true);
        onTrackPlay(currentTrack);
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

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      }
    };
  }, [currentTrack, isPlaying, isClient, playPreviousTrack, playNextTrack, onTrackPlay, onTrackPause]);
  
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (audioCurrent && currentTrack) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * audioCurrent.duration;
      audioCurrent.currentTime = newTime;
      
      // Save the new position immediately
      localStorage.setItem('navidrome-current-track-time', newTime.toString());
    }
  };

  const togglePlayPause = () => {
    if (audioCurrent && currentTrack) {
      if (isPlaying) {
        audioCurrent.pause();
        setIsPlaying(false);
        onTrackPause(audioCurrent.currentTime);
      } else {
        audioCurrent.play().then(() => {
          setIsPlaying(true);
          onTrackPlay(currentTrack);
        }).catch((error) => {
          console.error('Failed to play audio:', error);
          setIsPlaying(false);
        });
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

  // Mini player (collapsed state)
  if (isMinimized) {
    return (
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
        <audio ref={audioRef} hidden />
        <audio ref={preloadAudioRef} hidden preload="metadata" />
      </div>
    );
  }

  // Compact floating player (default state)
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="bg-background/95 backdrop-blur-xs border rounded-lg shadow-lg p-3 cursor-pointer hover:scale-[1.01] transition-transform">
        <div className="flex items-center">
          {/* Track info */}
          <div className="flex items-center flex-1 min-w-0">
            <Image 
              src={currentTrack.coverArt || '/default-user.jpg'} 
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
      <audio ref={audioRef} hidden />
      <audio ref={preloadAudioRef} hidden preload="metadata" />
      
      {/* Full Screen Player */}
      <FullScreenPlayer 
        isOpen={isFullScreen} 
        onClose={() => setIsFullScreen(false)} 
        onOpenQueue={handleOpenQueue}
      />
    </div>
  );
};