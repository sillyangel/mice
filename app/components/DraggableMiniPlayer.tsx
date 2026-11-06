'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAudioPlayer } from './AudioPlayerContext';
import { 
  FaPlay, 
  FaPause, 
  FaExpand, 
  FaForward, 
  FaBackward, 
  FaVolumeHigh, 
  FaVolumeXmark, 
  FaShuffle 
} from 'react-icons/fa6';
import { Heart } from 'lucide-react';
import { extractDominantColor } from '@/lib/image-utils';

interface DraggableMiniPlayerProps {
  onExpand?: () => void;
}

export const DraggableMiniPlayer: React.FC<DraggableMiniPlayerProps> = ({ onExpand }) => {
  const { 
    currentTrack, 
    playPreviousTrack, 
    playNextTrack,
    toggleCurrentTrackStar,
    isPlaying,
    togglePlayPause,
    shuffle,
    toggleShuffle,
    setIsMinimized
  } = useAudioPlayer();

  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [volume, setVolume] = useState(1);
  const volumeContainerRef = useRef<HTMLDivElement>(null);

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
      .catch(error => {
        console.error('Failed to extract color:', error);
        setDominantColor(null);
      });
  }, [currentTrack?.coverArt]);

  // Track progress and volume from main audio player via native media events
  useEffect(() => {
    const audioElement = document.querySelector('audio') as HTMLAudioElement | null;
    if (!audioElement) return;

    const updateProgress = () => {
      if (audioElement.duration && !isNaN(audioElement.duration)) {
        setProgress((audioElement.currentTime / audioElement.duration) * 100);
      }
    };

    const updateVolume = () => {
      setVolume(audioElement.volume);
    };

    updateProgress();
    updateVolume();

    audioElement.addEventListener('timeupdate', updateProgress);
    audioElement.addEventListener('loadedmetadata', updateProgress);
    audioElement.addEventListener('volumechange', updateVolume);

    return () => {
      audioElement.removeEventListener('timeupdate', updateProgress);
      audioElement.removeEventListener('loadedmetadata', updateProgress);
      audioElement.removeEventListener('volumechange', updateVolume);
    };
  }, [currentTrack]);

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

  // Seeking in track via the top hairline scrubber
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const audioElement = document.querySelector('audio') as HTMLAudioElement | null;
    if (!audioElement || !audioElement.duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    audioElement.currentTime = ratio * audioElement.duration;
    setProgress(ratio * 100);
  };
  
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audioElement = document.querySelector('audio') as HTMLAudioElement | null;
    if (!audioElement) return;
    
    const newVolume = parseFloat(e.target.value);
    audioElement.volume = newVolume;
    setVolume(newVolume);
    
    try {
      localStorage.setItem('navidrome-volume', newVolume.toString());
    } catch (error) {
      console.error('Failed to save volume:', error);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }
    handleExpand();
  };

  if (!currentTrack) return null;

  return (
    <div 
      className="fixed bottom-3 left-4 right-4 z-50 select-none"
      onDoubleClick={handleDoubleClick}
    >
      <div 
        className="relative overflow-hidden backdrop-blur-xl border rounded-xl shadow-2xl transition-all duration-300 hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.6)]"
        style={{
          backgroundColor: dominantColor 
            ? `${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.70)')}` 
            : 'rgba(20, 21, 23, 0.92)',
          borderColor: dominantColor 
            ? `${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.35)')}` 
            : 'rgba(255, 255, 255, 0.12)',
          boxShadow: dominantColor
            ? `0 12px 32px -8px ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.45)')}`
            : undefined,
        }}
      >
        {/* Apple Music Hairline Progress Scrubber at Top Edge */}
        <div 
          className="relative w-full h-[3px] bg-white/10 hover:h-[5px] cursor-pointer group/progress transition-all duration-150"
          onClick={handleProgressClick}
          title="Seek track"
        >
          <div 
            className="h-full bg-white/90 group-hover/progress:bg-primary transition-[width] duration-75 relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-sm" />
          </div>
        </div>

        {/* Apple Music Compact Bar Row */}
        <div className="flex items-center justify-between px-3.5 py-1.5 h-11 gap-3">
          {/* Left: Album Artwork + Track Info */}
          <div className="flex items-center min-w-0 flex-1 max-w-[35%] gap-2.5">
            <div 
              className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
              onClick={handleExpand}
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
                sizes="32px"
                priority
              />
            </div>

            <div className="flex flex-col min-w-0">
              <Link
                href={currentTrack.albumId ? `/album/${currentTrack.albumId}` : '#'}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-xs text-white truncate block hover:underline leading-tight transition-colors"
                title={`Go to album: ${currentTrack.album || currentTrack.name}`}
              >
                {currentTrack.name}
              </Link>
              <Link
                href={currentTrack.artistId ? `/artist/${currentTrack.artistId}` : `/artist/${encodeURIComponent(currentTrack.artist)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] text-white/70 hover:text-white truncate block hover:underline leading-tight transition-colors"
                title={`Go to artist: ${currentTrack.artist}`}
              >
                {currentTrack.artist}
              </Link>
            </div>
          </div>

          {/* Center: Apple Music-style Controls */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Shuffle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleShuffle();
              }}
              className={`p-1.5 rounded-full transition-colors ${
                shuffle 
                  ? 'text-primary bg-primary/20' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title={shuffle ? 'Shuffle On' : 'Shuffle Off'}
            >
              <FaShuffle className="w-3 h-3" />
            </button>

            {/* Previous */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                playPreviousTrack();
              }}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors active:scale-95"
              title="Previous Track"
            >
              <FaBackward className="w-3.5 h-3.5" />
            </button>

            {/* Play / Pause */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white transition-all shadow-sm"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <FaPause className="w-3 h-3" />
              ) : (
                <FaPlay className="w-3 h-3 ml-0.5" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                playNextTrack();
              }}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors active:scale-95"
              title="Next Track"
            >
              <FaForward className="w-3.5 h-3.5" />
            </button>

            {/* Star / Favorite */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleCurrentTrackStar();
              }}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              title={currentTrack.starred ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  currentTrack.starred ? 'text-primary fill-primary' : ''
                }`}
              />
            </button>
          </div>

          {/* Right: Volume & Expand */}
          <div className="flex items-center justify-end gap-1.5 flex-1 max-w-[35%]">
            {/* Volume */}
            <div className="relative" ref={volumeContainerRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowVolumeSlider((prev) => !prev);
                }}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Volume"
              >
                {volume === 0 ? (
                  <FaVolumeXmark className="w-3.5 h-3.5" />
                ) : (
                  <FaVolumeHigh className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Volume Popover */}
              {showVolumeSlider && (
                <div 
                  className="absolute bottom-full right-0 mb-2 p-2.5 bg-background/95 backdrop-blur-md border border-white/15 rounded-lg shadow-xl z-50 flex items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-24 accent-primary cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Expand button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExpand();
              }}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              title="Expand player"
            >
              <FaExpand className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AppleMusicMiniPlayer = DraggableMiniPlayer;
export default DraggableMiniPlayer;
