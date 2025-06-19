'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Playlist, Song } from '@/lib/navidrome';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { Play, Heart, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Loading from "@/app/components/loading";
import { Separator } from '@/components/ui/separator';

export default function PlaylistPage() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracklist, setTracklist] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const { getPlaylist } = useNavidrome();
  const { playTrack, addToQueue } = useAudioPlayer();

  useEffect(() => {
    const fetchPlaylist = async () => {
      setLoading(true);
      console.log(`Fetching playlist with id: ${id}`);
      
      try {
        const playlistData = await getPlaylist(id as string);
        setPlaylist(playlistData.playlist);
        setTracklist(playlistData.songs);
        console.log(`Playlist found: ${playlistData.playlist.name}`);
      } catch (error) {
        console.error('Failed to fetch playlist:', error);
      }
      
      setLoading(false);
    };

    if (id) {
      fetchPlaylist();
    }
  }, [id, getPlaylist]);

  const handlePlayClick = (song: Song) => {
    const track = {
      id: song.id,
      name: song.title,
      url: '', // Will be set by the context
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      coverArt: song.coverArt,
      albumId: song.albumId,
      artistId: song.artistId
    };
    playTrack(track);
  };

  const handleAddToQueue = (song: Song) => {
    const track = {
      id: song.id,
      name: song.title,
      url: '', // Will be set by the context
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      coverArt: song.coverArt,
      albumId: song.albumId,
      artistId: song.artistId
    };
    addToQueue(track);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
  };

  if (loading) {
    return <Loading />;
  }

  if (!playlist) {
    return (
      <div className="h-full px-4 py-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Playlist not found</h2>
          <p className="text-muted-foreground">The playlist you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full px-4 py-6 lg:px-8">
      <div className="space-y-4">
        <div className="flex items-start gap-6">
          <div className="w-[300px] h-[300px] bg-muted rounded-md flex items-center justify-center">
            <Play className="h-16 w-16 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <p className="text-3xl font-semibold tracking-tight">{playlist.name}</p>
            </div>
            {playlist.comment && (
              <p className="text-lg text-muted-foreground">{playlist.comment}</p>
            )}
            <div className="text-sm text-muted-foreground">
              <p>{playlist.songCount} songs • {formatDuration(playlist.duration || 0)}</p>
              {playlist.public !== undefined && (
                <p>{playlist.public ? 'Public' : 'Private'} playlist</p>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Separator />
          {tracklist.length > 0 ? (
            tracklist.map((song, index) => (
              <div key={song.id} className="py-2 flex justify-between items-center hover:bg-hover rounded-lg cursor-pointer" onClick={() => handlePlayClick(song)}>
                <div className="flex items-center">
                  <div className="mr-2 w-6 text-right">{index + 1}</div>
                  <div>
                    <p className="font-semibold text-lg flex items-center">
                      {song.title}
                    </p>
                    <p className="text-sm font-normal flex items-center">
                      <span className="text-gray-400">{song.artist}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm mr-4">{formatDuration(song.duration)}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToQueue(song);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">This playlist is empty</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
