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
  FaQuoteLeft
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
}

export const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({ isOpen, onClose }) => {
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

  // Update current lyric index based on time
  useEffect(() => {
    const newIndex = lrcLibClient.getCurrentLyricIndex(lyrics, currentTime);
    setCurrentLyricIndex(newIndex);
  }, [lyrics, currentTime]);

  // Auto-scroll lyrics to center current line without cutting off text
  useEffect(() => {
    if (currentLyricIndex >= 0 && lyrics.length > 0 && showLyrics) {
      // Use a small delay to ensure the DOM is updated
      const scrollTimeout = setTimeout(() => {
        const lyricsScrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
        if (lyricsScrollArea) {
          const currentLyricElement = lyricsScrollArea.querySelector(`[data-lyric-index="${currentLyricIndex}"]`) as HTMLElement;
          if (currentLyricElement) {
            const containerHeight = lyricsScrollArea.clientHeight;
            const elementHeight = currentLyricElement.offsetHeight;
            const elementOffsetTop = currentLyricElement.offsetTop;
            
            // Calculate scroll position to center the current lyric
            const targetScrollTop = elementOffsetTop - (containerHeight / 2) + (elementHeight / 2);
            
            lyricsScrollArea.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'smooth'
            });
          }
        }
      }, 50);
      
      return () => clearTimeout(scrollTimeout);
    }
  }, [currentLyricIndex, lyrics.length, showLyrics]);

  // Reset lyrics to top when song ends or changes
  useEffect(() => {
    if (currentTrack && showLyrics) {
      const lyricsScrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
      if (lyricsScrollArea) {
        lyricsScrollArea.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
      setCurrentLyricIndex(-1);
    }
  }, [currentTrack, showLyrics]);

  // Sync with main audio player
  useEffect(() => {
    const syncWithMainPlayer = () => {
      const mainAudio = document.querySelector('audio') as HTMLAudioElement;
      if (mainAudio && currentTrack) {
        const newCurrentTime = mainAudio.currentTime;
        const newDuration = mainAudio.duration || 0;
        const newIsPlaying = !mainAudio.paused;
        
        // Check if song ended (reset lyrics to top)
        if (newCurrentTime === 0 && !newIsPlaying && currentTime > 0) {
          const lyricsScrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
          if (lyricsScrollArea) {
            lyricsScrollArea.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
          }
          setCurrentLyricIndex(-1);
        }
        
        setCurrentTime(newCurrentTime);
        setDuration(newDuration);
        setProgress(newDuration ? (newCurrentTime / newDuration) * 100 : 0);
        setIsPlaying(newIsPlaying);
        setVolume(mainAudio.volume);
      }
    };

    if (isOpen) {
      // Initial sync
      syncWithMainPlayer();
      
      // Set up interval to keep syncing
      const interval = setInterval(syncWithMainPlayer, 100);
      return () => clearInterval(interval);
    }
  }, [isOpen, currentTrack, currentTime]);

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

  const backgroundStyle = {
    background: `linear-gradient(135deg, ${dominantColor}40 0%, ${dominantColor}20 50%, transparent 100%)`
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-95 backdrop-blur-sm overflow-hidden">
      <div className="h-full w-full flex flex-col" style={backgroundStyle}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 flex-shrink-0">
          <h2 className="text-lg lg:text-xl font-semibold text-white">Now Playing</h2>
          <button 
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <FaXmark className="w-5 h-5" />
          </button>
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

            {/* Volume and Lyrics Toggle */}
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
            <div className="flex-1 lg:max-w-md min-h-0">
              <div className="h-full flex flex-col">
                <ScrollArea className="flex-1 min-h-0">
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
                          paddingBottom: '8px'
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
