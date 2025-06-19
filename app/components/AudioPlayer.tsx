'use client';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { FaPlay, FaPause, FaVolumeHigh, FaForward, FaBackward, FaExpand, FaCompress, FaVolumeXmark } from "react-icons/fa6";
import ColorThief from '@neutrixs/colorthief';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

export const AudioPlayer: React.FC = () => {
  const { currentTrack, playPreviousTrack, addToQueue, playNextTrack, clearQueue } = useAudioPlayer();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isClient, setIsClient] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const audioCurrent = audioRef.current;
  const { toast } = useToast();
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Save position when component unmounts or track changes
  useEffect(() => {
    const audioCurrent = audioRef.current;
    return () => {
      if (audioCurrent && currentTrack && audioCurrent.currentTime > 10) {
        localStorage.setItem(`navidrome-track-time-${currentTrack.id}`, audioCurrent.currentTime.toString());
      }
    };
  }, [currentTrack]);

  useEffect(() => {
    const audioCurrent = audioRef.current;
    
    if (currentTrack && audioCurrent && audioCurrent.src !== currentTrack.url) {
      audioCurrent.src = currentTrack.url;
      
      // Check for saved timestamp (only restore if more than 10 seconds in)
      const savedTime = localStorage.getItem(`navidrome-track-time-${currentTrack.id}`);
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
      }
      
      audioCurrent.play();
      setIsPlaying(true);
    }
  }, [currentTrack]);

  useEffect(() => {
    const audioCurrent = audioRef.current;
    let lastSavedTime = 0;

    const updateProgress = () => {
      if (audioCurrent && currentTrack) {
        setProgress((audioCurrent.currentTime / audioCurrent.duration) * 100);
        
        // Save current time every 10 seconds, but only if we've moved forward significantly
        const currentTime = audioCurrent.currentTime;
        if (Math.abs(currentTime - lastSavedTime) >= 10 && currentTime > 10) {
          localStorage.setItem(`navidrome-track-time-${currentTrack.id}`, currentTime.toString());
          lastSavedTime = currentTime;
        }
      }
    };

    const handleTrackEnd = () => {
      if (currentTrack) {
        // Clear saved time when track ends
        localStorage.removeItem(`navidrome-track-time-${currentTrack.id}`);
      }
      playNextTrack();
    };

    const handleSeeked = () => {
      if (audioCurrent && currentTrack) {
        // Save immediately when user seeks
        localStorage.setItem(`navidrome-track-time-${currentTrack.id}`, audioCurrent.currentTime.toString());
        lastSavedTime = audioCurrent.currentTime;
      }
    };
    
    if (audioCurrent) {
      audioCurrent.addEventListener('timeupdate', updateProgress);
      audioCurrent.addEventListener('ended', handleTrackEnd);
      audioCurrent.addEventListener('seeked', handleSeeked);
    }
    
    return () => {
      if (audioCurrent) {
        audioCurrent.removeEventListener('timeupdate', updateProgress);
        audioCurrent.removeEventListener('ended', handleTrackEnd);
        audioCurrent.removeEventListener('seeked', handleSeeked);
      }
    };
  }, [playNextTrack, currentTrack]);
  
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (audioCurrent && currentTrack) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * audioCurrent.duration;
      audioCurrent.currentTime = newTime;
      
      // Save the new position immediately
      localStorage.setItem(`navidrome-track-time-${currentTrack.id}`, newTime.toString());
    }
  };

  const togglePlayPause = () => {
    if (audioCurrent) {
      if (isPlaying) {
        audioCurrent.pause();
      } else {
        audioCurrent.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioCurrent) {
      audioCurrent.volume = newVolume;
    }
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
      <div className="fixed bottom-4 right-4 z-50">
        <div 
          className="bg-background/95 backdrop-blur-sm border rounded-full shadow-lg cursor-pointer hover:scale-105 transition-transform"
          onClick={() => setIsMinimized(false)}
        >
          <div className="flex items-center p-2">
            <Image 
              src={currentTrack.coverArt || '/default-user.jpg'} 
              alt={currentTrack.name} 
              width={40} 
              height={40} 
              className="w-10 h-10 rounded-full" 
            />
            <button 
              className="ml-2 p-2 hover:bg-gray-700/50 rounded-full transition-colors" 
              onClick={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
            >
              {isPlaying ? <FaPause className="w-4 h-4" /> : <FaPlay className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <audio ref={audioRef} hidden />
      </div>
    );
  }

  // Compact floating player (default state)
  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-3 w-80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center flex-1 min-w-0">
              <Image 
                src={currentTrack.coverArt || '/default-user.jpg'} 
                alt={currentTrack.name} 
                width={48} 
                height={48} 
                className="w-12 h-12 rounded-md mr-3 flex-shrink-0" 
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-sm">{currentTrack.name}</p>
                <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 ml-2">
              <button 
                className="p-1.5 hover:bg-gray-700/50 rounded-full transition-colors" 
                onClick={() => setIsMinimized(true)}
                title="Minimize"
              >
                <FaCompress className="w-3 h-3" />
              </button>
              <button 
                className="p-1.5 hover:bg-gray-700/50 rounded-full transition-colors" 
                onClick={() => setIsExpanded(true)}
                title="Expand"
              >
                <FaExpand className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          {/* Control buttons */}
          <div className="flex items-center justify-center space-x-2 mb-2">
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
          
          {/* Progress bar */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground w-8 text-right">
              {formatTime(audioCurrent?.currentTime ?? 0)}
            </span>
            <Progress value={progress} className="flex-1 cursor-pointer h-1" onClick={handleProgressClick}/>
            <span className="text-xs text-muted-foreground w-8">
              {formatTime(audioCurrent?.duration ?? 0)}
            </span>
          </div>
        </div>
        <audio ref={audioRef} hidden />
      </div>
    );
  }

  // Full expanded player
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-4 w-96">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Now Playing</h3>
          <div className="flex items-center space-x-1">
            <button 
              className="p-1.5 hover:bg-gray-700/50 rounded-full transition-colors" 
              onClick={() => setIsExpanded(false)}
              title="Collapse"
            >
              <FaCompress className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center mb-4">
          <Image 
            src={currentTrack.coverArt || '/default-user.jpg'} 
            alt={currentTrack.name} 
            width={80} 
            height={80} 
            className="w-20 h-20 rounded-lg mr-4 flex-shrink-0" 
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg leading-tight">{currentTrack.name}</p>
            <p className="text-muted-foreground">{currentTrack.artist}</p>
            <p className="text-sm text-muted-foreground">{currentTrack.album}</p>
          </div>
        </div>
        
        {/* Control buttons */}
        <div className="flex items-center justify-center space-x-4 mb-4">
          <button className="p-2 hover:bg-gray-700/50 rounded-full transition-colors" onClick={playPreviousTrack}>
            <FaBackward className="w-4 h-4" />
          </button>
          <button className="p-3 hover:bg-gray-700/50 rounded-full transition-colors" onClick={togglePlayPause}>
            {isPlaying ? <FaPause className="w-5 h-5" /> : <FaPlay className="w-5 h-5" />}
          </button>
          <button className="p-2 hover:bg-gray-700/50 rounded-full transition-colors" onClick={playNextTrack}>
            <FaForward className="w-4 h-4" />
          </button>
        </div>
        
        {/* Progress bar */}
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-xs text-muted-foreground w-10 text-right">
            {formatTime(audioCurrent?.currentTime ?? 0)}
          </span>
          <Progress value={progress} className="flex-1 cursor-pointer" onClick={handleProgressClick}/>
          <span className="text-xs text-muted-foreground w-10">
            {formatTime(audioCurrent?.duration ?? 0)}
          </span>
        </div>
        
        {/* Volume control */}
        <div className="flex items-center space-x-2">
          <button 
            className="p-2 hover:bg-gray-700/50 rounded-full transition-colors" 
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
          >
            {volume === 0 ? <FaVolumeXmark className="w-4 h-4" /> : <FaVolumeHigh className="w-4 h-4" />}
          </button>
          {showVolumeSlider && (
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          )}
        </div>
        
        <audio ref={audioRef} hidden />
      </div>
    </div>
  );
};