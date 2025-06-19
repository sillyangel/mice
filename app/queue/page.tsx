'use client';

import React from 'react';
import Image from 'next/image';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';

const QueuePage: React.FC = () => {
  const { queue, currentTrack, removeTrackFromQueue, clearQueue, skipToTrackInQueue } = useAudioPlayer();

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Queue</h1>
          <p className="text-sm text-muted-foreground">Click on a track to skip to it</p>
        </div>
        <button 
          onClick={clearQueue} 
          className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
          disabled={queue.length === 0}
        >
          Clear queue
        </button>
      </div>

      {/* Currently Playing */}
      {currentTrack && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Now Playing</h2>
          <div className="p-4 bg-accent/50 rounded-lg border-l-4 border-primary">
            <div className="flex items-center">
              <Image
                src={currentTrack.coverArt || '/default-user.jpg'}
                alt={currentTrack.name}
                width={60}
                height={60}
                className="rounded-md mr-4"
              />
              <div className="flex-1">
                <p className="font-semibold text-lg">{currentTrack.name}</p>
                <p className="text-sm text-muted-foreground">{currentTrack.artist}</p>
                <p className="text-xs text-muted-foreground">{currentTrack.album}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                {Math.floor(currentTrack.duration / 60)}:{(currentTrack.duration % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Queue */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Up Next</h2>
        {queue.length === 0 ? (
          <p className="text-muted-foreground">No tracks in the queue</p>
        ) : (
          <div className="space-y-2">
            {queue.map((track, index) => (
              <div 
                key={`${track.id}-${index}`} 
                className="flex items-center p-3 rounded-lg hover:bg-accent/50 cursor-pointer group"
                onClick={() => skipToTrackInQueue(index)}
              >
                <div className="w-8 text-center text-sm text-muted-foreground mr-3">
                  {index + 1}
                </div>
                <Image
                  src={track.coverArt || '/default-user.jpg'}
                  alt={track.name}
                  width={50}
                  height={50}
                  className="rounded-md mr-4"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{track.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-muted-foreground">
                    {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTrackFromQueue(index);
                    }}
                    className="opacity-0 group-hover:opacity-100 px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-all"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QueuePage;