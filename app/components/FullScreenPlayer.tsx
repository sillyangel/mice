'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { Progress } from '@/components/ui/progress';
import { lrcLibClient } from '@/lib/lrclib';
import { 
  FaPlay, 
  FaPause, 
  FaVolumeHigh, 
  FaForward, 
  FaBackward, 
  FaVolumeXmark,
  FaShuffle,
  FaRepeat,
  FaXmark,
  FaQuoteLeft,
  FaListUl
} from "react-icons/fa6";
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LyricLine {
  time: number;
  text: string;
}

interface FullScreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQueue?: () => void;
}

export const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({ isOpen, onClose, onOpenQueue }) => {
  const { currentTrack, playPreviousTrack, playNextTrack } = useAudioPlayer();
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dominantColor, setDominantColor] = useState('#1a1a1a');
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const [showLyrics, setShowLyrics] = useState(true);
  const lyricsRef = useRef<HTMLDivElement>(null);

  // Load lyrics when track changes
  useEffect(() => {
    const loadLyrics = async () => {
      if (!currentTrack) {
        setLyrics([]);
        return;
      }

      try {
        const lyricsData = await lrcLibClient.searchTrack(
          currentTrack.artist,
          currentTrack.name,
          currentTrack.album,
          currentTrack.duration
        );

        if (lyricsData && lyricsData.syncedLyrics) {
          const parsedLyrics = lrcLibClient.parseSyncedLyrics(lyricsData.syncedLyrics);
          setLyrics(parsedLyrics);
        } else {
          setLyrics([]);
        }
      } catch (error) {
        console.error('Failed to load lyrics:', error);
        setLyrics([]);
      }
    };

    loadLyrics();
  }, [currentTrack]);

  // Update current lyric index based on time (with optimization to prevent unnecessary updates)
  useEffect(() => {
    const newIndex = lrcLibClient.getCurrentLyricIndex(lyrics, currentTime);
    if (newIndex !== currentLyricIndex) {
      setCurrentLyricIndex(newIndex);
    }
  }, [lyrics, currentTime, currentLyricIndex]);

  // Auto-scroll lyrics using lyricsRef
  useEffect(() => {
    if (currentLyricIndex >= 0 && lyrics.length > 0 && showLyrics && lyricsRef.current) {
      const scrollTimeout = setTimeout(() => {
        // Find the ScrollArea viewport
        const scrollViewport = lyricsRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        const currentLyricElement = lyricsRef.current?.querySelector(`[data-lyric-index="${currentLyricIndex}"]`) as HTMLElement;
        
        if (scrollViewport && currentLyricElement) {
          const containerHeight = scrollViewport.clientHeight;
          const elementTop = currentLyricElement.offsetTop;
          const elementHeight = currentLyricElement.offsetHeight;
          
          // Calculate scroll position to center the current lyric
          const targetScrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2);
          
          scrollViewport.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth'
          });
        }
      }, 100);
      
      return () => clearTimeout(scrollTimeout);
    }
  }, [currentLyricIndex, showLyrics]);

  // Reset lyrics to top when song changes
  useEffect(() => {
    if (currentTrack && showLyrics && lyricsRef.current) {
      // Reset scroll position using lyricsRef
      const resetScroll = () => {
        const scrollViewport = lyricsRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        
        if (scrollViewport) {
          scrollViewport.scrollTo({
            top: 0,
            behavior: 'instant' // Use instant for track changes
          });
        }
      };
      
      // Small delay to ensure DOM is ready
      const resetTimeout = setTimeout(() => {
        resetScroll();
        setCurrentLyricIndex(-1);
      }, 50);
      
      return () => clearTimeout(resetTimeout);
    }
  }, [currentTrack?.id, showLyrics]); // Only reset when track ID changes

  // Sync with main audio player (improved responsiveness)
  useEffect(() => {
    let lastUpdate = 0;
    const throttleMs = 100; // Update at most every 100ms for better responsiveness
    
    const syncWithMainPlayer = () => {
      const now = Date.now();
      if (now - lastUpdate < throttleMs) return;
      lastUpdate = now;
      
      const mainAudio = document.querySelector('audio') as HTMLAudioElement;
      if (mainAudio && currentTrack) {
        const newCurrentTime = mainAudio.currentTime;
        const newDuration = mainAudio.duration || 0;
        const newIsPlaying = !mainAudio.paused;
        
        // Always update playing state for better responsiveness
        if (newIsPlaying !== isPlaying) {
          setIsPlaying(newIsPlaying);
        }
        
        // Only update state if values have changed significantly
        if (Math.abs(newCurrentTime - currentTime) > 0.3) {
          setCurrentTime(newCurrentTime);
        }
        if (Math.abs(newDuration - duration) > 0.1) {
          setDuration(newDuration);
        }
        if (newDuration > 0) {
          const newProgress = (newCurrentTime / newDuration) * 100;
          if (Math.abs(newProgress - progress) > 0.1) {
            setProgress(newProgress);
          }
        }
        if (Math.abs(mainAudio.volume - volume) > 0.01) {
          setVolume(mainAudio.volume);
        }
      }
    };

    if (isOpen) {
      // Initial sync
      syncWithMainPlayer();
      
      // Set up interval to keep syncing - more frequent for better responsiveness
      const interval = setInterval(syncWithMainPlayer, 50);
      return () => clearInterval(interval);
    }
  }, [isOpen, currentTrack]); // Removed other dependencies to prevent loop

  // Extract dominant color from cover art
  useEffect(() => {
    if (!currentTrack?.coverArt) return;

    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          // Simple dominant color extraction
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          let r = 0, g = 0, b = 0;
          
          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
          }
          
          const pixelCount = data.length / 4;
          r = Math.floor(r / pixelCount);
          g = Math.floor(g / pixelCount);
          b = Math.floor(b / pixelCount);
          
          setDominantColor(`rgb(${r}, ${g}, ${b})`);
        }
      } catch (error) {
        console.error('Failed to extract color:', error);
      }
    };
    img.src = currentTrack.coverArt;
  }, [currentTrack]);

  const togglePlayPause = () => {
    const mainAudio = document.querySelector('audio') as HTMLAudioElement;
    if (!mainAudio) return;

    if (isPlaying) {
      mainAudio.pause();
    } else {
      mainAudio.play();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const mainAudio = document.querySelector('audio') as HTMLAudioElement;
    if (!mainAudio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    const newTime = (percentage / 100) * duration;
    
    mainAudio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mainAudio = document.querySelector('audio') as HTMLAudioElement;
    if (!mainAudio) return;

    const newVolume = parseInt(e.target.value) / 100;
    mainAudio.volume = newVolume;
    setVolume(newVolume);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !currentTrack) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      {/* Blurred background image */}
      {currentTrack.coverArt && (
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url(${currentTrack.coverArt})`,
            backgroundSize: '120%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'blur(20px) brightness(0.3)',
            transform: 'scale(1.1)',
          }}
        />
      )}
      
      {/* Overlay for better contrast */}
      <div className="absolute inset-0 bg-black/50" />
      
      <div className="relative h-full w-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 flex-shrink-0">
          <h2 className="text-lg lg:text-xl font-semibold text-white">Now Playing</h2>
          <div className="flex items-center gap-3">
            {onOpenQueue && (
              <button 
                onClick={onOpenQueue}
                className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                title="Open Queue"
              >
                <FaListUl className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
            >
              <FaXmark className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-8 p-4 lg:p-6 pt-0 overflow-hidden min-h-0">
          {/* Left Side - Album Art and Controls */}
          <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto lg:mx-0 min-h-0">
            {/* Album Art */}
            <div className="relative mb-4 lg:mb-8 flex-shrink-0">
              <Image
                src={currentTrack.coverArt || '/default-album.png'}
                alt={currentTrack.album}
                width={320}
                height={320}
                className="w-64 h-64 lg:w-80 lg:h-80 rounded-lg shadow-2xl object-cover"
                priority
              />
            </div>

            {/* Track Info */}
            <div className="text-center mb-4 lg:mb-8 px-4 flex-shrink-0">
              <h1 className="text-xl lg:text-3xl font-bold text-foreground mb-2 line-clamp-2">
                {currentTrack.name}
              </h1>
              <p className="text-lg lg:text-xl text-foreground/80 mb-1 line-clamp-1">{currentTrack.artist}</p>
            </div>

            {/* Progress */}
            <div className="w-full max-w-md mb-4 lg:mb-6 px-4 flex-shrink-0">
              <div 
                className="h-2 bg-white/20 rounded-full cursor-pointer relative overflow-hidden"
                onClick={handleSeek}
              >
                <div 
                  className="h-full bg-foreground transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-foreground/60 mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 lg:gap-6 mb-4 lg:mb-6 flex-shrink-0">
              <button
                onClick={playPreviousTrack}
                className="p-2 hover:bg-gray-700/50 rounded-full transition-colors">
                <FaBackward className="w-5 h-5" />
              </button>

              <button
                onClick={togglePlayPause}
                className="p-2 hover:bg-gray-700/50 rounded-full transition-colors">
                {isPlaying ? (
                  <FaPause className="w-10 h-10" />
                ) : (
                  <FaPlay className="w-10 h-10" />
                )}
              </button>

              <button
                onClick={playNextTrack}
                className="p-2 hover:bg-gray-700/50 rounded-full transition-colors">
                <FaForward className="w-5 h-5" />
              </button>
            </div>

            {/* Volume and Queue */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onMouseEnter={() => setShowVolumeSlider(true)}
                className="p-2 hover:bg-gray-700/50 rounded-full transition-colors">
                {volume === 0 ? (
                  <FaVolumeXmark className="w-5 h-5" />
                ) : (
                  <FaVolumeHigh className="w-5 h-5" />
                )}
              </button>
              
              {lyrics.length > 0 && (
                <button
                  onClick={() => setShowLyrics(!showLyrics)}
                  className={`p-2 hover:bg-gray-700/50 rounded-full transition-colors ${
                    showLyrics ? 'text-foreground' : 'text-gray-500'
                  }`}
                  title={showLyrics ? 'Hide Lyrics' : 'Show Lyrics'}
                >
                  <FaQuoteLeft className="w-5 h-5" />
                </button>
              )}
              
              {showVolumeSlider && (
                <div 
                  className="w-20 lg:w-24"
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume * 100}
                    onChange={handleVolumeChange}
                    className="w-full accent-foreground"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Lyrics */}
          {showLyrics && lyrics.length > 0 && (
            <div className="flex-1 lg:max-w-md min-h-0" ref={lyricsRef}>
              <div className="h-full flex flex-col">
                <ScrollArea className="flex-1 min-h-0 w-90">
                  <div className="space-y-4 pr-4 px-2">
                    {lyrics.map((line, index) => (
                      <div
                        key={index}
                        data-lyric-index={index}
                        className={`text-sm lg:text-base leading-relaxed transition-all duration-300 break-words ${
                          index === currentLyricIndex
                            ? 'text-foreground font-semibold text-lg lg:text-xl scale-105'
                            : index < currentLyricIndex
                            ? 'text-foreground/60'
                            : 'text-foreground/40'
                        }`}
                        style={{ 
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word',
                          hyphens: 'auto',
                          paddingBottom: '8px',
                          paddingLeft: '9px'
                        }}
                      >
                        {line.text || '♪'}
                      </div>
                    ))}
                    {/* Add extra padding at the bottom to allow last lyric to center */}
                    <div style={{ height: '200px' }} />
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
