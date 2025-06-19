'use client';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { FaPlay, FaPause, FaVolumeHigh, FaForward, FaBackward } from "react-icons/fa6";
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
  const audioCurrent = audioRef.current;
  const { toast } = useToast();
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Save position when component unmounts or track changes
  useEffect(() => {
    return () => {
      const audioCurrent = audioRef.current;
      if (audioCurrent && currentTrack && audioCurrent.currentTime > 10) {
        localStorage.setItem(`navidrome-track-time-${currentTrack.id}`, audioCurrent.currentTime.toString());
      }
    };
  }, [currentTrack?.id]);

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
  }, [currentTrack?.id, currentTrack?.url]);

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
  
  if (!isClient) {
    return null;
  }

  return (
    <div className="bg-background w-full text-white p-4 border-t border-t-1">
      {currentTrack ? (
        <div className="flex items-center">
          <Image 
            src={currentTrack.coverArt || '/default-user.jpg'} 
            alt={currentTrack.name} 
            width={64} 
            height={64} 
            className="w-16 h-16 mr-4 rounded-md" 
          />
          <div className="flex-1 w-auto mr-4">
            <p className="mb-0 font-semibold">{currentTrack.name}</p>
            <p className='text-sm mt-0 text-gray-400'>{currentTrack.artist}</p>
          </div>
          <div className="flex flex-col items-center mr-6">
            <div className="flex items-center space-x-2 mb-2">
              <button className="p-2 hover:bg-gray-700 rounded-full transition-colors" onClick={playPreviousTrack}>
                <FaBackward className="w-4 h-4" />
              </button>
              <button className='p-3 hover:bg-gray-700 rounded-full transition-colors' onClick={togglePlayPause}>
                {isPlaying ? <FaPause className="w-5 h-5" /> : <FaPlay className="w-5 h-5" />}
              </button>
              <button className='p-2 hover:bg-gray-700 rounded-full transition-colors' onClick={playNextTrack}>
                <FaForward className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center space-x-2 w-full">
              <span className="text-xs text-gray-400 w-10 text-right">
                {formatTime(audioCurrent?.currentTime ?? 0)}
              </span>
              <Progress value={progress} className="flex-1 cursor-pointer" onClick={handleProgressClick}/>
              <span className="text-xs text-gray-400 w-10">
                {formatTime(audioCurrent?.duration ?? 0)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <p>No track playing</p>
      )}
      <audio ref={audioRef} hidden />
    </div>
  );
};