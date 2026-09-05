"use client";

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { Progress } from '@/components/ui/progress';
import { lrcLibClient } from '@/lib/lrclib';
import { getNavidromeAPI } from '@/lib/navidrome';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useGlobalSearch } from './GlobalSearchProvider';
import { AudioSettingsDialog } from './AudioSettingsDialog';
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
  FaListUl,
  FaSliders
} from "react-icons/fa6";
import { Heart } from 'lucide-react';
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

type MobileTab = 'player' | 'lyrics' | 'queue';

export const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({ isOpen, onClose, onOpenQueue }) => {
  const { 
    currentTrack, 
    playPreviousTrack, 
    playNextTrack, 
    shuffle, 
    toggleShuffle, 
    toggleCurrentTrackStar,
    queue,
    audioSettings,
    updateAudioSettings
  } = useAudioPlayer();
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  
  const isMobile = useIsMobile();
  const router = useRouter();
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
  const [activeTab, setActiveTab] = useState<MobileTab>('player');
  const lyricsRef = useRef<HTMLDivElement>(null);

  // Initialize volume from saved preference when fullscreen opens
  useEffect(() => {
    if (!isOpen) return;
    try {
      const savedVolume = localStorage.getItem('navidrome-volume');
      if (savedVolume !== null) {
        const vol = parseFloat(savedVolume);
        if (!isNaN(vol) && vol >= 0 && vol <= 1) {
          setVolume(vol);
          const mainAudio = document.querySelector('audio') as HTMLAudioElement | null;
          if (mainAudio) mainAudio.volume = vol;
        }
      }
    } catch {}
  }, [isOpen]);

  // Load lyrics when track changes
  useEffect(() => {
    const loadLyrics = async () => {
      if (!currentTrack) {
        setLyrics([]);
        return;
      }

      try {
        // 1. Prefer structured lyrics from the Navidrome/OpenSubsonic server (songLyrics extension).
        const api = getNavidromeAPI();
        let lines: LyricLine[] = [];
        if (api) {
          const supportsLyrics = await api.hasExtension('songLyrics');
          if (supportsLyrics) {
            const structured = await api.getLyricsBySongId(currentTrack.id);
            const synced = structured.find((entry) => entry.synced && typeof entry.offset === 'number') || structured.find((entry) => entry.synced);
            if (synced) {
              // OpenSubsonic structured lyric timestamps are in milliseconds;
              // the player's LyricLine.time (and getCurrentLyricIndex vs currentTime) is in seconds.
              const offsetMs = typeof synced.offset === 'number' ? synced.offset : 0;
              lines = (synced.line || [])
                .map((line) => ({
                  time: ((line.start ?? 0) + offsetMs) / 1000,
                  text: line.value || '',
                }))
                .filter((line) => line.text)
                .sort((a, b) => a.time - b.time);
            }
          }
        }

        // 2. Fall back to lrclib.net when the server has no lyrics.
        if (lines.length === 0) {
          const lyricsData = await lrcLibClient.searchTrack(
            currentTrack.artist,
            currentTrack.name,
            currentTrack.album,
            currentTrack.duration
          );

          if (lyricsData && lyricsData.syncedLyrics) {
            lines = lrcLibClient.parseSyncedLyrics(lyricsData.syncedLyrics);
          }
        }

        setLyrics(lines.sort((a, b) => a.time - b.time));
      } catch (error) {
        console.warn('Failed to load lyrics:', error);
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

  // Auto-scroll lyrics using lyricsRef - Disabled on mobile to prevent iOS audio issues
  useEffect(() => {
    // Only auto-scroll on desktop to avoid iOS audio interference
    const shouldScroll = !isMobile && showLyrics && lyrics.length > 0;
    
    if (currentLyricIndex >= 0 && shouldScroll && lyricsRef.current) {
      const scrollTimeout = setTimeout(() => {
        try {
          const scrollContainer = lyricsRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
          const currentLyricElement = lyricsRef.current?.querySelector(`[data-lyric-index="${currentLyricIndex}"]`) as HTMLElement;
          
          if (scrollContainer && currentLyricElement) {
            const containerHeight = scrollContainer.clientHeight;
            const elementTop = currentLyricElement.offsetTop;
            const elementHeight = currentLyricElement.offsetHeight;
            // Position the active lyric higher on the screen (~25% from top)
            const focusFraction = 0.25; // 0.5 would be center
            const targetScrollTop = elementTop - (containerHeight * focusFraction) + (elementHeight / 2);
            
            scrollContainer.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'smooth'
            });
          }
        } catch (error) {
          console.warn('Lyrics scroll failed:', error);
        }
      }, 200);
      
      return () => clearTimeout(scrollTimeout);
    }
  }, [currentLyricIndex, showLyrics, lyrics.length, isMobile]);

  // Reset lyrics to top when song changes - Disabled on mobile to prevent iOS audio issues
  useEffect(() => {
    // Only reset scroll on desktop to avoid iOS audio interference
    const shouldReset = !isMobile && showLyrics && lyrics.length > 0;
    
    if (currentTrack?.id && shouldReset && lyricsRef.current) {
      const resetTimeout = setTimeout(() => {
        try {
          const scrollContainer = lyricsRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
          
          if (scrollContainer) {
            scrollContainer.scrollTo({
              top: 0,
              behavior: 'instant'
            });
          }
        } catch (error) {
          console.warn('Lyrics reset scroll failed:', error);
        }
        setCurrentLyricIndex(-1);
      }, 50);
      
      return () => clearTimeout(resetTimeout);
    }
  }, [currentTrack?.id, showLyrics, isMobile, lyrics.length]);

  // Sync with main audio player (improved responsiveness)
  useEffect(() => {
    const syncWithMainPlayer = () => {
      const mainAudio = document.querySelector('audio') as HTMLAudioElement;
      
      if (mainAudio && currentTrack) {
        const newCurrentTime = mainAudio.currentTime;
        const newDuration = mainAudio.duration || 0;
        const newIsPlaying = !mainAudio.paused;
        
        // Always update playing state immediately
        setIsPlaying(newIsPlaying);
        setCurrentTime(newCurrentTime);
        setDuration(newDuration);
        setVolume(mainAudio.volume);
        
        if (newDuration > 0) {
          const newProgress = (newCurrentTime / newDuration) * 100;
          setProgress(newProgress);
        }
      }
    };

    if (isOpen && currentTrack) {
      // Initial sync
      syncWithMainPlayer();
      
      // Set up interval to keep syncing
      const interval = setInterval(syncWithMainPlayer, 100);
      return () => clearInterval(interval);
    }
  }, [isOpen, currentTrack]); // React to track changes

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
        console.warn('Failed to extract color:', error);
      }
    };
    img.src = currentTrack.coverArt;
  }, [currentTrack]);

  const togglePlayPause = () => {
    // Find the main audio player's play/pause button and click it
    // This ensures we use the same logic as the main player
    const mainPlayButton = document.querySelector('[data-testid="play-pause-button"]') as HTMLButtonElement;
    
    if (mainPlayButton) {
      mainPlayButton.click();
    } else {
      // Fallback to direct audio control if button not found
      const mainAudio = document.querySelector('audio') as HTMLAudioElement;
      if (!mainAudio) {
        return;
      }

      if (isPlaying) {
        try {
          mainAudio.pause();
        } catch (error) {
          console.error('Audio pause() failed:', error);
        }
      } else {
        // Check if audio has a valid source
        if (!mainAudio.src && !mainAudio.currentSrc && currentTrack) {
          mainAudio.src = currentTrack.url;
          mainAudio.load();
        }
        
        mainAudio.play().catch((error) => {
          console.error('Audio play() failed:', error);
        });
      }
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
    try {
      localStorage.setItem('navidrome-current-track-time', newTime.toString());
    } catch {}
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mainAudio = document.querySelector('audio') as HTMLAudioElement;
    if (!mainAudio) return;

    const newVolume = parseInt(e.target.value) / 100;
    mainAudio.volume = newVolume;
    setVolume(newVolume);
    try {
      localStorage.setItem('navidrome-volume', newVolume.toString());
    } catch {}
  };

  // Volume control functions for keyboard shortcuts
  const handleVolumeUp = () => {
    const mainAudio = document.querySelector('audio') as HTMLAudioElement;
    if (!mainAudio) return;
    const newVolume = Math.min(1, mainAudio.volume + 0.1);
    mainAudio.volume = newVolume;
    setVolume(newVolume);
    try {
      localStorage.setItem('navidrome-volume', newVolume.toString());
    } catch {}
  };

  const handleVolumeDown = () => {
    const mainAudio = document.querySelector('audio') as HTMLAudioElement;
    if (!mainAudio) return;
    const newVolume = Math.max(0, mainAudio.volume - 0.1);
    mainAudio.volume = newVolume;
    setVolume(newVolume);
    try {
      localStorage.setItem('navidrome-volume', newVolume.toString());
    } catch {}
  };

  const handleToggleMute = () => {
    const mainAudio = document.querySelector('audio') as HTMLAudioElement;
    if (!mainAudio) return;
    const newVolume = mainAudio.volume === 0 ? 1 : 0;
    mainAudio.volume = newVolume;
    setVolume(newVolume);
    try {
      localStorage.setItem('navidrome-volume', newVolume.toString());
    } catch {}
  };

  const { openSpotlight } = useGlobalSearch();

  // Set up keyboard shortcuts for fullscreen player
  useKeyboardShortcuts({
    onPlayPause: togglePlayPause,
    onNextTrack: playNextTrack,
    onPreviousTrack: playPreviousTrack,
    onVolumeUp: handleVolumeUp,
    onVolumeDown: handleVolumeDown,
    onToggleMute: handleToggleMute,
    onSpotlightSearch: openSpotlight,
    disabled: !isOpen || !currentTrack // Only active when fullscreen is open
  });

  const handleLyricClick = (time: number) => {
    const mainAudio = document.querySelector('audio') as HTMLAudioElement;
    if (!mainAudio) return;

    mainAudio.currentTime = time;
    setCurrentTime(time);
    try {
      localStorage.setItem('navidrome-current-track-time', time.toString());
    } catch {}
    
    // Update progress bar as well
    if (duration > 0) {
      const newProgress = (time / duration) * 100;
      setProgress(newProgress);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
      <motion.div
        className="fixed inset-0 z-[70] bg-black overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
      {/* Enhanced Blurred background image */}
      {currentTrack.coverArt && (
        <motion.div className="absolute inset-0 w-full h-full" initial={{ scale: 1.02 }} animate={{ scale: 1.08 }} transition={{ duration: 10, ease: 'linear' }}>
          {/* Main background */}
          <motion.div 
            className="absolute inset-0 w-full h-full"
            style={{
              backgroundImage: `url(${currentTrack.coverArt})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: 'blur(50px) brightness(0.3)',
              transform: 'scale(1.1)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
          {/* Top gradient blur for mobile */}
          <motion.div 
            className="absolute top-0 left-0 right-0 h-32"
            style={{
              background: `linear-gradient(to bottom, 
                rgba(0,0,0,0.8) 0%, 
                rgba(0,0,0,0.4) 50%, 
                transparent 100%)`,
              backdropFilter: 'blur(10px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          />
          {/* Bottom gradient blur for mobile */}
          <motion.div 
            className="absolute bottom-0 left-0 right-0 h-32"
            style={{
              background: `linear-gradient(to top, 
                rgba(0,0,0,0.8) 0%, 
                rgba(0,0,0,0.4) 50%, 
                transparent 100%)`,
              backdropFilter: 'blur(10px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          />
        </motion.div>
      )}
      
      {/* Overlay for better contrast */}
      <motion.div className="absolute inset-0 bg-black/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      
      <motion.div className="relative h-full w-full flex flex-col" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
        
        {/* Mobile Close Handle */}
        {isMobile && (
          <motion.div className="flex justify-center py-4 px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <div 
              onClick={onClose}
              className="cursor-pointer px-8 py-3 -mx-8 -my-3"
              style={{ touchAction: 'manipulation' }}
            >
              <motion.div className="w-8 h-1 bg-gray-300 rounded-full opacity-60" initial={{ scaleX: 0.9 }} animate={{ scaleX: 1 }} transition={{ duration: 0.3 }} />
            </div>
          </motion.div>
        )}

        {/* Desktop Header */}
        {!isMobile && (
          <motion.div className="absolute top-0 right-0 z-10 p-4 lg:p-6" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <div className="flex items-center gap-2">
              {onOpenQueue && (
                <button 
                  onClick={onOpenQueue}
                  className="text-white hover:bg-white/20 p-2 rounded-full transition-colors flex items-center justify-center w-10 h-10"
                  title="Open Queue"
                >
                  <FaListUl className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={onClose}
                className="text-white hover:bg-white/20 p-2 rounded-full transition-colors flex items-center justify-center w-10 h-10"
                title="Close Player"
              >
                <FaXmark className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {isMobile ? (
            /* Mobile Tab Content */
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                {activeTab === 'player' && (
                  <motion.div key="tab-player" className="h-full flex flex-col justify-center items-center px-8 py-4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
                    {/* Mobile Album Art (crossfade on track change) */}
                    <div className="relative mb-6 shrink-0 flex items-center justify-center" style={{ minHeight: 208 }}>
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={currentTrack.id}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.02, position: 'absolute' as const }}
                          transition={{ duration: 0.25 }}
                          className="flex items-center justify-center"
                        >
                          <Image
                            src={currentTrack.coverArt || '/default-album.png'}
                            alt={currentTrack.album}
                            width={260}
                            height={260}
                            className={`rounded-lg shadow-2xl object-cover transition-all duration-300 ${
                              !isPlaying ? 'w-52 h-52 opacity-70 scale-95' : 'w-64 h-64'
                            }`}
                            priority
                          />
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Track Info - Left Aligned and Heart on Same Line */}
                    <div className="w-full mb-6 shrink-0">
                      <div className="flex items-center justify-between mb-0">
                        <h1 className="text-2xl font-bold text-foreground line-clamp-1 flex-1 text-left">
                          {currentTrack.name}
                        </h1>
                        <button
                          onClick={toggleCurrentTrackStar}
                          className="p-2 hover:bg-gray-700/50 rounded-full transition-colors ml-3 pb-0"
                          title={currentTrack?.starred ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Heart 
                            className={`w-6 h-6 ${currentTrack?.starred ? 'text-primary fill-primary' : 'text-gray-400'}`} 
                          />
                        </button>
                      </div>
                      <Link 
                        href={`/artist/${currentTrack.artistId}`} 
                        className="text-lg text-foreground/80 line-clamp-1 block text-left mb-1"
                      >
                        {currentTrack.artist}
                      </Link>
                      <Link 
                        href={`/album/${currentTrack.albumId}`}  
                        className="text-base text-foreground/60 line-clamp-1 cursor-pointer hover:underline block text-left"
                      >
                        {currentTrack.album}
                      </Link>
                    </div>

                    {/* Progress */}
                    <div className="w-full mb-4 shrink-0">
                      <div className="w-full" onClick={handleSeek}>
                        <Progress value={progress} className="h-2 cursor-pointer" />
                      </div>
                      {/* Time below progress on mobile */}
                      <div className="flex justify-between text-sm text-foreground/60 mt-2">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-6 mb-4 shrink-0">
                      <button
                        onClick={toggleShuffle}
                        className={`p-2 hover:bg-gray-700/50 rounded-full transition-colors ${
                          shuffle ? 'text-primary bg-primary/20' : 'text-gray-400'
                        }`}
                        title={shuffle ? 'Shuffle On - Queue is shuffled' : 'Shuffle Off - Click to shuffle queue'}
                      >
                        <FaShuffle className="w-5 h-5" />
                      </button>

                      <button
                        onClick={playPreviousTrack}
                        className="p-2 hover:bg-gray-700/50 rounded-full transition-colors">
                        <FaBackward className="w-6 h-6" />
                      </button>

                      <button
                        onClick={togglePlayPause}
                        className="p-4 hover:bg-gray-700/50 rounded-full transition-colors">
                        {isPlaying ? (
                          <FaPause className="w-10 h-10" />
                        ) : (
                          <FaPlay className="w-10 h-10" />
                        )}
                      </button>

                      <button
                        onClick={playNextTrack}
                        className="p-2 hover:bg-gray-700/50 rounded-full transition-colors">
                        <FaForward className="w-6 h-6" />
                      </button>

                      <button
                        onMouseEnter={() => setShowVolumeSlider(true)}
                        className="p-2 hover:bg-gray-700/50 rounded-full transition-colors">
                        {volume === 0 ? (
                          <FaVolumeXmark className="w-5 h-5" />
                        ) : (
                          <FaVolumeHigh className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    {/* Volume Slider */}
                    {showVolumeSlider && (
                      <div 
                        className="w-32 mb-4"
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
                  </motion.div>
                )}

                {activeTab === 'lyrics' && lyrics.length > 0 && (
                  <motion.div key="tab-lyrics" className="h-full flex flex-col px-4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div 
                      className="flex-1 overflow-y-auto"
                      ref={lyricsRef}
                    >
            <div className="space-y-4 py-10">
                        {lyrics.map((line, index) => (
                          <motion.div
                            key={index}
                            data-lyric-index={index}
                            onClick={() => handleLyricClick(line.time)}
                            initial={false}
              animate={index === currentLyricIndex ? { scale: 1.06, opacity: 1 } : index < currentLyricIndex ? { scale: 0.985, opacity: 0.75 } : { scale: 0.98, opacity: 0.6 }}
                            transition={{ duration: 0.2 }}
              className={`text-2xl sm:text-3xl leading-relaxed transition-colors duration-200 break-words cursor-pointer hover:text-foreground px-2 ${
                              index === currentLyricIndex
                ? 'text-foreground font-extrabold leading-tight text-5xl sm:text-6xl'
                                : index < currentLyricIndex
                                ? 'text-foreground/60'
                                : 'text-foreground/40'
                            }`}
                            style={{ 
                              wordWrap: 'break-word',
                              overflowWrap: 'break-word',
                              hyphens: 'auto',
                              paddingBottom: '4px',
                              // Subtle glow to make the current line feel elevated
                              textShadow: index === currentLyricIndex 
                                ? '0 4px 16px rgba(0,0,0,0.7), 0 0 24px rgba(255,255,255,0.16)'
                                : undefined
                            }}
                            title={`Click to jump to ${formatTime(line.time)}`}
                          >
                            {line.text || '♪'}
                          </motion.div>
                        ))}
                        <div style={{ height: '260px' }} />
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'queue' && (
                  <motion.div key="tab-queue" className="h-full flex flex-col px-4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <ScrollArea className="flex-1">
                      <div className="space-y-2 py-4">
                        {queue.map((track, index) => (
                          <div
                            key={`${track.id}-${index}`}
                            className={`flex items-center p-3 rounded-lg ${
                              track.id === currentTrack?.id ? 'bg-primary/20' : 'bg-gray-800/30'
                            }`}
                          >
                            <Image
                              src={track.coverArt || '/default-album.png'}
                              alt={track.album}
                              width={40}
                              height={40}
                              className="rounded mr-3"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {track.name}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {track.artist}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
              <div className="flex-shrink-0 pb-safe">
                <div className="flex justify-around py-4 mb-2">
                  <button
                    onClick={() => setActiveTab('player')}
                    className={`flex items-center justify-center p-4 rounded-full transition-colors ${
                      activeTab === 'player' ? 'text-primary bg-primary/20' : 'text-gray-400'
                    }`}
                  >
                    <FaPlay className="w-6 h-6" />
                  </button>

                  {lyrics.length > 0 && (
                    <button
                      onClick={() => setActiveTab('lyrics')}
                      className={`flex items-center justify-center p-4 rounded-full transition-colors ${
                        activeTab === 'lyrics' ? 'text-primary bg-primary/20' : 'text-gray-400'
                      }`}
                    >
                      <FaQuoteLeft className="w-6 h-6" />
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab('queue')}
                    className={`flex items-center justify-center p-4 rounded-full transition-colors ${
                      activeTab === 'queue' ? 'text-primary bg-primary/20' : 'text-gray-400'
                    }`}
                  >
                    <FaListUl className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Desktop Layout */
            <div className="h-full flex flex-row gap-8 p-6 overflow-hidden">
              {/* Left Side - Album Art and Controls */}
              <div className="flex flex-col items-center justify-center min-h-0 flex-1 min-w-0">
                {/* Album Art (crossfade on track change) */}
                <div className="relative mb-6 shrink-0 w-80 h-80">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={currentTrack.id}
                      className="absolute inset-0"
                      initial={{ opacity: 0, scale: 0.985 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.02 }}
                      transition={{ duration: 0.25 }}
                    >
                      <Image
                        src={currentTrack.coverArt || '/default-album.png'}
                        alt={currentTrack.album}
                        width={320}
                        height={320}
                        className="w-80 h-80 rounded-lg shadow-2xl object-cover"
                        priority
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Track Info */}
                <div className="text-start mb-6 shrink-0 max-w-full">
                  <h1 className="text-3xl font-bold text-foreground line-clamp-2 leading-tight mb-2">
                    {currentTrack.name}
                  </h1>
                  <Link href={`/artist/${currentTrack.artistId}`} className="text-xl text-foreground/80 mb-1 line-clamp-1">
                    {currentTrack.artist}
                  </Link>
                  {/* <Link href={`/album/${currentTrack.albumId}`}  className="text-lg text-foreground/60 line-clamp-1 cursor-pointer hover:underline">
                    {currentTrack.album}
                  </Link> */}
                </div>

                {/* Progress */}
                <div className="w-full max-w-md mb-6 px-4 shrink-0">
                  <div className="w-full" onClick={handleSeek}>
                    <Progress value={progress} className="h-2 cursor-pointer" />
                  </div>
                  <div className="flex justify-between text-sm text-foreground/60 mt-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-6 mb-6 shrink-0">
                  <button
                    onClick={toggleShuffle}
                    className={`p-2 hover:bg-gray-700/50 rounded-full transition-colors ${
                      shuffle ? 'text-primary bg-primary/20' : 'text-gray-400'
                    }`}
                    title={shuffle ? 'Shuffle On - Queue is shuffled' : 'Shuffle Off - Click to shuffle queue'}
                  >
                    <FaShuffle className="w-5 h-5" />
                  </button>

                  <button
                    onClick={playPreviousTrack}
                    className="p-2 hover:bg-gray-700/50 rounded-full transition-colors">
                    <FaBackward className="w-5 h-5" />
                  </button>

                  <button
                    onClick={togglePlayPause}
                    className="p-3 hover:bg-gray-700/50 rounded-full transition-colors">
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

                  <button
                    onClick={toggleCurrentTrackStar}
                    className="p-2 hover:bg-gray-700/50 rounded-full transition-colors"
                    title={currentTrack?.starred ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart 
                      className={`w-5 h-5 ${currentTrack?.starred ? 'text-primary fill-primary' : 'text-gray-400'}`} 
                    />
                  </button>
                </div>

                {/* Volume and Lyrics Toggle - Desktop Only */}
                <div className="flex items-center gap-3 shrink-0 justify-center">
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
                        showLyrics ? 'text-primary bg-primary/20' : 'text-gray-500'
                      }`}
                      title={showLyrics ? 'Hide Lyrics' : 'Show Lyrics'}
                    >
                      <FaQuoteLeft className="w-5 h-5" />
                    </button>
                  )}

                  <button
                    onClick={() => setShowAudioSettings(true)}
                    className="p-2 hover:bg-gray-700/50 rounded-full transition-colors"
                    title="Audio Settings"
                  >
                    <FaSliders className="w-5 h-5" />
                  </button>
                  
                  {showVolumeSlider && (
                    <div 
                      className="w-24"
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

              {/* Right Side - Lyrics (Desktop Only) */}
              <AnimatePresence initial={false}>
              {showLyrics && lyrics.length > 0 && (
                <motion.div className="flex-1 min-w-0 min-h-0 flex flex-col" ref={lyricsRef}
                  initial={{ x: 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 30, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="h-full flex flex-col">
                    <ScrollArea className="flex-1 min-h-0">
                      <div className="space-y-3 pl-4 pr-4 py-8">
                        {lyrics.map((line, index) => (
                          <motion.div
                            key={index}
                            data-lyric-index={index}
                            onClick={() => handleLyricClick(line.time)}
                            initial={false}
                            animate={index === currentLyricIndex ? { scale: 1.04, opacity: 1 } : index < currentLyricIndex ? { scale: 0.985, opacity: 0.75 } : { scale: 0.98, opacity: 0.5 }}
                            transition={{ duration: 0.2 }}
                            className={`text-base leading-relaxed transition-colors duration-200 break-words cursor-pointer hover:text-foreground ${
                              index === currentLyricIndex
                                ? 'text-foreground font-extrabold leading-tight text-5xl'
                                : index < currentLyricIndex
                                ? 'text-foreground/60'
                                : 'text-foreground/40'
                            }`}
                            style={{ 
                              wordWrap: 'break-word',
                              overflowWrap: 'break-word',
                              hyphens: 'auto',
                              paddingBottom: '4px',
                              paddingLeft: '8px',
                              // Subtle glow to make the current line feel elevated
                              textShadow: index === currentLyricIndex 
                                ? '0 6px 18px rgba(0,0,0,0.7), 0 0 28px rgba(255,255,255,0.18)'
                                : undefined
                            }}
                            title={`Click to jump to ${formatTime(line.time)}`}
                          >
                            {line.text || '♪'}
                          </motion.div>
                        ))}
                        <div style={{ height: '240px' }} />
                      </div>
                    </ScrollArea>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
  </motion.div>
  )}
    </AnimatePresence>
    <AudioSettingsDialog 
      isOpen={showAudioSettings}
      onClose={() => setShowAudioSettings(false)}
    />
    </>
  );
};
