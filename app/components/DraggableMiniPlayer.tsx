'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
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
  FaStar,
  FaRegStar
} from 'react-icons/fa6';
import { extractDominantColor } from '@/lib/image-utils';

interface DraggableMiniPlayerProps {
  onExpand?: () => void;
  onOpenFullScreen?: () => void;
  isPlaying?: boolean;
  onTogglePlayPause?: () => void;
}

export const DraggableMiniPlayer: React.FC<DraggableMiniPlayerProps> = ({ 
  onExpand,
  onOpenFullScreen,
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
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
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

  // Seeking in track via the scrubber line (click or drag)
  const seekToClientX = useCallback((clientX: number) => {
    const audio = document.querySelector('audio');
    const totalDuration = audio?.duration || duration || currentTrack?.duration || 0;
    if (!audio || !totalDuration || !scrubberRef.current) return;

    const rect = scrubberRef.current.getBoundingClientRect();
    if (rect.width === 0) return;
    const clickX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * totalDuration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(ratio * 100);
    try {
      localStorage.setItem('navidrome-current-track-time', newTime.toString());
    } catch {}
  }, [duration, currentTrack?.duration]);

  const handleScrubberMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDragging(true);
    isDraggingRef.current = true;
    seekToClientX(e.clientX);
  };

  const handleScrubberTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.touches.length > 0) {
      setIsDragging(true);
      isDraggingRef.current = true;
      seekToClientX(e.touches[0].clientX);
    }
  };

  // Window listeners for dragging scrubber smoothly across the entire screen
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      seekToClientX(e.clientX);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      if (scrubberRef.current && !scrubberRef.current.contains(e.target as Node)) {
        setIsHoveringScrubber(false);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length === 0) return;
      seekToClientX(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      setIsHoveringScrubber(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [seekToClientX]);

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

  // Dynamic accent color derived from dominantColor for active buttons
  const buttonAccent = useMemo(() => {
    if (!dominantColor) {
      return {
        color: '#22d3ee',
        glow: 'rgba(34, 211, 238, 0.55)',
      };
    }
    const match = dominantColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) {
      return { color: dominantColor, glow: dominantColor };
    }
    let r = parseInt(match[1], 10);
    let g = parseInt(match[2], 10);
    let b = parseInt(match[3], 10);

    // Boost luminance and saturation so active state shines vividly on the tinted dock background
    const max = Math.max(r, g, b);
    if (max > 0) {
      const scale = Math.min(255 / max, 1.45);
      r = Math.min(255, Math.round(r * scale + 35));
      g = Math.min(255, Math.round(g * scale + 35));
      b = Math.min(255, Math.round(b * scale + 35));
    }
    return {
      color: `rgb(${r}, ${g}, ${b})`,
      glow: `rgba(${r}, ${g}, ${b}, 0.65)`,
    };
  }, [dominantColor]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }
    if (onOpenFullScreen) {
      onOpenFullScreen();
    } else {
      handleExpand();
    }
  };

  if (!currentTrack) return null;

  const remainingTime = Math.max(0, duration - currentTime);
  const isScrubberActive = isHoveringScrubber || isDragging;

  return (
    <div 
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 select-none w-[calc(100%-2rem)] max-w-[720px]"
      onDoubleClick={handleDoubleClick}
    >
      <div 
        className="relative overflow-visible backdrop-blur-2xl border rounded-full shadow-2xl transition-all duration-300 px-4 sm:px-5 h-[68px] flex items-center justify-between gap-3"
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
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Shuffle Button: Dominant cover accent color when on */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleShuffle();
            }}
            style={
              shuffle
                ? {
                    color: buttonAccent.color,
                    filter: `drop-shadow(0 0 6px ${buttonAccent.glow})`,
                  }
                : undefined
            }
            className={`p-2 rounded-full cursor-pointer transition-colors active:scale-95 ${
              shuffle ? '' : 'text-white/60 hover:text-white'
            }`}
            title={shuffle ? 'Shuffle On' : 'Shuffle Off'}
          >
            <FaShuffle className="w-4 h-4" />
          </button>

          {/* Previous Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              playPreviousTrack();
            }}
            className="p-2 text-white/80 hover:text-white active:scale-95 transition-colors cursor-pointer"
            title="Previous Track"
          >
            <FaBackwardStep className="w-4 h-4" />
          </button>

          {/* Play / Pause Button */}
          <button
            onClick={handleTogglePlayPause}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform cursor-pointer hover:bg-white/10"
            title={isPlayingState ? 'Pause' : 'Play'}
          >
            {isPlayingState ? (
              <FaPause className="w-[18px] h-[18px]" />
            ) : (
              <FaPlay className="w-[18px] h-[18px] ml-0.5" />
            )}
          </button>

          {/* Next Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              playNextTrack();
            }}
            className="p-2 text-white/80 hover:text-white active:scale-95 transition-colors cursor-pointer"
            title="Next Track"
          >
            <FaForwardStep className="w-4 h-4" />
          </button>

          {/* Loop / Repeat Button: Dominant cover accent color when on */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLoop();
            }}
            style={
              isLooping
                ? {
                    color: buttonAccent.color,
                    filter: `drop-shadow(0 0 6px ${buttonAccent.glow})`,
                  }
                : undefined
            }
            className={`p-2 rounded-full cursor-pointer transition-colors active:scale-95 ${
              isLooping ? '' : 'text-white/60 hover:text-white'
            }`}
            title={isLooping ? 'Repeat On' : 'Repeat Off'}
          >
            <FaRepeat className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Track Display & Interactive Apple Music Scrubber */}
        <div className="flex-1 min-w-0 max-w-[440px] mx-1 relative h-full flex flex-col justify-center px-1.5 pb-2.5">
          {/* Main Info Layer: Artwork, Title/Artist Links, and Ellipsis (...) button
              Positioned with comfortable clearance above the bottom scrubber line.
              When scrubber is hovered/dragged: softly blurs so timestamps can be read easily. */}
          <div 
            className="flex items-center justify-between gap-2.5 w-full transition-all duration-200"
            onMouseEnter={() => {
              if (!isDragging) setIsHoveringScrubber(false);
            }}
          >
            {/* Artwork + Title/Artist block */}
            <div className={`flex items-center gap-3 min-w-0 flex-1 transition-all duration-200 ${
              isScrubberActive ? 'filter blur-[2px] opacity-30 select-none pointer-events-none' : 'opacity-100'
            }`}>
              <div 
                className="group/cover relative w-10 h-10 rounded-lg overflow-hidden shrink-0 shadow-sm cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenFullScreen) {
                    onOpenFullScreen();
                  } else {
                    handleExpand();
                  }
                }}
                title="Open fullscreen player"
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
                  sizes="40px"
                  priority
                />
                {/* Diagonal expand icon overlay on hover */}
                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <svg className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 3 3 3 3 9" />
                    <polyline points="15 21 21 21 21 15" />
                    <line x1="3" y1="3" x2="10" y2="10" />
                    <line x1="21" y1="21" x2="14" y2="14" />
                  </svg>
                </div>
              </div>

              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <Link
                  href={currentTrack.albumId ? `/album/${currentTrack.albumId}` : '#'}
                  onClick={(e) => e.stopPropagation()}
                  className="font-semibold text-sm text-white truncate leading-tight block hover:underline cursor-pointer"
                  title={`Go to album: ${currentTrack.album || currentTrack.name}`}
                >
                  {currentTrack.name}
                </Link>
                <Link
                  href={currentTrack.artistId ? `/artist/${currentTrack.artistId}` : `/artist/${encodeURIComponent(currentTrack.artist)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-white/70 hover:text-white truncate leading-tight block hover:underline transition-colors mt-0.5 cursor-pointer"
                  title={`Go to artist: ${currentTrack.artist}`}
                >
                  {currentTrack.artist}
                </Link>
              </div>
            </div>

            {/* Star Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleCurrentTrackStar();
              }}
              className={`p-2 transition-all duration-200 shrink-0 cursor-pointer ${
                isScrubberActive ? 'filter blur-[2px] opacity-30 select-none pointer-events-none' : 'opacity-100'
              } ${
                currentTrack.starred 
                  ? 'text-yellow-400 hover:text-yellow-300 drop-shadow-[0_0_6px_rgba(250,204,21,0.55)]' 
                  : 'text-white/60 hover:text-white'
              }`}
              title={currentTrack.starred ? 'Starred' : 'Star track'}
            >
              {currentTrack.starred ? (
                <FaStar className="w-[18px] h-[18px]" />
              ) : (
                <FaRegStar className="w-[18px] h-[18px]" />
              )}
            </button>
          </div>

          {/* Hover Time Labels Overlay: Positioned cleanly above the scrubber line */}
          <div className={`absolute inset-x-2 bottom-[16px] flex items-end justify-between pointer-events-none transition-opacity duration-200 z-10 ${
            isScrubberActive ? 'opacity-100' : 'opacity-0'
          }`}>
            <span className="text-[11px] font-medium text-white tabular-nums leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] select-none">
              {formatTime(currentTime)}
            </span>
            <span className="text-[11px] font-medium text-white tabular-nums leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] select-none">
              -{formatTime(remainingTime)}
            </span>
          </div>

          {/* Scrubber Bar: Anchored at bottom with clear separation from album art.
              Hover state: expands height to 8px upwards without shifting layout.
              Drag enabled across the full track width. */}
          <div 
            ref={scrubberRef}
            className="absolute bottom-1 inset-x-2 h-5 cursor-pointer flex items-center z-20 group/scrubber"
            onMouseEnter={() => setIsHoveringScrubber(true)}
            onMouseLeave={() => {
              if (!isDragging) setIsHoveringScrubber(false);
            }}
            onMouseDown={handleScrubberMouseDown}
            onTouchStart={handleScrubberTouchStart}
          >
            <div className={`w-full rounded-full overflow-hidden transition-all duration-200 ${
              isScrubberActive ? 'h-[8px] bg-white/35 shadow-[0_0_10px_rgba(255,255,255,0.65)]' : 'h-[2.5px] bg-white/20'
            }`}>
              <div 
                className={`h-full rounded-full ${
                  isDragging ? 'transition-none' : 'transition-[width] duration-75'
                } ${
                  isScrubberActive ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]' : 'bg-white'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Queue & Volume */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Queue Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push('/queue');
            }}
            className="p-2 text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Queue"
          >
            <FaListUl className="w-4 h-4" />
          </button>

          {/* Volume Control with Floating Overlay (doesn't push/shift pill layout) */}
          <div className="relative flex items-center" ref={volumeContainerRef}>
            {/* Floating Volume Overlay Bubble */}
            {showVolumeSlider && (
              <div 
                className="absolute right-0 bottom-full mb-3 px-3 py-2 bg-neutral-900/95 backdrop-blur-xl rounded-full border border-white/15 shadow-2xl flex items-center gap-2.5 z-[60] animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
                style={{
                  boxShadow: dominantColor
                    ? `0 12px 28px -6px ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.45)')}, 0 8px 18px rgba(0,0,0,0.6)`
                    : '0 12px 28px -6px rgba(0,0,0,0.7), 0 8px 18px rgba(0,0,0,0.5)',
                }}
              >
                <div className="relative w-24 h-2 bg-white/20 rounded-full overflow-hidden cursor-pointer">
                  <div 
                    className="h-full bg-white rounded-full transition-[width] duration-75" 
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
                <span className="text-[10px] font-medium text-white/80 tabular-nums select-none min-w-[24px] text-right">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowVolumeSlider((prev) => !prev);
              }}
              className="p-2 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Volume"
            >
              {volume === 0 ? (
                <FaVolumeXmark className="w-4 h-4" />
              ) : volume < 0.5 ? (
                <FaVolumeLow className="w-4 h-4" />
              ) : (
                <FaVolumeHigh className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AppleMusicMiniPlayer = DraggableMiniPlayer;
export default DraggableMiniPlayer;
