'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAudioPlayer } from './AudioPlayerContext';
import { 
  FaPlay, 
  FaPause, 
  FaExpand, 
  FaBackwardStep, 
  FaForwardStep, 
  FaVolumeHigh, 
  FaVolumeXmark, 
  FaVolumeLow,
  FaShuffle,
  FaRepeat,
  FaListUl,
  FaEllipsis
} from 'react-icons/fa6';
import { extractDominantColor } from '@/lib/image-utils';

interface DraggableMiniPlayerProps {
  onExpand?: () => void;
  isPlaying?: boolean;
  onTogglePlayPause?: () => void;
}

export const DraggableMiniPlayer: React.FC<DraggableMiniPlayerProps> = ({ 
  onExpand,
  isPlaying: isPlayingProp,
  onTogglePlayPause
}) => {
  const router = useRouter();
  const { 
    currentTrack, 
    playPreviousTrack, 
    playNextTrack,
    shuffle,
    toggleShuffle,
    setIsMinimized,
    toggleCurrentTrackStar
  } = useAudioPlayer();

  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isHoveringScrubber, setIsHoveringScrubber] = useState(false);
  const volumeContainerRef = useRef<HTMLDivElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);

  // Sync isPlaying directly with prop and native audio element events
  const [isPlayingState, setIsPlayingState] = useState(() => {
    if (isPlayingProp !== undefined) return isPlayingProp;
    const audio = typeof document !== 'undefined' ? document.querySelector('audio') : null;
    return audio ? (!audio.paused && !audio.ended && audio.currentTime > 0) : false;
  });

  useEffect(() => {
    if (isPlayingProp !== undefined) {
      setIsPlayingState(isPlayingProp);
    }
  }, [isPlayingProp]);

  // Audio element listeners for play/pause and progress synchronization
  useEffect(() => {
    const audio = document.querySelector('audio');
    if (!audio) return;

    const onPlay = () => setIsPlayingState(true);
    const onPause = () => setIsPlayingState(false);

    // Initial check from actual DOM audio element
    if (!audio.paused && !audio.ended && audio.currentTime > 0) {
      setIsPlayingState(true);
    }

    const updateTime = () => {
      const cur = audio.currentTime || 0;
      const dur = audio.duration || currentTrack?.duration || 0;
      setCurrentTime(cur);
      setDuration(dur);
      if (dur > 0) {
        setProgress((cur / dur) * 100);
      }
    };

    const updateVolume = () => {
      setVolume(audio.volume);
    };

    updateTime();
    updateVolume();

    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onPause);
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateTime);
    audio.addEventListener('durationchange', updateTime);
    audio.addEventListener('volumechange', updateVolume);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onPause);
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateTime);
      audio.removeEventListener('durationchange', updateTime);
      audio.removeEventListener('volumechange', updateVolume);
    };
  }, [currentTrack]);

  // Loop / Repeat state with localStorage persistence
  const [isLooping, setIsLooping] = useState(() => {
    try {
      return localStorage.getItem('player-loop') === 'true';
    } catch {
      return false;
    }
  });

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('player-loop', String(next));
      } catch {}
      const audio = document.querySelector('audio');
      if (audio) {
        audio.loop = next;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const audio = document.querySelector('audio');
    if (audio) {
      audio.loop = isLooping;
    }
  }, [isLooping, currentTrack]);

  const handleTogglePlayPause = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onTogglePlayPause) {
      await onTogglePlayPause();
      const audio = document.querySelector('audio');
      if (audio) {
        setIsPlayingState(!audio.paused);
      }
      return;
    }

    const audio = document.querySelector('audio');
    if (audio) {
      if (audio.paused) {
        try {
          await audio.play();
          setIsPlayingState(true);
        } catch (err) {
          console.error('Play failed:', err);
        }
      } else {
        audio.pause();
        setIsPlayingState(false);
      }
    }
  };

  const handleExpand = useCallback(() => {
    if (onExpand) {
      onExpand();
    } else {
      setIsMinimized(false);
    }
  }, [onExpand, setIsMinimized]);

  // Extract dominant color from album art to tint the player
  useEffect(() => {
    if (!currentTrack?.coverArt) {
      setDominantColor(null);
      return;
    }
    
    extractDominantColor(currentTrack.coverArt)
      .then(color => setDominantColor(color))
      .catch(() => setDominantColor(null));
  }, [currentTrack?.coverArt]);

  // Close volume popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (volumeContainerRef.current && !volumeContainerRef.current.contains(e.target as Node)) {
        setShowVolumeSlider(false);
      }
    };
    if (showVolumeSlider) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showVolumeSlider]);

  // Seeking in track via the scrubber line
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const audio = document.querySelector('audio');
    const totalDuration = audio?.duration || duration || currentTrack?.duration || 0;
    if (!audio || !totalDuration || !scrubberRef.current) return;

    const rect = scrubberRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * totalDuration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(ratio * 100);
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = document.querySelector('audio');
    if (!audio) return;
    
    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setVolume(newVolume);
    
    try {
      localStorage.setItem('navidrome-volume', newVolume.toString());
    } catch {}
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }
    handleExpand();
  };

  if (!currentTrack) return null;

  const remainingTime = Math.max(0, duration - currentTime);

  return (
    <div 
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 select-none w-[calc(100%-2rem)] max-w-[680px]"
      onDoubleClick={handleDoubleClick}
    >
      <div 
        className="relative overflow-hidden backdrop-blur-2xl border rounded-full shadow-2xl transition-all duration-300 px-4 h-[52px] flex items-center justify-between gap-2.5"
        style={{
          backgroundColor: dominantColor 
            ? `${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.65)')}` 
            : 'rgba(24, 23, 22, 0.90)',
          borderColor: dominantColor 
            ? `${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.35)')}` 
            : 'rgba(255, 255, 255, 0.12)',
          boxShadow: dominantColor
            ? `0 16px 40px -8px ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.45)')}, 0 8px 24px rgba(0,0,0,0.6)`
            : '0 16px 40px -8px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.5)',
        }}
      >
        {/* Left Side: Playback Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Shuffle Button: Cyan when on, muted when off */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleShuffle();
            }}
            className={`p-1.5 rounded-full transition-colors active:scale-95 ${
              shuffle 
                ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.55)]' 
                : 'text-white/60 hover:text-white'
            }`}
            title={shuffle ? 'Shuffle On' : 'Shuffle Off'}
          >
            <FaShuffle className="w-3.5 h-3.5" />
          </button>

          {/* Previous Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              playPreviousTrack();
            }}
            className="p-1.5 text-white/80 hover:text-white active:scale-95 transition-colors"
            title="Previous Track"
          >
            <FaBackwardStep className="w-3.5 h-3.5" />
          </button>

          {/* Play / Pause Button */}
          <button
            onClick={handleTogglePlayPause}
            className="p-1.5 text-white hover:scale-105 active:scale-95 transition-transform"
            title={isPlayingState ? 'Pause' : 'Play'}
          >
            {isPlayingState ? (
              <FaPause className="w-4 h-4" />
            ) : (
              <FaPlay className="w-4 h-4 ml-0.5" />
            )}
          </button>

          {/* Next Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              playNextTrack();
            }}
            className="p-1.5 text-white/80 hover:text-white active:scale-95 transition-colors"
            title="Next Track"
          >
            <FaForwardStep className="w-3.5 h-3.5" />
          </button>

          {/* Loop / Repeat Button: Cyan when on, muted when off */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLoop();
            }}
            className={`p-1.5 rounded-full transition-colors active:scale-95 ${
              isLooping 
                ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.55)]' 
                : 'text-white/60 hover:text-white'
            }`}
            title={isLooping ? 'Repeat On' : 'Repeat Off'}
          >
            <FaRepeat className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: Track Display & Interactive Apple Music Scrubber */}
        <div 
          className="flex-1 min-w-0 max-w-[340px] mx-1 relative h-10 flex flex-col justify-center px-1 group/scrubber cursor-pointer"
          onMouseEnter={() => setIsHoveringScrubber(true)}
          onMouseLeave={() => setIsHoveringScrubber(false)}
          onClick={handleScrubberClick}
          ref={scrubberRef}
        >
          {/* Normal State: Album Artwork, Title, and Artist/Album */}
          <div className={`flex items-center gap-2 transition-all duration-200 ${
            isHoveringScrubber ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
          }`}>
            <div 
              className="relative w-7 h-7 rounded-md overflow-hidden shrink-0 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handleExpand();
              }}
              title="Expand player"
            >
              <Image
                src={
                  currentTrack.coverArt && 
                  (currentTrack.coverArt.startsWith('http') || currentTrack.coverArt.startsWith('/'))
                    ? currentTrack.coverArt 
                    : '/default-user.jpg'
                }
                alt={currentTrack.name}
                fill
                className="object-cover"
                sizes="28px"
                priority
              />
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <span 
                className="font-semibold text-xs text-white truncate leading-tight block hover:underline"
                title={currentTrack.name}
              >
                {currentTrack.name}
              </span>
              <span 
                className="text-[11px] text-white/60 truncate leading-tight block"
                title={`${currentTrack.artist} — ${currentTrack.album || currentTrack.name}`}
              >
                {currentTrack.artist} — {currentTrack.album || currentTrack.name}
              </span>
            </div>
          </div>

          {/* Normal State: Sleek Hairline Scrubber below track metadata */}
          <div className={`w-full transition-opacity duration-200 mt-1 ${
            isHoveringScrubber ? 'opacity-0' : 'opacity-100'
          }`}>
            <div className="w-full h-[2.5px] bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-[width] duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Hover State: Scrubber Bar with Current Time on Left and Remaining Time on Right */}
          <div className={`absolute inset-0 flex items-center justify-between gap-2.5 transition-all duration-200 ${
            isHoveringScrubber ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
          }`}>
            <span className="text-[11px] font-medium text-white/90 tabular-nums select-none shrink-0 w-8 text-left">
              {formatTime(currentTime)}
            </span>

            <div className="flex-1 h-[4px] bg-white/25 rounded-full overflow-hidden relative">
              <div 
                className="h-full bg-white rounded-full shadow-sm transition-[width] duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>

            <span className="text-[11px] font-medium text-white/90 tabular-nums select-none shrink-0 w-9 text-right">
              -{formatTime(remainingTime)}
            </span>
          </div>
        </div>

        {/* Right Side: Options, Queue, Volume, Expand */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* More options (...) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCurrentTrackStar();
            }}
            className="p-1.5 text-white/60 hover:text-white transition-colors"
            title={currentTrack.starred ? 'Starred' : 'More'}
          >
            <FaEllipsis className="w-3.5 h-3.5" />
          </button>

          {/* Queue Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push('/queue');
            }}
            className="p-1.5 text-white/60 hover:text-white transition-colors"
            title="Queue"
          >
            <FaListUl className="w-3.5 h-3.5" />
          </button>

          {/* Volume Control with Popover / Inline Slider */}
          <div className="relative flex items-center" ref={volumeContainerRef}>
            {/* Inline Volume Capsule */}
            {showVolumeSlider && (
              <div 
                className="mr-1.5 px-2 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative w-16 sm:w-20 h-1.5 bg-white/25 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full" 
                    style={{ width: `${volume * 100}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title={`Volume: ${Math.round(volume * 100)}%`}
                  />
                </div>
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowVolumeSlider((prev) => !prev);
              }}
              className="p-1.5 text-white/70 hover:text-white transition-colors"
              title="Volume"
            >
              {volume === 0 ? (
                <FaVolumeXmark className="w-3.5 h-3.5" />
              ) : volume < 0.5 ? (
                <FaVolumeLow className="w-3.5 h-3.5" />
              ) : (
                <FaVolumeHigh className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Expand to Normal Player Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExpand();
            }}
            className="p-1.5 text-white/60 hover:text-white transition-colors"
            title="Expand player"
          >
            <FaExpand className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const AppleMusicMiniPlayer = DraggableMiniPlayer;
export default DraggableMiniPlayer;
