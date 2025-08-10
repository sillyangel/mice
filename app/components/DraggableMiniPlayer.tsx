'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import { useAudioPlayer, Track } from './AudioPlayerContext';
import { FaPlay, FaPause, FaExpand, FaForward, FaBackward, FaVolumeHigh, FaVolumeXmark } from 'react-icons/fa6';
import { Heart } from 'lucide-react';
import { constrain } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { extractDominantColor } from '@/lib/image-utils';

interface DraggableMiniPlayerProps {
  onExpand: () => void;
}

export const DraggableMiniPlayer: React.FC<DraggableMiniPlayerProps> = ({ onExpand }) => {
  const { 
    currentTrack, 
    playPreviousTrack, 
    playNextTrack,
    toggleCurrentTrackStar,
    isPlaying,
    togglePlayPause 
  } = useAudioPlayer();

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [volume, setVolume] = useState(1);
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Save position to localStorage when it changes
  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem('mini-player-position', JSON.stringify(position));
    }
  }, [position, isDragging]);

  // Extract dominant color from album art
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

  // Track progress from main audio player
  useEffect(() => {
    const updateProgress = () => {
      const audioElement = document.querySelector('audio') as HTMLAudioElement | null;
      if (audioElement && audioElement.duration) {
        setProgress((audioElement.currentTime / audioElement.duration) * 100);
      }
    };
    
    const updateVolume = () => {
      const audioElement = document.querySelector('audio') as HTMLAudioElement | null;
      if (audioElement) {
        setVolume(audioElement.volume);
      }
    };
    
    const interval = setInterval(updateProgress, 250);
    updateVolume(); // Initial volume
    
    // Set up event listener for volume changes
    const audioElement = document.querySelector('audio');
    if (audioElement) {
      audioElement.addEventListener('volumechange', updateVolume);
    }
    
    return () => {
      clearInterval(interval);
      if (audioElement) {
        audioElement.removeEventListener('volumechange', updateVolume);
      }
    };
  }, [currentTrack]);

  // Detect double clicks for expanding
  const handleContainerClick = useCallback(() => {
    setClickCount(prev => prev + 1);
    
    if (clickTimer) {
      clearTimeout(clickTimer);
    }
    
    const timer = setTimeout(() => {
      // If single click, do nothing
      if (clickCount === 0) {
        // Nothing
      } 
      // If double click, expand
      else if (clickCount === 1) {
        onExpand();
      }
      setClickCount(0);
    }, 300);
    
    setClickTimer(timer as unknown as NodeJS.Timeout);
  }, [clickCount, clickTimer, onExpand]);
  
  // Handle seeking in track
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const audioElement = document.querySelector('audio') as HTMLAudioElement | null;
    if (!audioElement) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    audioElement.currentTime = percent * audioElement.duration;
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

  // Keyboard controls for the mini player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard shortcuts if the mini player is focused
      if (document.activeElement?.tagName === 'INPUT') return;

      const step = e.shiftKey ? 100 : 10; // Larger steps with shift key
      
      switch (e.key) {
        case 'ArrowLeft':
          setPosition(prev => ({
            ...prev,
            x: constrain(
              prev.x - step,
              -(window.innerWidth - (containerRef.current?.offsetWidth || 0)) / 2 + 16,
              (window.innerWidth - (containerRef.current?.offsetWidth || 0)) / 2 - 16
            )
          }));
          break;
        case 'ArrowRight':
          setPosition(prev => ({
            ...prev,
            x: constrain(
              prev.x + step,
              -(window.innerWidth - (containerRef.current?.offsetWidth || 0)) / 2 + 16,
              (window.innerWidth - (containerRef.current?.offsetWidth || 0)) / 2 - 16
            )
          }));
          break;
        case 'ArrowUp':
          setPosition(prev => ({
            ...prev,
            y: constrain(
              prev.y - step,
              -(window.innerHeight - (containerRef.current?.offsetHeight || 0)) / 2 + 16,
              (window.innerHeight - (containerRef.current?.offsetHeight || 0)) / 2 - 16
            )
          }));
          break;
        case 'ArrowDown':
          setPosition(prev => ({
            ...prev,
            y: constrain(
              prev.y + step,
              -(window.innerHeight - (containerRef.current?.offsetHeight || 0)) / 2 + 16,
              (window.innerHeight - (containerRef.current?.offsetHeight || 0)) / 2 - 16
            )
          }));
          break;
        case 'Escape':
          onExpand();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExpand]);

  // Load saved position on mount
  useEffect(() => {
    const savedPosition = localStorage.getItem('mini-player-position');
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        setPosition(pos);
      } catch (error) {
        console.error('Failed to parse saved mini player position:', error);
      }
    }
  }, []);

  // Ensure player stays within viewport bounds and implement edge snapping
  useEffect(() => {
    const constrainToViewport = () => {
      if (!containerRef.current || isDragging) return;

      const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Add some padding from edges
      const padding = 16;
      
      // Calculate constrained position
      let newX = constrain(
        position.x,
        -(viewportWidth - rect.width) / 2 + padding,
        (viewportWidth - rect.width) / 2 - padding
      );
      
      let newY = constrain(
        position.y,
        -(viewportHeight - rect.height) / 2 + padding,
        (viewportHeight - rect.height) / 2 - padding
      );
      
      // Edge snapping logic
      const snapThreshold = 24; // Pixels from edge to trigger snap
      const snapPositions = {
        left: -(viewportWidth - rect.width) / 2 + padding,
        right: (viewportWidth - rect.width) / 2 - padding,
        top: -(viewportHeight - rect.height) / 2 + padding,
        bottom: (viewportHeight - rect.height) / 2 - padding,
      };
      
      // Snap to left or right edge
      if (Math.abs(newX - snapPositions.left) < snapThreshold) {
        newX = snapPositions.left;
      } else if (Math.abs(newX - snapPositions.right) < snapThreshold) {
        newX = snapPositions.right;
      }
      
      // Snap to top or bottom edge
      if (Math.abs(newY - snapPositions.top) < snapThreshold) {
        newY = snapPositions.top;
      } else if (Math.abs(newY - snapPositions.bottom) < snapThreshold) {
        newY = snapPositions.bottom;
      }

      if (newX !== position.x || newY !== position.y) {
        setPosition({ x: newX, y: newY });
      }
    };

    constrainToViewport();
    window.addEventListener('resize', constrainToViewport);
    return () => window.removeEventListener('resize', constrainToViewport);
  }, [position, isDragging]);

  const handleDragStart = () => {
    setIsDragging(true);
    dragStartRef.current = position;
  };

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setPosition({
      x: dragStartRef.current.x + info.offset.x,
      y: dragStartRef.current.y + info.offset.y
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        drag
        dragMomentum={false}
        dragElastic={0}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{
          x: position.x + window.innerWidth / 2,
          y: position.y + window.innerHeight / 2,
          scale: isDragging ? 1.02 : 1,
          opacity: isDragging ? 0.8 : 1
        }}
        transition={{ type: 'spring', damping: 20 }}
        style={{ 
          position: 'fixed',
          zIndex: 100,
          transform: `translate(-50%, -50%)`
        }}
        className="cursor-grab active:cursor-grabbing"
        onClick={handleContainerClick}
      >
        <div 
          className="backdrop-blur-sm border rounded-lg shadow-xl hover:shadow-2xl transition-shadow p-3 w-[280px]"
          style={{
            backgroundColor: dominantColor 
              ? `${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.15)')}` 
              : 'var(--background-color, rgba(0, 0, 0, 0.8))',
            borderColor: dominantColor 
              ? `${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.3)')}` 
              : 'var(--border-color, rgba(255, 255, 255, 0.1))'
          }}
        >
          {/* Progress bar at the top */}
          <div className="mb-3" onClick={handleProgressClick}>
            <Progress 
              value={progress} 
              className="h-1 cursor-pointer" 
              style={{
                backgroundColor: dominantColor 
                  ? `${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.2)')}` 
                  : undefined,
                '--progress-color': dominantColor || undefined
              } as React.CSSProperties}
            />
          </div>
          
          <div className="flex items-center gap-3">
            {/* Album Art - Animated transition */}
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentTrack.id}
                className="relative w-12 h-12 shrink-0"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Image
                  src={currentTrack.coverArt || '/default-user.jpg'}
                  alt={currentTrack.name}
                  fill
                  className="rounded-md object-cover shadow-md"
                  sizes="48px"
                  priority
                />
              </motion.div>
            </AnimatePresence>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{currentTrack.name}</p>
              <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
            </div>
          </div>

          {/* Keyboard shortcut hint */}
          <div className="text-xs text-muted-foreground text-center mt-2 px-2">
            Double-click to expand • Arrow keys to move
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mt-2 px-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleCurrentTrackStar();
              }}
              className="p-2 hover:bg-muted/50 rounded-full transition-colors"
              title={currentTrack.starred ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                className={`w-4 h-4 ${currentTrack.starred ? 'text-primary fill-primary' : ''}`}
              />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playPreviousTrack();
                }}
                className="p-2 hover:bg-muted/50 rounded-full transition-colors"
              >
                <FaBackward className="w-3 h-3" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlayPause();
                }}
                className="p-3 hover:bg-muted/50 rounded-full transition-colors"
              >
                {isPlaying ? (
                  <FaPause className="w-4 h-4" />
                ) : (
                  <FaPlay className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playNextTrack();
                }}
                className="p-2 hover:bg-muted/50 rounded-full transition-colors"
              >
                <FaForward className="w-3 h-3" />
              </button>
            </div>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowVolumeSlider(prev => !prev);
                }}
                className="p-2 hover:bg-muted/50 rounded-full transition-colors"
                title="Volume"
              >
                {volume === 0 ? (
                  <FaVolumeXmark className="w-4 h-4" />
                ) : (
                  <FaVolumeHigh className="w-4 h-4" />
                )}
              </button>
              
              {/* Volume Slider */}
              {showVolumeSlider && (
                <div 
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg"
                  onClick={e => e.stopPropagation()}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-24 accent-foreground"
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Expand button in top-right corner */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            className="absolute top-2 right-2 p-1.5 hover:bg-muted/50 rounded-full transition-colors"
            title="Expand"
          >
            <FaExpand className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
