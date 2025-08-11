'use client';

import { useEffect, useState } from 'react';
import { useListeningStreak } from '@/hooks/use-listening-streak';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Flame, Calendar, Clock, Music, Disc, User2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ListeningStreakCard() {
  const { stats, hasListenedToday, getStreakEmoji, getTodaySummary, streakThresholds } = useListeningStreak();
  const [animate, setAnimate] = useState(false);
  
  // Trigger animation when streak increases
  useEffect(() => {
    if (stats.currentStreak > 0) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [stats.currentStreak]);

  const todaySummary = getTodaySummary();
  const hasCompletedToday = hasListenedToday();
  
  // Calculate progress towards today's goal
  const trackProgress = Math.min(100, (todaySummary.tracks / streakThresholds.tracks) * 100);
  const timeInMinutes = parseInt(todaySummary.time.replace('m', ''), 10) || 0;
  const timeThresholdMinutes = Math.floor(streakThresholds.time / 60);
  const timeProgress = Math.min(100, (timeInMinutes / timeThresholdMinutes) * 100);
  
  // Overall progress (highest of the two metrics)
  const overallProgress = Math.max(trackProgress, timeProgress);

  return (
    <Card className="mb-6 break-inside-avoid py-5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className={cn(
              "w-5 h-5 transition-all",
              hasCompletedToday ? "text-amber-500" : "text-muted-foreground"
            )} />
            <span>Listening Streak</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-normal text-muted-foreground">
              {stats.totalDaysListened} days
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center py-2">
          <AnimatePresence>
            <motion.div 
              key={stats.currentStreak}
              initial={{ scale: animate ? 0.5 : 1 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.5 }}
              className="relative mb-2"
            >
              <div className="text-5xl font-bold text-center">
                {stats.currentStreak}
              </div>
              <div className="text-sm text-center text-muted-foreground">
                day{stats.currentStreak !== 1 ? 's' : ''} streak
              </div>
              {getStreakEmoji() && (
                <motion.div 
                  className="absolute -top-2 -right-4 text-2xl"
                  animate={{ rotate: animate ? [0, 15, -15, 0] : 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {getStreakEmoji()}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="w-full mt-4">
            <div className="flex justify-between items-center text-sm mb-1">
              <span className="text-muted-foreground">Today&apos;s Progress</span>
              <span className={cn(
                hasCompletedToday ? "text-green-500 font-medium" : "text-muted-foreground"
              )}>
                {hasCompletedToday ? "Complete!" : "In progress..."}
              </span>
            </div>
            <Progress 
              value={overallProgress} 
              className={cn(
                "h-2",
                hasCompletedToday ? "bg-green-500/20" : "",
                hasCompletedToday ? "[&>div]:bg-green-500" : ""
              )} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4 w-full mt-6">
            <div className="flex flex-col items-center p-3 rounded-md bg-accent/30">
              <div className="flex items-center gap-2 mb-1">
                <Music className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tracks</span>
              </div>
              <span className="text-xl font-semibold">{todaySummary.tracks}</span>
              <span className="text-xs text-muted-foreground">
                Goal: {streakThresholds.tracks}
              </span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-md bg-accent/30">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Time</span>
              </div>
              <span className="text-xl font-semibold">{todaySummary.time}</span>
              <span className="text-xs text-muted-foreground">
                Goal: {timeThresholdMinutes}m
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full mt-4">
            <div className="flex flex-col items-center p-3 rounded-md bg-accent/20">
              <div className="flex items-center gap-2 mb-1">
                <User2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Artists</span>
              </div>
              <span className="text-xl font-semibold">{todaySummary.artists}</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-md bg-accent/20">
              <div className="flex items-center gap-2 mb-1">
                <Disc className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Albums</span>
              </div>
              <span className="text-xl font-semibold">{todaySummary.albums}</span>
            </div>
          </div>

          <div className="mt-4 text-xs text-center text-muted-foreground">
            {hasCompletedToday ? (
              <span>You&#39;ve met your daily listening goal! 🎵</span>
            ) : (
              <span>Listen to {streakThresholds.tracks} tracks or {timeThresholdMinutes} minutes to continue your streak!</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
