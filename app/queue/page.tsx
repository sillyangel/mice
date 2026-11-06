'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAudioPlayer, useAudioQueue, Track } from '@/app/components/AudioPlayerContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Play, X, Trash2, SkipForward, GripVertical, Shuffle, ListStart } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const ROW_HEIGHT = 64;
const DEFAULT_OVERSCAN = 12;
const DRAG_OVERSCAN = 32;

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
  track: Track;
  isFirst: boolean;
  onPlay: (queueId: string) => void;
  onPlayNext: (queueId: string) => void;
  onRemove: (queueId: string) => void;
}

const SortableQueueItem = React.memo(function SortableQueueItem({
  queueId,
  track,
  isFirst,
  onPlay,
  onPlayNext,
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
    opacity: isDragging ? 0.55 : 1,
    height: `${ROW_HEIGHT}px`,
  };

  const artistHref = track.artistId
    ? `/artist/${track.artistId}`
    : `/artist/${encodeURIComponent(track.artist)}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center px-3 rounded-lg hover:bg-accent/50 transition-colors select-none ${
        isDragging ? 'bg-accent z-10 relative shadow-lg' : ''
      }`}
    >
      {/* Drag Handle */}
      <div
        className="mr-3 opacity-60 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 -m-1 hover:bg-accent rounded touch-none"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Clickable content area for play */}
      <div
        className="flex items-center flex-1 min-w-0 cursor-pointer"
        onClick={() => onPlay(queueId)}
      >
        {/* Album Art with Play Indicator */}
        <div className="w-11 h-11 mr-3.5 shrink-0 relative rounded-md overflow-hidden bg-muted/40">
          <img
            src={track.coverArt || '/default-user.jpg'}
            alt={track.album || track.name}
            width={44}
            height={44}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Play className="w-4 h-4 text-white fill-white" />
          </div>
        </div>

        {/* Song Info */}
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center gap-2">
            {track.albumId ? (
              <Link
                href={`/album/${track.albumId}`}
                prefetch={false}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-sm truncate hover:underline hover:text-white transition-colors"
                title={`Go to album: ${track.album || track.name}`}
              >
                {track.name}
              </Link>
            ) : (
              <p className="font-semibold text-sm truncate">{track.name}</p>
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
                <span className="mx-1.5 opacity-50">•</span>
                <span className="truncate opacity-75">{track.album}</span>
              </>
            )}
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center text-xs text-muted-foreground tabular-nums mr-3 shrink-0">
          {formatDuration(track.duration)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!isFirst && (
          <Button
            variant="ghost"
            size="sm"
            title="Play Next (Move to Top)"
            onClick={(e) => {
              e.stopPropagation();
              onPlayNext(queueId);
            }}
            className="h-8 w-8 p-0 hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            <ListStart className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          title="Remove from Queue"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(queueId);
          }}
          className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
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
    clearQueue,
    removeTrackByQueueId,
    moveTrackToTopByQueueId,
    skipToTrackByQueueId,
    reorderQueueByIds,
    shuffle,
    toggleShuffle,
  } = useAudioPlayer();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(560);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const updateHeight = () => {
      setViewportHeight(el.clientHeight || 560);
    };
    updateHeight();

    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const nextScrollTop = e.currentTarget.scrollTop;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setScrollTop(nextScrollTop);
      rafRef.current = null;
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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

  const totalQueueDuration = useMemo(
    () => queue.reduce((acc, t) => acc + (t.duration || 0), 0),
    [queue]
  );

  // Viewport virtualization math (uniform 64px rows)
  const overscan = activeDragId ? DRAG_OVERSCAN : DEFAULT_OVERSCAN;
  const totalCount = queue.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - overscan);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + overscan * 2;
  const endIndex = Math.min(totalCount, startIndex + visibleCount);

  const windowedSlice = useMemo(
    () => queue.slice(startIndex, endIndex),
    [queue, startIndex, endIndex]
  );

  const sortableIds = useMemo(
    () => windowedSlice.map((t, idx) => t.queueId || `${t.id}-${startIndex + idx}`),
    [windowedSlice, startIndex]
  );

  const topSpacerHeight = startIndex * ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (totalCount - endIndex) * ROW_HEIGHT);
  const firstQueueId = queue[0]?.queueId;

  return (
    <div className="p-6 pb-28 w-full">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-semibold tracking-tight">Queue</h1>
            <p className="text-sm text-muted-foreground">
              {currentTrack
                ? `Now playing • ${queue.length} song${queue.length !== 1 ? 's' : ''} up next`
                : `${queue.length} song${queue.length !== 1 ? 's' : ''} in queue`}
              {queue.length > 0 ? ` • ${formatTotalDuration(totalQueueDuration)}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {queue.length > 1 && (
              <Button
                onClick={toggleShuffle}
                variant={shuffle ? 'default' : 'outline'}
                className="flex items-center gap-2"
                title={shuffle ? 'Shuffle On — click to restore original order' : 'Shuffle Up Next'}
              >
                <Shuffle className="w-4 h-4" />
                {shuffle ? 'Shuffled' : 'Shuffle'}
              </Button>
            )}
            <Button
              onClick={clearQueue}
              variant="destructive"
              disabled={queue.length === 0}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear Queue
            </Button>
          </div>
        </div>

        <Separator />

        {/* Currently Playing */}
        {currentTrack && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Now Playing</h2>
            <div className="p-4 bg-accent/30 rounded-lg">
              <div className="flex items-center">
                <div className="w-16 h-16 mr-4 shrink-0 rounded-md overflow-hidden bg-muted/40">
                  <img
                    src={currentTrack.coverArt || '/default-user.jpg'}
                    alt={currentTrack.album || currentTrack.name}
                    width={64}
                    height={64}
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    {currentTrack.albumId ? (
                      <Link
                        href={`/album/${currentTrack.albumId}`}
                        prefetch={false}
                        className="font-semibold text-lg text-primary truncate hover:underline"
                      >
                        {currentTrack.name}
                      </Link>
                    ) : (
                      <p className="font-semibold text-lg text-primary truncate">
                        {currentTrack.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground min-w-0">
                    <Link
                      href={
                        currentTrack.artistId
                          ? `/artist/${currentTrack.artistId}`
                          : `/artist/${encodeURIComponent(currentTrack.artist)}`
                      }
                      prefetch={false}
                      className="truncate hover:text-primary hover:underline"
                    >
                      {currentTrack.artist}
                    </Link>
                    {currentTrack.album && (
                      <>
                        <span className="mx-2 opacity-50">•</span>
                        <span className="truncate opacity-80">{currentTrack.album}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center text-sm text-muted-foreground tabular-nums">
                  {formatDuration(currentTrack.duration)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Up Next Virtualized List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Up Next</h2>
            {queue.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {queue.length} song{queue.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

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
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="h-[calc(100vh-390px)] min-h-[280px] overflow-y-auto pr-1"
            >
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
                  {topSpacerHeight > 0 && (
                    <div style={{ height: `${topSpacerHeight}px` }} aria-hidden="true" />
                  )}
                  <div>
                    {windowedSlice.map((track, idx) => {
                      const qid = track.queueId || `${track.id}-${startIndex + idx}`;
                      return (
                        <SortableQueueItem
                          key={qid}
                          queueId={qid}
                          track={track}
                          isFirst={qid === firstQueueId}
                          onPlay={skipToTrackByQueueId}
                          onPlayNext={moveTrackToTopByQueueId}
                          onRemove={removeTrackByQueueId}
                        />
                      );
                    })}
                  </div>
                  {bottomSpacerHeight > 0 && (
                    <div style={{ height: `${bottomSpacerHeight}px` }} aria-hidden="true" />
                  )}
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueuePage;