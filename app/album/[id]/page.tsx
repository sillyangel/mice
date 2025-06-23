'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Album, Song } from '@/lib/navidrome';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { Play, Heart, User, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusIcon } from "@radix-ui/react-icons";
import { useAudioPlayer } from '@/app/components/AudioPlayerContext'
import Loading from "@/app/components/loading";
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getNavidromeAPI } from '@/lib/navidrome';

export default function AlbumPage() {
  const { id } = useParams();
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracklist, setTracklist] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStarred, setIsStarred] = useState(false);
  const { getAlbum, starItem, unstarItem } = useNavidrome();
  const { playTrack, addAlbumToQueue, playAlbum, playAlbumFromTrack, addToQueue, currentTrack } = useAudioPlayer();
  const api = getNavidromeAPI();

  useEffect(() => {
    const fetchAlbum = async () => {
      setLoading(true);
      console.log(`Fetching album with id: ${id}`);
      
      try {
        const albumData = await getAlbum(id as string);
        setAlbum(albumData.album);
        setTracklist(albumData.songs);
        setIsStarred(!!albumData.album.starred);
        console.log(`Album found: ${albumData.album.name}`);
      } catch (error) {
        console.error('Failed to fetch album:', error);
      }
      
      setLoading(false);
    };

    if (id) {
      fetchAlbum();
    }
  }, [id, getAlbum]);

  const handleStar = async () => {
    if (!album) return;
    
    try {
      if (isStarred) {
        await unstarItem(album.id, 'album');
        setIsStarred(false);
      } else {
        await starItem(album.id, 'album');
        setIsStarred(true);
      }
    } catch (error) {
      console.error('Failed to star/unstar album:', error);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!album) {
    return <p>Album not found</p>;
  }

  const handlePlayClick = async (song: Song): Promise<void> => {
    if (!album) return;
    
    try {
      await playAlbumFromTrack(album.id, song.id);
    } catch (error) {
      console.error('Failed to play album from track:', error);
    }
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
      artistId: song.artistId
    };

    addToQueue(track);
  };

  const isCurrentlyPlaying = (song: Song): boolean => {
    return currentTrack?.id === song.id;
  };

  const formatDuration = (duration: number): string => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  // Get cover art URL with proper fallback
  const coverArtUrl = album.coverArt && api
    ? api.getCoverArtUrl(album.coverArt, 300)
    : '/default-user.jpg';

  return (
    <>
    <div className="h-full px-4 py-6 lg:px-8">
      <div className="space-y-4">
        <div className="flex items-start gap-6">
          <Image 
            src={coverArtUrl} 
            alt={album.name} 
            width={300} 
            height={300}
            className="rounded-md"
          />
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <p className="text-3xl font-semibold tracking-tight">{album.name}</p>
              <Button onClick={handleStar} variant="ghost">
                <Heart className={isStarred ? 'text-primary' : 'text-gray-500'} fill={isStarred ? 'var(--primary)' : ""}/>
              </Button>
            </div>
            <Link href={`/artist/${album.artistId}`}>
              <p className="text-xl text-primary mt-0 mb-4 underline">{album.artist}</p>
            </Link>
            <Button className="px-5" onClick={() => playAlbum(album.id)}>
              <Play />
              Play Album
            </Button>
            <div className="text-sm text-muted-foreground">
              <p>{album.songCount} songs • {album.year} • {album.genre}</p>
              <p>Duration: {formatDuration(album.duration)}</p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Separator />
          
          <ScrollArea className="h-[calc(100vh-500px)]">
            {tracklist.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No tracks available.</p>
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
                          <span className="group-hover:hidden">{song.track || index + 1}</span>
                          <Play className="w-4 h-4 mx-auto hidden group-hover:block" />
                        </>
                      )}
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
                      <div className="flex items-center text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span className="truncate">{song.artist}</span>
                        </div>
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
    <br/>
    </>
  );
}