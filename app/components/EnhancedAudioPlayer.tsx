'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Repeat, Shuffle, Heart, MoreHorizontal } from "lucide-react";
import { useAudioPlayer, Track } from "./AudioPlayerContext";
import { GaplessAudioPlayer, GaplessAudioPlayerRef } from "./GaplessAudioPlayer";
import Image from "next/image";
import { useLastFmScrobbler } from "@/hooks/use-lastfm-scrobbler";

export default function EnhancedAudioPlayer() {
  const { 
    currentTrack, 
    playNextTrack, 
    playPreviousTrack, 
    queue, 
    cacheStatus 
  } = useAudioPlayer();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [repeat, setRepeat] = useState<'none' | 'one' | 'all'>('none');
  const [crossfadeDuration, setCrossfadeDuration] = useState(3); // 3 second crossfade
  const [isLoading, setIsLoading] = useState(false);
  
  const audioPlayerRef = useRef<GaplessAudioPlayerRef>(null);
  const previousVolumeRef = useRef(volume);
  const { onTrackStart, onTrackProgress, onTrackEnd } = useLastFmScrobbler();

  // Load saved settings
  useEffect(() => {
    const savedVolume = localStorage.getItem('audio-volume');
    const savedCrossfade = localStorage.getItem('crossfade-duration');
    const savedRepeat = localStorage.getItem('repeat-mode');
    
    if (savedVolume) setVolume(parseFloat(savedVolume));
    if (savedCrossfade) setCrossfadeDuration(parseInt(savedCrossfade));
    if (savedRepeat) setRepeat(savedRepeat as 'none' | 'one' | 'all');
  }, []);

  // Save settings
  useEffect(() => {
    localStorage.setItem('audio-volume', volume.toString());
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('crossfade-duration', crossfadeDuration.toString());
  }, [crossfadeDuration]);

  useEffect(() => {
    localStorage.setItem('repeat-mode', repeat);
  }, [repeat]);
  // Handle track changes for scrobbling
  const handleTrackStart = useCallback((track: Track) => {
    onTrackStart(track);
  }, [onTrackStart]);

  const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
    setCurrentTime(currentTime);
    setDuration(duration);
    
    if (currentTrack) {
      onTrackProgress(currentTrack, currentTime, duration);
    }
  }, [currentTrack, onTrackProgress]);

  const handleTrackEnd = useCallback(() => {
    if (currentTrack) {
      onTrackEnd(currentTrack, currentTime, duration);
    }

    // Handle repeat modes
    if (repeat === 'one') {
      // Replay current track
      if (audioPlayerRef.current) {
        audioPlayerRef.current.seek(0);
        return;
      }
    } else if (repeat === 'all' && queue.length === 0 && currentTrack) {
      // If we're at the end of the queue and repeat all is on, restart current track
      if (audioPlayerRef.current) {
        audioPlayerRef.current.seek(0);
        return;
      }
    }

    // Normal behavior: play next track
    playNextTrack();
  }, [currentTrack, currentTime, duration, onTrackEnd, repeat, queue, playNextTrack]);

  const handlePlayPause = () => {
    if (audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
      } else {
        audioPlayerRef.current.play();
      }
    }
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    if (audioPlayerRef.current) {
      audioPlayerRef.current.seek(newTime);
    }
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleMute = () => {
    if (isMuted) {
      setVolume(previousVolumeRef.current);
      setIsMuted(false);
    } else {
      previousVolumeRef.current = volume;
      setVolume(0);
      setIsMuted(true);
    }
  };

  const toggleRepeat = () => {
    const modes: ('none' | 'one' | 'all')[] = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(repeat);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeat(modes[nextIndex]);
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRepeatIcon = () => {
    switch (repeat) {
      case 'one':
        return <Repeat className="h-4 w-4" />;
      case 'all':
        return <Repeat className="h-4 w-4" />;
      default:
        return <Repeat className="h-4 w-4 opacity-50" />;
    }
  };

  if (!currentTrack) {
    return null;
  }

  return (
    <>
      {/* Hidden gapless audio player */}
      <GaplessAudioPlayer
        ref={audioPlayerRef}
        currentTrack={currentTrack}
        onTrackEnd={handleTrackEnd}
        onTimeUpdate={handleTimeUpdate}
        onTrackStart={handleTrackStart}
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        volume={volume}
        crossfadeDuration={crossfadeDuration}
      />
      
      {/* Player UI */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-50">
        <div className="flex items-center justify-between p-4">
          {/* Track info */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="w-12 h-12 bg-muted rounded-md overflow-hidden flex-shrink-0">
              {currentTrack.coverArt && (
                <Image
                  src={currentTrack.coverArt}
                  alt={currentTrack.album}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{currentTrack.name}</div>
              <div className="text-sm text-muted-foreground truncate">{currentTrack.artist}</div>
            </div>
            <Button variant="ghost" size="sm">
              <Heart className="h-4 w-4" />
            </Button>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-4 flex-1 justify-center">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleRepeat}
                className={repeat !== 'none' ? 'text-primary' : ''}
              >
                {getRepeatIcon()}
              </Button>
              
              <Button variant="ghost" size="sm" onClick={playPreviousTrack}>
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayPause}
                disabled={isLoading}
                className="w-10 h-10 rounded-full"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              
              <Button variant="ghost" size="sm" onClick={playNextTrack}>
                <SkipForward className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="sm">
                <Shuffle className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress bar */}
            <div className="flex items-center space-x-2 w-full max-w-md">
              <span className="text-xs text-muted-foreground w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-10">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Volume and options */}
          <div className="flex items-center space-x-3 flex-1 justify-end">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={handleMute}>
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Slider
                value={[volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-20"
              />
            </div>
            
            {/* Cache status indicator */}
            <div className="text-xs text-muted-foreground">
              Cache: {cacheStatus.size}/{cacheStatus.maxSize}
            </div>
            
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
