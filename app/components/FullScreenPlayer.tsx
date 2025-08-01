'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { Progress } from '@/components/ui/progress';
import { lrcLibClient } from '@/lib/lrclib';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
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
    queue 
  } = useAudioPlayer();
  
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

  // Debug logging for component changes
  useEffect(() => {
    console.log('🔍 FullScreenPlayer state changed:', {
      isOpen,
      currentTrack,
      currentTrackKeys: currentTrack ? Object.keys(currentTrack) : 'null',
      queueLength: queue?.length || 0
    });
  }, [isOpen, currentTrack, queue?.length]);

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
        console.log('Failed to load lyrics:', error);
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
            const targetScrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2);
            
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
      
      console.log('=== FULLSCREEN PLAYER AUDIO DEBUG ===');
      console.log('currentTrack from context:', currentTrack);
      console.log('currentTrack keys:', currentTrack ? Object.keys(currentTrack) : 'null');
      if (currentTrack) {
        console.log('currentTrack.url:', currentTrack.url);
        console.log('currentTrack.id:', currentTrack.id);
        console.log('currentTrack.name:', currentTrack.name);
        console.log('currentTrack.artist:', currentTrack.artist);
      }
      console.log('Audio element found:', !!mainAudio);
      
      if (mainAudio) {
        console.log('Audio element src:', mainAudio.src);
        console.log('Audio element currentSrc:', mainAudio.currentSrc);
        console.log('Audio state:', {
          currentTime: mainAudio.currentTime,
          duration: mainAudio.duration,
          paused: mainAudio.paused,
          ended: mainAudio.ended,
          readyState: mainAudio.readyState,
          networkState: mainAudio.networkState,
          error: mainAudio.error
        });
        
        // Check if audio source matches current track
        if (currentTrack) {
          const audioSourceMatches = mainAudio.src === currentTrack.url || mainAudio.currentSrc === currentTrack.url;
          console.log('Audio source matches current track URL:', audioSourceMatches);
          if (!audioSourceMatches) {
            console.log('⚠️ Audio source mismatch!');
            console.log('Expected:', currentTrack.url);
            console.log('Audio src:', mainAudio.src);
            console.log('Audio currentSrc:', mainAudio.currentSrc);
          }
        }
      }
      console.log('==========================================');
      
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
        console.log('Failed to extract color:', error);
      }
    };
    img.src = currentTrack.coverArt;
  }, [currentTrack]);

  const togglePlayPause = () => {
    console.log('🎵 FullScreenPlayer Toggle Play/Pause clicked');
    
    // Find the main audio player's play/pause button and click it
    // This ensures we use the same logic as the main player
    const mainPlayButton = document.querySelector('[data-testid="play-pause-button"]') as HTMLButtonElement;
    
    if (mainPlayButton) {
      console.log('✅ Found main play button, triggering click');
      mainPlayButton.click();
    } else {
      console.log('❌ Main play button not found, falling back to direct audio control');
      
      // Fallback to direct audio control if button not found
      const mainAudio = document.querySelector('audio') as HTMLAudioElement;
      if (!mainAudio) {
        console.log('❌ No audio element found');
        
        // Try to find ALL audio elements for debugging
        const allAudio = document.querySelectorAll('audio');
        console.log('🔍 Found audio elements:', allAudio.length);
        allAudio.forEach((audio, index) => {
          console.log(`Audio ${index}:`, {
            src: audio.src,
            currentSrc: audio.currentSrc,
            paused: audio.paused,
            hidden: audio.hidden,
            style: audio.style.display
          });
        });
        return;
      }

      console.log('🔍 Detailed audio element state:');
      console.log('- Audio src:', mainAudio.src);
      console.log('- Audio currentSrc:', mainAudio.currentSrc);
      console.log('- Audio paused:', mainAudio.paused);
      console.log('- Audio currentTime:', mainAudio.currentTime);
      console.log('- Audio duration:', mainAudio.duration);
      console.log('- Audio readyState:', mainAudio.readyState, '(0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA)');
      console.log('- Audio networkState:', mainAudio.networkState, '(0=EMPTY, 1=IDLE, 2=LOADING, 3=NO_SOURCE)');
      console.log('- Audio error:', mainAudio.error);
      console.log('- Audio ended:', mainAudio.ended);
      console.log('- Audio seeking:', mainAudio.seeking);
      console.log('- Audio volume:', mainAudio.volume);
      console.log('- Audio muted:', mainAudio.muted);
      console.log('- Audio autoplay:', mainAudio.autoplay);
      console.log('- Audio loop:', mainAudio.loop);
      console.log('- Audio preload:', mainAudio.preload);
      console.log('- Audio crossOrigin:', mainAudio.crossOrigin);

      if (isPlaying) {
        console.log('⏸️ Attempting to pause audio');
        try {
          mainAudio.pause();
          console.log('✅ Audio pause() succeeded');
        } catch (error) {
          console.log('❌ Audio pause() failed:', error);
        }
      } else {
        console.log('▶️ Attempting to play audio');
        
        // Check if audio has a valid source
        if (!mainAudio.src && !mainAudio.currentSrc) {
          console.log('❌ Audio has no source set!');
          console.log('currentTrack:', currentTrack);
          if (currentTrack) {
            console.log('Setting audio source to:', currentTrack.url);
            mainAudio.src = currentTrack.url;
            mainAudio.load();
          }
        }
        
        mainAudio.play().then(() => {
          console.log('✅ Audio play() succeeded');
        }).catch((error) => {
          console.log('❌ Audio play() failed:', error);
          console.log('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code
          });
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
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mainAudio = document.querySelector('audio') as HTMLAudioElement;
    if (!mainAudio) return;

    const newVolume = parseInt(e.target.value) / 100;
    mainAudio.volume = newVolume;
    setVolume(newVolume);
  };

  const handleLyricClick = (time: number) => {
    const mainAudio = document.querySelector('audio') as HTMLAudioElement;
    if (!mainAudio) return;

    mainAudio.currentTime = time;
    setCurrentTime(time);
    
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

  if (!isOpen || !currentTrack) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black overflow-hidden">
      {/* Enhanced Blurred background image */}
      {currentTrack.coverArt && (
        <div className="absolute inset-0 w-full h-full">
          {/* Main background */}
          <div 
            className="absolute inset-0 w-full h-full"
            style={{
              backgroundImage: `url(${currentTrack.coverArt})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: 'blur(20px) brightness(0.3)',
              transform: 'scale(1.1)',
            }}
          />
          {/* Top gradient blur for mobile */}
          <div 
            className="absolute top-0 left-0 right-0 h-32"
            style={{
              background: `linear-gradient(to bottom, 
                rgba(0,0,0,0.8) 0%, 
                rgba(0,0,0,0.4) 50%, 
                transparent 100%)`,
              backdropFilter: 'blur(10px)',
            }}
          />
          {/* Bottom gradient blur for mobile */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-32"
            style={{
              background: `linear-gradient(to top, 
                rgba(0,0,0,0.8) 0%, 
                rgba(0,0,0,0.4) 50%, 
                transparent 100%)`,
              backdropFilter: 'blur(10px)',
            }}
          />
        </div>
      )}
      
      {/* Overlay for better contrast */}
      <div className="absolute inset-0 bg-black/30" />
      
      <div className="relative h-full w-full flex flex-col">
        
        {/* Mobile Close Handle */}
        {isMobile && (
          <div className="flex justify-center py-4 px-4">
            <div 
              onClick={onClose}
              className="cursor-pointer px-8 py-3 -mx-8 -my-3"
              style={{ touchAction: 'manipulation' }}
            >
              <div className="w-8 h-1 bg-gray-300 rounded-full opacity-60" />
            </div>
          </div>
        )}

        {/* Desktop Header */}
        {!isMobile && (
          <div className="absolute top-0 right-0 z-10 p-4 lg:p-6">
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
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {isMobile ? (
            /* Mobile Tab Content */
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-hidden">
                {activeTab === 'player' && (
                  <div className="h-full flex flex-col justify-center items-center px-8 py-4">
                    {/* Mobile Album Art */}
                    <div className="relative mb-6 shrink-0">
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
                  </div>
                )}

                {activeTab === 'lyrics' && lyrics.length > 0 && (
                  <div className="h-full flex flex-col px-4">
                    <div 
                      className="flex-1 overflow-y-auto"
                      ref={lyricsRef}
                    >
                      <div className="space-y-3 py-4">
                        {lyrics.map((line, index) => (
                          <div
                            key={index}
                            data-lyric-index={index}
                            onClick={() => handleLyricClick(line.time)}
                            className={`text-base leading-relaxed transition-all duration-300 break-words cursor-pointer hover:text-foreground px-2 ${
                              index === currentLyricIndex
                                ? 'text-foreground font-bold text-xl'
                                : index < currentLyricIndex
                                ? 'text-foreground/60'
                                : 'text-foreground/40'
                            }`}
                            style={{ 
                              wordWrap: 'break-word',
                              overflowWrap: 'break-word',
                              hyphens: 'auto',
                              paddingBottom: '4px'
                            }}
                            title={`Click to jump to ${formatTime(line.time)}`}
                          >
                            {line.text || '♪'}
                          </div>
                        ))}
                        <div style={{ height: '200px' }} />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'queue' && (
                  <div className="h-full flex flex-col px-4">
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
                  </div>
                )}
              </div>

              {/* Mobile Tab Bar */}
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
                {/* Album Art */}
                <div className="relative mb-6 shrink-0">
                  <Image
                    src={currentTrack.coverArt || '/default-album.png'}
                    alt={currentTrack.album}
                    width={320}
                    height={320}
                    className="w-80 h-80 rounded-lg shadow-2xl object-cover"
                    priority
                  />
                </div>

                {/* Track Info */}
                <div className="text-center mb-6 px-4 shrink-0 max-w-full">
                  <h1 className="text-3xl font-bold text-foreground line-clamp-2 leading-tight mb-2">
                    {currentTrack.name}
                  </h1>
                  <Link href={`/artist/${currentTrack.artistId}`} className="text-xl text-foreground/80 mb-1 line-clamp-1">
                    {currentTrack.artist}
                  </Link>
                  <Link href={`/album/${currentTrack.albumId}`}  className="text-lg text-foreground/60 line-clamp-1 cursor-pointer hover:underline">
                    {currentTrack.album}
                  </Link>
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
              {showLyrics && lyrics.length > 0 && (
                <div className="flex-1 min-w-0 min-h-0 flex flex-col" ref={lyricsRef}>
                  <div className="h-full flex flex-col">
                    <ScrollArea className="flex-1 min-h-0">
                      <div className="space-y-3 pl-4 pr-4 py-4">
                        {lyrics.map((line, index) => (
                          <div
                            key={index}
                            data-lyric-index={index}
                            onClick={() => handleLyricClick(line.time)}
                            className={`text-base leading-relaxed transition-all duration-300 break-words cursor-pointer hover:text-foreground ${
                              index === currentLyricIndex
                                ? 'text-foreground font-bold text-2xl'
                                : index < currentLyricIndex
                                ? 'text-foreground/60'
                                : 'text-foreground/40'
                            }`}
                            style={{ 
                              wordWrap: 'break-word',
                              overflowWrap: 'break-word',
                              hyphens: 'auto',
                              paddingBottom: '4px',
                              paddingLeft: '8px'
                            }}
                            title={`Click to jump to ${formatTime(line.time)}`}
                          >
                            {line.text || '♪'}
                          </div>
                        ))}
                        <div style={{ height: '200px' }} />
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
