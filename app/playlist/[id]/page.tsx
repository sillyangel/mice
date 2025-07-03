'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Playlist, Song } from '@/lib/navidrome';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { getNavidromeAPI } from '@/lib/navidrome';
import { Play, Heart, Plus, User, Disc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Loading from "@/app/components/loading";
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function PlaylistPage() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracklist, setTracklist] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const { getPlaylist } = useNavidrome();
  const { playTrack, addToQueue, currentTrack } = useAudioPlayer();
  const api = getNavidromeAPI();

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
    if (!api) {
      console.error('Navidrome API not available');
      return;
    }
    
    const track = {
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
    playTrack(track);
  };
  const handleAddToQueue = (song: Song) => {
    if (!api) {
      console.error('Navidrome API not available');
      return;
    }
    
    const track = {
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
    addToQueue(track);
  };
  const handlePlayPlaylist = () => {
    if (tracklist.length === 0 || !api) {
      if (!api) console.error('Navidrome API not available');
      return;
    }
    
    // Convert all songs to tracks
    const tracks = tracklist.map(song => ({
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
    }));

    // Play the first track and add the rest to queue
    if (tracks.length > 0) {
      playTrack(tracks[0], true); // Enable autoplay
      if (tracks.length > 1) {
        // Add remaining tracks to queue
        tracks.slice(1).forEach(track => addToQueue(track));
      }
    }
  };

  const isCurrentlyPlaying = (song: Song): boolean => {
    return currentTrack?.id === song.id;
  };

  const formatDuration = (duration: number): string => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <Loading />;
  }

  if (!playlist) {
    return (
      <div className="h-full px-4 py-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Playlist not found</h2>
          <p className="text-muted-foreground">The playlist you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }
  // Get playlist cover art URL with fallback
  const playlistCoverUrl = playlist.coverArt && api
    ? api.getCoverArtUrl(playlist.coverArt, 300)
    : '/default-user.jpg';

  return (
    <div className="h-full px-4 py-6 lg:px-8">
      <div className="space-y-4">
        <div className="flex items-start gap-6">
          <div className="w-[300px] h-[300px] bg-muted rounded-md overflow-hidden">
            <Image
              src={playlistCoverUrl}
              alt={playlist.name}
              width={300}
              height={300}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <p className="text-3xl font-semibold tracking-tight">{playlist.name}</p>
            </div>
            {playlist.comment && (
              <p className="text-xl text-muted-foreground mt-0 mb-4">{playlist.comment}</p>
            )}
            <Button className="px-5" onClick={() => handlePlayPlaylist()}>
              <Play />
              Play Playlist
            </Button>
            <div className="text-sm text-muted-foreground">
              <p>{playlist.songCount} songs • Duration: {formatDuration(playlist.duration || 0)}</p>
              {playlist.public !== undefined && (
                <p>{playlist.public ? 'Public' : 'Private'} playlist</p>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Separator />
          <ScrollArea className="h-[calc(100vh-500px)]">
            {tracklist.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">This playlist is empty.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {tracklist.map((song, index) => (
                  <div
                    key={song.id}
                    className={`group flex items-center p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors ${
                      isCurrentlyPlaying(song) ? 'bg-accent/50 border-l-4 border-primary' : ''
                    }`}
                    onClick={() => handlePlayClick(song)}
                  >
                    {/* Track Number / Play Indicator */}
                    <div className="w-8 text-center text-sm text-muted-foreground mr-3">
                      {isCurrentlyPlaying(song) ? (
                        <div className="w-4 h-4 mx-auto">
                          <div className="w-full h-full bg-primary rounded-full animate-pulse" />
                        </div>
                      ) : (
                        <>
                          <span className="group-hover:hidden">{index + 1}</span>
                          <Play className="w-4 h-4 mx-auto hidden group-hover:block" />
                        </>
                      )}
                    </div>

                    {/* Album Art */}
                    <div className="w-12 h-12 mr-4 shrink-0">                      <Image
                        src={song.coverArt && api ? api.getCoverArtUrl(song.coverArt, 100) : '/default-user.jpg'}
                        alt={song.album}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover rounded-md"
                      />
                    </div>

                    {/* Song Info */}
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-semibold truncate ${
                          isCurrentlyPlaying(song) ? 'text-primary' : ''
                        }`}>
                          {song.title}
                        </p>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground space-x-4">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <Link 
                            href={`/artist/${song.artistId}`} 
                            className="truncate hover:text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {song.artist}
                          </Link>
                        </div>
                        {song.album && (
                          <div className="flex items-center gap-1">
                            <Disc className="w-3 h-3" />
                            <Link 
                              href={`/album/${song.albumId}`} 
                              className="truncate hover:text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {song.album}
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center text-sm text-muted-foreground mr-4">
                      {formatDuration(song.duration)}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToQueue(song);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="w-4 h-4" />
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
}
