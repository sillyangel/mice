'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { Track } from '@/app/components/AudioPlayerContext';

// Interface for a single day's listening data
export interface DayStreakData {
  date: string; // ISO string of the date
  tracks: number; // Number of tracks played that day
  uniqueArtists: Set<string>; // Unique artists listened to
  uniqueAlbums: Set<string>; // Unique albums listened to
  totalListeningTime: number; // Total seconds listened
}

// Interface for streak statistics
export interface StreakStats {
  currentStreak: number; // Current consecutive days streak
  longestStreak: number; // Longest streak ever achieved
  totalDaysListened: number; // Total days with listening activity
  lastListenedDate: string | null; // Last date with listening activity
}

const STREAK_THRESHOLD_TRACKS = 3; // Minimum tracks to count as an active day
const STREAK_THRESHOLD_TIME = 5 * 60; // 5 minutes minimum listening time

export function useListeningStreak() {
  const [streakData, setStreakData] = useState<Map<string, DayStreakData>>(new Map());
  const [stats, setStats] = useState<StreakStats>({
    currentStreak: 0,
    longestStreak: 0,
    totalDaysListened: 0,
    lastListenedDate: null,
  });
  const { playedTracks, currentTrack } = useAudioPlayer();

  // Initialize streak data from localStorage
  useEffect(() => {
    // Check if we're in the browser environment
    if (typeof window === 'undefined') return;
    
    try {
      const savedStreakData = localStorage.getItem('navidrome-streak-data');
      const savedStats = localStorage.getItem('navidrome-streak-stats');
      
      if (savedStreakData) {
        // Convert the plain object back to a Map
        const parsedData = JSON.parse(savedStreakData);
        const dataMap = new Map<string, DayStreakData>();
        
        // Reconstruct the Map and Sets
        Object.entries(parsedData).forEach(([key, value]: [string, any]) => {
          dataMap.set(key, {
            ...value,
            uniqueArtists: new Set(value.uniqueArtists),
            uniqueAlbums: new Set(value.uniqueAlbums)
          });
        });
        
        setStreakData(dataMap);
      }
      
      if (savedStats) {
        setStats(JSON.parse(savedStats));
      }
      
      // Check if we need to update the streak based on the current date
      updateStreakStatus();
      
    } catch (error) {
      console.error('Failed to load streak data:', error);
    }
  }, []);

  // Save streak data to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined' || streakData.size === 0) return;
    
    try {
      // Convert Map to a plain object for serialization
      const dataObject: Record<string, any> = {};
      
      streakData.forEach((value, key) => {
        dataObject[key] = {
          ...value,
          uniqueArtists: Array.from(value.uniqueArtists),
          uniqueAlbums: Array.from(value.uniqueAlbums)
        };
      });
      
      localStorage.setItem('navidrome-streak-data', JSON.stringify(dataObject));
      localStorage.setItem('navidrome-streak-stats', JSON.stringify(stats));
      
    } catch (error) {
      console.error('Failed to save streak data:', error);
    }
  }, [streakData, stats]);

  // Process playedTracks to update the streak
  useEffect(() => {
    if (playedTracks.length === 0) return;
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Update streak data for today
    setStreakData(prev => {
      const updated = new Map(prev);
      
      const todayData = updated.get(today) || {
        date: today,
        tracks: 0,
        uniqueArtists: new Set<string>(),
        uniqueAlbums: new Set<string>(),
        totalListeningTime: 0
      };
      
      // Update today's data based on played tracks
      // For simplicity, we'll assume one track added = one complete listen
      const lastTrack = playedTracks[playedTracks.length - 1];
      
      todayData.tracks += 1;
      todayData.uniqueArtists.add(lastTrack.artistId);
      todayData.uniqueAlbums.add(lastTrack.albumId);
      todayData.totalListeningTime += lastTrack.duration;
      
      updated.set(today, todayData);
      return updated;
    });
    
    // Update streak statistics
    updateStreakStatus();
  }, [playedTracks.length]);

  // Function to update streak status based on current data
  const updateStreakStatus = useCallback(() => {
    if (streakData.size === 0) return;
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // Sort dates in descending order (newest first)
    const dates = Array.from(streakData.keys()).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
    
    // Check which days count as active based on threshold
    const activeDays = dates.filter(date => {
      const dayData = streakData.get(date);
      if (!dayData) return false;
      
      return dayData.tracks >= STREAK_THRESHOLD_TRACKS || 
             dayData.totalListeningTime >= STREAK_THRESHOLD_TIME;
    });
    
    // Calculate current streak
    let currentStreak = 0;
    let checkDate = new Date(today);
    
    // Keep checking consecutive days backward until streak breaks
    while (true) {
      const dateString = checkDate.toISOString().split('T')[0];
      if (activeDays.includes(dateString)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1); // Go back one day
      } else {
        break; // Streak broken
      }
    }
    
    // Get total active days
    const totalDaysListened = activeDays.length;
    
    // Get longest streak (requires analyzing all streaks)
    let longestStreak = currentStreak;
    let tempStreak = 0;
    
    // Sort dates in ascending order for streak calculation
    const ascDates = [...activeDays].sort();
    
    for (let i = 0; i < ascDates.length; i++) {
      const currentDate = new Date(ascDates[i]);
      
      if (i > 0) {
        const prevDate = new Date(ascDates[i-1]);
        prevDate.setDate(prevDate.getDate() + 1);
        
        // If dates are consecutive
        if (currentDate.getTime() === prevDate.getTime()) {
          tempStreak++;
        } else {
          // Streak broken
          tempStreak = 1;
        }
      } else {
        tempStreak = 1; // First active day
      }
      
      longestStreak = Math.max(longestStreak, tempStreak);
    }
    
    // Get last listened date
    const lastListenedDate = activeDays.length > 0 ? activeDays[0] : null;
    
    // Update stats
    setStats({
      currentStreak,
      longestStreak,
      totalDaysListened,
      lastListenedDate
    });
  }, [streakData]);

  // Check if user has listened today
  const hasListenedToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayData = streakData.get(today);
    
    return todayData && (
      todayData.tracks >= STREAK_THRESHOLD_TRACKS || 
      todayData.totalListeningTime >= STREAK_THRESHOLD_TIME
    );
  }, [streakData]);

  // Get streak emoji representation
  const getStreakEmoji = useCallback(() => {
    if (stats.currentStreak <= 0) return '';
    
    if (stats.currentStreak >= 30) return '🔥🔥🔥'; // 30+ days
    if (stats.currentStreak >= 14) return '🔥🔥';   // 14+ days
    if (stats.currentStreak >= 7) return '🔥';      // 7+ days
    if (stats.currentStreak >= 3) return '✨';      // 3+ days
    return '📅';  // 1-2 days
  }, [stats.currentStreak]);

  // Get today's listening summary
  const getTodaySummary = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayData = streakData.get(today);
    
    if (!todayData) {
      return {
        tracks: 0,
        artists: 0,
        albums: 0,
        time: '0m'
      };
    }
    
    // Format time nicely
    const minutes = Math.floor(todayData.totalListeningTime / 60);
    const timeDisplay = minutes === 1 ? '1m' : `${minutes}m`;
    
    return {
      tracks: todayData.tracks,
      artists: todayData.uniqueArtists.size,
      albums: todayData.uniqueAlbums.size,
      time: timeDisplay
    };
  }, [streakData]);

  // Reset streak data (for testing)
  const resetStreakData = useCallback(() => {
    setStreakData(new Map());
    setStats({
      currentStreak: 0,
      longestStreak: 0,
      totalDaysListened: 0,
      lastListenedDate: null,
    });
    
    localStorage.removeItem('navidrome-streak-data');
    localStorage.removeItem('navidrome-streak-stats');
  }, []);

  return {
    stats,
    hasListenedToday,
    getStreakEmoji,
    getTodaySummary,
    resetStreakData,
    streakThresholds: {
      tracks: STREAK_THRESHOLD_TRACKS,
      time: STREAK_THRESHOLD_TIME
    }
  };
}
