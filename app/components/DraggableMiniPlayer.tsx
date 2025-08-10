'use client';

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import { useAudioPlayer, Track } from './AudioPlayerContext';
import { FaPlay, FaPause, FaExpand, FaForward, FaBackward } from 'react-icons/fa6';
import { Heart } from 'lucide-react';
import { constrain } from '@/lib/utils';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Save position to localStorage when it changes
  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem('mini-player-position', JSON.stringify(position));
    }
  }, [position, isDragging]);

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

  // Ensure player stays within viewport bounds
  useEffect(() => {
    const constrainToViewport = () => {
      if (!containerRef.current || isDragging) return;

      const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Add some padding from edges
      const padding = 16;
      
      const newX = constrain(
        position.x,
        -(viewportWidth - rect.width) / 2 + padding,
        (viewportWidth - rect.width) / 2 - padding
      );
      
      const newY = constrain(
        position.y,
        -(viewportHeight - rect.height) / 2 + padding,
        (viewportHeight - rect.height) / 2 - padding
      );

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
      >
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-xl hover:shadow-2xl transition-shadow p-3 w-[280px]">
          <div className="flex items-center gap-3">
            {/* Album Art */}
            <div className="relative w-12 h-12 shrink-0">
              <Image
                src={currentTrack.coverArt || '/default-user.jpg'}
                alt={currentTrack.name}
                fill
                className="rounded object-cover"
              />
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{currentTrack.name}</p>
              <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
            </div>
          </div>

          {/* Controls */}
          {/* Keyboard shortcut hint */}
        <div className="text-xs text-muted-foreground text-center mt-2 px-2">
          Arrow keys to move • Hold Shift for larger steps • Esc to expand
        </div>

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

            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
              className="p-2 hover:bg-muted/50 rounded-full transition-colors"
            >
              <FaExpand className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
