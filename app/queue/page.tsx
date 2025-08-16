'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAudioPlayer, Track } from '@/app/components/AudioPlayerContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, X, Disc, Trash2, SkipForward, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';

interface SortableQueueItemProps {
  track: Track;
  index: number;
  onPlay: () => void;
  onRemove: () => void;
  formatDuration: (seconds: number) => string;
}

function SortableQueueItem({ track, index, onPlay, onRemove, formatDuration }: SortableQueueItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${track.id}-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center p-3 rounded-lg hover:bg-accent/50 transition-colors ${
        isDragging ? 'bg-accent' : ''
      }`}
    >
      {/* Drag Handle */}
      <div
        className="mr-3 opacity-60 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 -m-1 hover:bg-accent rounded"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Clickable content area for play */}
      <div 
        className="flex items-center flex-1 cursor-pointer"
        onClick={onPlay}
      >
        {/* Album Art with Play Indicator */}
        <div className="w-12 h-12 mr-4 shrink-0 relative">
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
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

const QueuePage: React.FC = () => {
  const { queue, currentTrack, removeTrackFromQueue, clearQueue, skipToTrackInQueue, reorderQueue } = useAudioPlayer();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before starting drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = queue.findIndex((track, index) => `${track.id}-${index}` === active.id);
      const newIndex = queue.findIndex((track, index) => `${track.id}-${index}` === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderQueue(oldIndex, newIndex);
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 pb-24 w-full">
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
                <div className="w-16 h-16 mr-4 shrink-0">
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={queue.map((track, index) => `${track.id}-${index}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {queue.map((track, index) => (
                      <SortableQueueItem
                        key={`${track.id}-${index}`}
                        track={track}
                        index={index}
                        onPlay={() => skipToTrackInQueue(index)}
                        onRemove={() => removeTrackFromQueue(index)}
                        formatDuration={formatDuration}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default QueuePage;