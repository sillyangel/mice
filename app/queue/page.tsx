'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAudioPlayer, useAudioQueue, Track } from '@/app/components/AudioPlayerContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { EqualizerBars } from '@/app/components/EqualizerBars';
import {
  Play,
  X,
  Trash2,
  SkipForward,
  GripVertical,
  Shuffle,
  ListStart,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const ROW_HEIGHT = 68;

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const remainingSeconds = safe % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatTotalDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
}

interface SortableQueueItemProps {
  queueId: string;
  index: number;
  track: Track;
  isFirst: boolean;
  isLast: boolean;
  onPlay: (queueId: string) => void;
  onPlayNext: (queueId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (queueId: string) => void;
}

const SortableQueueItem = React.memo(function SortableQueueItem({
  queueId,
  index,
  track,
  isFirst,
  isLast,
  onPlay,
  onPlayNext,
  onMoveUp,
  onMoveDown,
  onRemove,
}: SortableQueueItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: queueId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    height: `${ROW_HEIGHT}px`,
  };

  const artistHref = track.artistId
    ? `/artist/${track.artistId}`
    : `/artist/${encodeURIComponent(track.artist)}`;

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="my-1 rounded-xl border-2 border-dashed border-primary/50 bg-primary/10 flex items-center justify-center text-xs text-primary font-semibold tracking-wide uppercase"
      >
        <span>Drop here</span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative flex items-center px-3 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/[0.05] transition-all duration-200 select-none"
    >
      {/* Prominent Tactile Drag Handle */}
      <button
        type="button"
        className="w-7 h-10 flex items-center justify-center text-muted-foreground/50 group-hover:text-white hover:bg-white/10 rounded-lg cursor-grab active:cursor-grabbing transition-colors touch-none -ml-1 mr-1.5 shrink-0"
        title="Drag to reorder"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Track Position Number */}
      <div className="w-6 text-center text-xs font-mono text-muted-foreground/70 shrink-0 mr-2.5">
        <span>{index + 1}</span>
      </div>

      {/* Album Artwork */}
      <div
        className="w-11 h-11 mr-3.5 shrink-0 relative rounded-lg overflow-hidden bg-muted/40 shadow-sm cursor-pointer"
        onClick={() => onPlay(queueId)}
      >
        <img
          src={track.coverArt || '/default-user.jpg'}
          alt={track.album || track.name}
          width={44}
          height={44}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="w-4 h-4 text-white fill-white" />
        </div>
      </div>

      {/* Song & Artist Info */}
      <div
        className="flex-1 min-w-0 mr-3 cursor-pointer"
        onClick={() => onPlay(queueId)}
      >
        <div className="flex items-center gap-2">
          {track.albumId ? (
            <Link
              href={`/album/${track.albumId}`}
              prefetch={false}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-sm truncate text-foreground group-hover:text-white hover:underline transition-colors"
              title={`Album: ${track.album || track.name}`}
            >
              {track.name}
            </Link>
          ) : (
            <p className="font-semibold text-sm truncate text-foreground group-hover:text-white transition-colors">
              {track.name}
            </p>
          )}
        </div>
        <div className="flex items-center text-xs text-muted-foreground mt-0.5 min-w-0">
          <Link
            href={artistHref}
            prefetch={false}
            className="truncate hover:text-primary hover:underline transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {track.artist}
          </Link>
          {track.album && (
            <>
              <span className="mx-1.5 opacity-40">•</span>
              <span className="truncate opacity-70">{track.album}</span>
            </>
          )}
        </div>
      </div>

      {/* Duration */}
      <div className="flex items-center text-xs text-muted-foreground tabular-nums mr-2 shrink-0">
        {formatDuration(track.duration)}
      </div>

      {/* 1-Click Quick Move & Management Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {/* Move 1 Slot Up */}
        <Button
          variant="ghost"
          size="sm"
          title={isFirst ? undefined : "Move 1 Slot Up"}
          disabled={isFirst}
          onClick={(e) => {
            e.stopPropagation();
            if (!isFirst) onMoveUp(index);
          }}
          className={`h-8 w-8 p-0 ${
            isFirst
              ? 'opacity-20 cursor-not-allowed hover:bg-transparent text-muted-foreground'
              : 'text-muted-foreground hover:text-white hover:bg-white/10 cursor-pointer'
          }`}
        >
          <ChevronUp className="w-4 h-4" />
        </Button>

        {/* Move 1 Slot Down */}
        <Button
          variant="ghost"
          size="sm"
          title={isLast ? undefined : "Move 1 Slot Down"}
          disabled={isLast}
          onClick={(e) => {
            e.stopPropagation();
            if (!isLast) onMoveDown(index);
          }}
          className={`h-8 w-8 p-0 ${
            isLast
              ? 'opacity-20 cursor-not-allowed hover:bg-transparent text-muted-foreground'
              : 'text-muted-foreground hover:text-white hover:bg-white/10 cursor-pointer'
          }`}
        >
          <ChevronDown className="w-4 h-4" />
        </Button>

        {/* Move to Top / Play Next */}
        <Button
          variant="ghost"
          size="sm"
          title={isFirst ? undefined : "Play Next (Move to Top)"}
          disabled={isFirst}
          onClick={(e) => {
            e.stopPropagation();
            if (!isFirst) onPlayNext(queueId);
          }}
          className={`h-8 w-8 p-0 ${
            isFirst
              ? 'opacity-20 cursor-not-allowed hover:bg-transparent text-muted-foreground'
              : 'text-muted-foreground hover:text-white hover:bg-white/10 cursor-pointer'
          }`}
        >
          <ListStart className="w-4 h-4" />
        </Button>

        {/* Remove */}
        <Button
          variant="ghost"
          size="sm"
          title="Remove from Queue"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(queueId);
          }}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
});

const QueuePage: React.FC = () => {
  const { queue } = useAudioQueue();
  const {
    currentTrack,
    isPlaying,
    clearQueue,
    removeTrackByQueueId,
    moveTrackToTopByQueueId,
    skipToTrackByQueueId,
    reorderQueue,
    reorderQueueByIds,
    shuffle,
    toggleShuffle,
  } = useAudioPlayer();

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (over && active.id !== over.id) {
        reorderQueueByIds(String(active.id), String(over.id));
      }
    },
    [reorderQueueByIds]
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index > 0) {
        reorderQueue(index, index - 1);
      }
    },
    [reorderQueue]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index < queue.length - 1) {
        reorderQueue(index, index + 1);
      }
    },
    [queue.length, reorderQueue]
  );

  const totalQueueDuration = useMemo(
    () => queue.reduce((acc, t) => acc + (t.duration || 0), 0),
    [queue]
  );

  const sortableIds = useMemo(
    () => queue.map((t, idx) => t.queueId || `${t.id}-${idx}`),
    [queue]
  );

  // Active track being dragged for DragOverlay
  const activeTrack = useMemo(
    () => (activeDragId ? queue.find((t, i) => (t.queueId || `${t.id}-${i}`) === activeDragId) : null),
    [queue, activeDragId]
  );

  return (
    <div className="p-6 pb-36 w-full max-w-4xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Queue</h1>
            <p className="text-sm text-muted-foreground">
              {currentTrack
                ? `Now playing • ${queue.length} song${queue.length !== 1 ? 's' : ''} up next`
                : `${queue.length} song${queue.length !== 1 ? 's' : ''} in queue`}
              {queue.length > 0 ? ` • ${formatTotalDuration(totalQueueDuration)}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {queue.length > 1 && (
              <Button
                onClick={toggleShuffle}
                variant={shuffle ? 'default' : 'outline'}
                className="flex items-center gap-2 rounded-xl transition-all"
                title={shuffle ? 'Shuffle On — click to restore original order' : 'Shuffle Up Next'}
              >
                <Shuffle className="w-4 h-4" />
                {shuffle ? 'Shuffled' : 'Shuffle'}
              </Button>
            )}
            <Button
              onClick={clearQueue}
              variant="outline"
              disabled={queue.length === 0}
              className="flex items-center gap-2 rounded-xl text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Clear Queue
            </Button>
          </div>
        </div>

        <Separator className="opacity-40" />

        {/* Hero Currently Playing Card */}
        {currentTrack && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Now Playing
            </h2>
            <div className="relative overflow-hidden p-4 sm:p-5 bg-gradient-to-r from-card/90 via-card/60 to-card/40 border border-white/10 rounded-2xl shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-4 sm:gap-5">
                {/* Large Cover Art with Sound Equalizer indicator */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden shadow-lg bg-muted/40 ring-1 ring-white/10">
                  <img
                    src={currentTrack.coverArt || '/default-user.jpg'}
                    alt={currentTrack.album || currentTrack.name}
                    width={80}
                    height={80}
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  {isPlaying && (
                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center text-primary">
                      <EqualizerBars isAnimating={isPlaying} className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {/* Track Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg sm:text-xl text-white truncate drop-shadow-sm">
                    {currentTrack.name}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5 min-w-0">
                    <Link
                      href={
                        currentTrack.artistId
                          ? `/artist/${currentTrack.artistId}`
                          : `/artist/${encodeURIComponent(currentTrack.artist)}`
                      }
                      prefetch={false}
                      className="hover:text-primary hover:underline truncate transition-colors"
                    >
                      {currentTrack.artist}
                    </Link>
                    {currentTrack.album && (
                      <>
                        <span className="opacity-40">•</span>
                        <Link
                          href={currentTrack.albumId ? `/album/${currentTrack.albumId}` : '#'}
                          prefetch={false}
                          className="hover:underline truncate opacity-80"
                        >
                          {currentTrack.album}
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                {/* Track Duration */}
                <div className="text-sm font-semibold text-muted-foreground tabular-nums shrink-0 px-2">
                  {formatDuration(currentTrack.duration)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Up Next List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Up Next
            </h2>
            {queue.length > 0 && (
              <span className="text-xs text-muted-foreground font-medium">
                Drag rows or use arrows to reorder
              </span>
            )}
          </div>

          {queue.length === 0 ? (
            <div className="text-center py-14 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
                <SkipForward className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-white text-lg font-semibold mb-1">Queue is empty</p>
              <p className="text-muted-foreground text-sm">
                Add songs from albums, artists, or playlists to play next
              </p>
            </div>
          ) : (
            <div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={sortableIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {queue.map((track, index) => {
                      const qid = track.queueId || `${track.id}-${index}`;
                      return (
                        <SortableQueueItem
                          key={qid}
                          queueId={qid}
                          index={index}
                          track={track}
                          isFirst={index === 0}
                          isLast={index === queue.length - 1}
                          onPlay={skipToTrackByQueueId}
                          onPlayNext={moveTrackToTopByQueueId}
                          onMoveUp={handleMoveUp}
                          onMoveDown={handleMoveDown}
                          onRemove={removeTrackByQueueId}
                        />
                      );
                    })}
                  </div>
                </SortableContext>

                {/* Tactile Elevated Drag Overlay following cursor */}
                <DragOverlay>
                  {activeTrack ? (
                    <div
                      style={{ height: `${ROW_HEIGHT}px` }}
                      className="flex items-center px-4 rounded-xl bg-card/95 border border-primary/50 shadow-2xl backdrop-blur-xl ring-2 ring-primary/30 select-none scale-[1.02] cursor-grabbing"
                    >
                      <div className="w-7 h-10 flex items-center justify-center mr-2 text-primary">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="w-11 h-11 mr-3.5 shrink-0 rounded-lg overflow-hidden bg-muted/40 shadow">
                        <img
                          src={activeTrack.coverArt || '/default-user.jpg'}
                          alt={activeTrack.name}
                          width={44}
                          height={44}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="font-semibold text-sm truncate text-white">{activeTrack.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{activeTrack.artist}</p>
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {formatDuration(activeTrack.duration)}
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueuePage;