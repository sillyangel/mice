'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, X, User, Disc, Trash2, SkipForward } from 'lucide-react';

const QueuePage: React.FC = () => {
  const { queue, currentTrack, removeTrackFromQueue, clearQueue, skipToTrackInQueue } = useAudioPlayer();

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full px-4 py-6 lg:px-8 pb-24">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Queue</h1>
            <p className="text-sm text-muted-foreground">
              {currentTrack ? `Now playing • ${queue.length} songs up next` : `${queue.length} songs in queue`}
            </p>
          </div>
          <Button 
            onClick={clearQueue} 
            variant="destructive"
            disabled={queue.length === 0 && !currentTrack}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear Queue
          </Button>
        </div>

        <Separator />

        {/* Currently Playing */}
        {currentTrack && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Now Playing</h2>
            <div className="p-4 bg-accent/30 rounded-lg">
              <div className="flex items-center">
                {/* Album Art */}
                <div className="w-16 h-16 mr-4 flex-shrink-0">
                  <Image
                    src={currentTrack.coverArt || '/default-user.jpg'}
                    alt={currentTrack.album}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover rounded-md"
                  />
                </div>

                {/* Song Info */}
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-lg text-primary truncate">
                      {currentTrack.name}
                    </p>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground space-x-4">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <Link href={`/artist/${currentTrack.artistId}`} className="truncate hover:text-primary hover:underline">
                        {currentTrack.artist}
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-center text-sm text-muted-foreground">
                  {formatDuration(currentTrack.duration)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Queue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Up Next</h2>
            {queue.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {queue.length} song{queue.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <ScrollArea className="h-[calc(100vh-400px)]">
            {queue.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <SkipForward className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-lg font-medium mb-2">No songs in queue</p>
                <p className="text-muted-foreground text-sm">
                  Add songs to your queue to see them here
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {queue.map((track, index) => (
                  <div
                    key={`${track.id}-${index}`}
                    className="group flex items-center p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => skipToTrackInQueue(index)}
                  >
                    {/* Album Art with Play Indicator */}
                    <div className="w-12 h-12 mr-4 flex-shrink-0 relative">
                      <Image
                        src={track.coverArt || '/default-user.jpg'}
                        alt={track.album}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover rounded-md"
                      />
                      <div className="absolute inset-0 bg-black/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    {/* Song Info */}
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold truncate">{track.name}</p>
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
                          removeTrackFromQueue(index);
                        }}
                        className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default QueuePage;