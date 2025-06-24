'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { getNavidromeAPI } from '@/lib/navidrome';
import { Play, Plus, User, Disc, History, Trash2 } from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function HistoryPage() {
  const { playedTracks, clearHistory, playTrack, addToQueue, currentTrack } = useAudioPlayer();
  const [groupedHistory, setGroupedHistory] = useState<{ [date: string]: typeof playedTracks }>({});
  const api = getNavidromeAPI();

  useEffect(() => {
    // Group tracks by date
    const grouped = playedTracks.reduce((acc, track, index) => {
      // Since we don't have timestamps, we'll group by position in array
      // More recent tracks will be at the end of the array
      const now = new Date();
      const daysAgo = Math.floor(index / 10); // Roughly group every 10 tracks as a different day
      const date = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      const dateKey = date.toLocaleDateString();
      
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].unshift(track); // Add to beginning to show most recent first
      return acc;
    }, {} as { [date: string]: typeof playedTracks });

    setGroupedHistory(grouped);
  }, [playedTracks]);

  const handlePlayClick = (track: typeof playedTracks[0]) => {
    if (!api) {
      console.error('Navidrome API not available');
      return;
    }
    playTrack(track);
  };

  const handleAddToQueue = (track: typeof playedTracks[0]) => {
    if (!api) {
      console.error('Navidrome API not available');
      return;
    }
    addToQueue(track);
  };

  const isCurrentlyPlaying = (track: typeof playedTracks[0]): boolean => {
    return currentTrack?.id === track.id;
  };

  const formatDuration = (duration: number): string => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const totalTracks = playedTracks.length;
  const uniqueTracks = new Set(playedTracks.map(track => track.id)).size;

  return (
    <div className="h-full px-4 py-6 lg:px-8">
      <Tabs defaultValue="music" className="h-full space-y-6">
        <TabsContent value="music" className="border-none p-0 outline-none">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <History className="w-6 h-6" />
                <p className="text-2xl font-semibold tracking-tight">
                  Listening History
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {totalTracks} total plays • {uniqueTracks} unique tracks
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Clear History
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Listening History</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your entire listening history. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearHistory}>
                    Clear History
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          
          <Separator className="my-4" />
          
          {playedTracks.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No listening history yet</h3>
              <p className="text-muted-foreground">
                Start playing music to build your listening history
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-250px)]">
              <div className="space-y-6">
                {Object.entries(groupedHistory)
                  .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                  .map(([date, tracks]) => (
                    <div key={date} className="space-y-3">
                      <h3 className="text-lg font-semibold tracking-tight">{date}</h3>
                      <div className="space-y-1">
                        {tracks.map((track, index) => (
                          <div
                            key={`${track.id}-${index}`}
                            className={`group flex items-center p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors ${
                              isCurrentlyPlaying(track) ? 'bg-accent/50 border-l-4 border-primary' : ''
                            }`}
                            onClick={() => handlePlayClick(track)}
                          >
                            {/* Play Indicator */}
                            <div className="w-8 text-center text-sm text-muted-foreground mr-3">
                              {isCurrentlyPlaying(track) ? (
                                <div className="w-4 h-4 mx-auto">
                                  <div className="w-full h-full bg-primary rounded-full animate-pulse" />
                                </div>
                              ) : (
                                <Play className="w-4 h-4 mx-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>

                            {/* Album Art */}
                            <div className="w-12 h-12 mr-4 flex-shrink-0">
                              <Image
                                src={track.coverArt || '/default-user.jpg'}
                                alt={track.album}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover rounded-md"
                              />
                            </div>

                            {/* Song Info */}
                            <div className="flex-1 min-w-0 mr-4">
                              <div className="flex items-center gap-2 mb-1">
                                <p className={`font-semibold truncate ${
                                  isCurrentlyPlaying(track) ? 'text-primary' : ''
                                }`}>
                                  {track.name}
                                </p>
                              </div>
                              <div className="flex items-center text-sm text-muted-foreground space-x-4">
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  <Link 
                                    href={`/artist/${track.artistId}`} 
                                    className="truncate hover:text-primary hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {track.artist}
                                  </Link>
                                </div>
                                {track.album && (
                                  <div className="flex items-center gap-1">
                                    <Disc className="w-3 h-3" />
                                    <Link 
                                      href={`/album/${track.albumId}`} 
                                      className="truncate hover:text-primary hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {track.album}
                                    </Link>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Duration */}
                            <div className="flex items-center text-sm text-muted-foreground mr-4">
                              {formatDuration(track.duration)}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToQueue(track);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
