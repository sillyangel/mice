'use client';
import Image from 'next/image';
import { Song } from '@/lib/navidrome';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { Button } from '@/components/ui/button';
import { Play, Heart } from 'lucide-react';
import { useState } from 'react';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { getNavidromeAPI } from '@/lib/navidrome';

interface PopularSongsProps {
  songs: Song[];
  artistName: string;
}

export function PopularSongs({ songs, artistName }: PopularSongsProps) {
  const { playTrack } = useAudioPlayer();
  const { starItem, unstarItem } = useNavidrome();
  const [songStates, setSongStates] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    songs.forEach(song => {
      initial[song.id] = !!song.starred;
    });
    return initial;
  });
  const api = getNavidromeAPI();

  const songToTrack = (song: Song) => {
    if (!api) {
      throw new Error('Navidrome API not configured');
    }
    return {
      id: song.id,
      name: song.title,
      url: api.getStreamUrl(song.id),
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      coverArt: song.coverArt ? api.getCoverArtUrl(song.coverArt, 300) : undefined,
      albumId: song.albumId,
      artistId: song.artistId,
      starred: !!song.starred
    };
  };

  const handlePlaySong = async (song: Song) => {
    try {
      const track = songToTrack(song);
      playTrack(track, true);
    } catch (error) {
      console.error('Failed to play song:', error);
    }
  };

  const handleToggleStar = async (song: Song) => {
    try {
      const isStarred = songStates[song.id];
      if (isStarred) {
        await unstarItem(song.id, 'song');
        setSongStates(prev => ({ ...prev, [song.id]: false }));
      } else {
        await starItem(song.id, 'song');
        setSongStates(prev => ({ ...prev, [song.id]: true }));
      }
    } catch (error) {
      console.error('Failed to star/unstar song:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (songs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">Popular Songs</h2>
      <div className="space-y-2">
        {songs.map((song, index) => (
          <div 
            key={song.id}
            className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 group"
          >
            {/* Rank */}
            <div className="w-8 text-sm text-muted-foreground text-center">
              {index + 1}
            </div>

            {/* Album Art */}
            <div className="relative w-12 h-12 bg-muted rounded-md overflow-hidden flex-shrink-0">
              {song.coverArt && api && (
                <Image
                  src={api.getCoverArtUrl(song.coverArt, 96)}
                  alt={song.album}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  onClick={() => handlePlaySong(song)}
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Song Info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{song.title}</div>
              <div className="text-xs text-muted-foreground truncate">{song.album}</div>
            </div>

            {/* Play Count */}
            {song.playCount && song.playCount > 0 && (
              <div className="text-xs text-muted-foreground">
                {song.playCount.toLocaleString()} plays
              </div>
            )}

            {/* Duration */}
            <div className="text-xs text-muted-foreground w-12 text-right">
              {formatDuration(song.duration)}
            </div>

            {/* Star Button */}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleToggleStar(song)}
            >
              <Heart 
                className={`h-4 w-4 ${songStates[song.id] ? 'text-red-500 fill-red-500' : 'text-muted-foreground'}`}
              />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
