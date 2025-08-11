'use client';

import { useEffect, useState } from 'react';
import { useListeningStreak } from '@/hooks/use-listening-streak';
import { Card, CardContent } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

export default function CompactListeningStreak() {
  const { stats, hasListenedToday, getStreakEmoji } = useListeningStreak();
  const [animate, setAnimate] = useState(false);
  
  // Trigger animation when streak increases
  useEffect(() => {
    if (stats.currentStreak > 0) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [stats.currentStreak]);

  const hasCompletedToday = hasListenedToday();
  const streakEmoji = getStreakEmoji();
  
  // Only show if the streak is 3 days or more
  if (stats.currentStreak < 3) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className={cn(
              "w-5 h-5",
              hasCompletedToday ? "text-amber-500" : "text-muted-foreground"
            )} />
            <AnimatePresence>
              <motion.div 
                key={stats.currentStreak}
                initial={{ scale: animate ? 0.8 : 1 }}
                animate={{ scale: 1 }}
                className="flex items-center"
              >
                <span className="text-xl font-bold">
                  {stats.currentStreak}
                </span>
                <span className="ml-1 text-sm text-muted-foreground">
                  day streak
                </span>
                {streakEmoji && (
                  <motion.span 
                    className="ml-1 text-xl"
                    animate={{ rotate: animate ? [0, 15, -15, 0] : 0 }}
                  >
                    {streakEmoji}
                  </motion.span>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="text-sm text-muted-foreground">
            {hasCompletedToday ? "Today's goal complete!" : "Keep listening!"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
