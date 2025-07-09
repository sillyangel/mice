'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Album, Song } from '@/lib/navidrome';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { Play, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext'
import Loading from "@/app/components/loading";
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getNavidromeAPI } from '@/lib/navidrome';
import { useFavoriteAlbums } from '@/hooks/use-favorite-albums';
import { Star } from 'lucide-react';

export default function AlbumPage() {
  const { id } = useParams();
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracklist, setTracklist] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStarred, setIsStarred] = useState(false);
  const [starredSongs, setStarredSongs] = useState<Set<string>>(new Set());
  const { getAlbum, starItem, unstarItem } = useNavidrome();
  const { playTrack, addAlbumToQueue, playAlbum, playAlbumFromTrack, currentTrack } = useAudioPlayer();
  const { isFavoriteAlbum, toggleFavoriteAlbum } = useFavoriteAlbums();
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
        
        // Initialize starred songs state
        const starredSongIds = new Set(
          albumData.songs.filter(song => song.starred).map(song => song.id)
        );
        setStarredSongs(starredSongIds);
        
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

  const handleSongStar = async (song: Song) => {
    try {
      const isCurrentlyStarred = starredSongs.has(song.id);
      
      if (isCurrentlyStarred) {
        await unstarItem(song.id, 'song');
        setStarredSongs(prev => {
          const newSet = new Set(prev);
          newSet.delete(song.id);
          return newSet;
        });
      } else {
        await starItem(song.id, 'song');
        setStarredSongs(prev => new Set(prev).add(song.id));
      }
    } catch (error) {
      console.error('Failed to star/unstar song:', error);
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
              <Button onClick={handleStar} variant="ghost" title={isStarred ? "Unstar album" : "Star album"}>
                <Heart className={isStarred ? 'text-primary' : 'text-gray-500'} fill={isStarred ? 'var(--primary)' : ""}/>
              </Button>
              <Button 
                onClick={() => toggleFavoriteAlbum(album.id)} 
                variant="ghost" 
                title={isFavoriteAlbum(album.id) ? "Remove from sidebar favorites" : "Add to sidebar favorites"}
              >
                <Star className={isFavoriteAlbum(album.id) ? 'text-yellow-500' : 'text-gray-500'} fill={isFavoriteAlbum(album.id) ? 'currentColor' : ""}/>
              </Button>
            </div>
            <Link href={`/artist/${album.artistId}`}>
              <p className="text-xl text-primary mt-0 mb-4 underline">{album.artist}</p>
            </Link>
            <Button className="px-5" onClick={() => playAlbum(album.id)}>
              Play
            </Button>
            <div className="text-sm text-muted-foreground">
              <p>{album.genre} • {album.year}</p>
              <p>{album.songCount} songs, {formatDuration(album.duration)}</p>
            
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
                    className={`group flex items-center p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors`}
                    onClick={() => handlePlayClick(song)}
                  >
                    {/* Track Number / Play Indicator */}
                    <div className="w-8 text-center text-sm text-muted-foreground mr-3">
                        <>
                          <span className="group-hover:hidden">{song.track || index + 1}</span>
                          <Play className="w-4 h-4 mx-auto hidden group-hover:block" />
                        </>
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
                          <span className="truncate">{song.artist}</span>
                        </div>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center text-sm text-muted-foreground mr-4">
                      {formatDuration(song.duration)}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSongStar(song);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Heart 
                          className={`w-4 h-4 ${starredSongs.has(song.id) ? 'text-primary' : 'text-gray-500'}`}
                          fill={starredSongs.has(song.id) ? 'var(--primary)' : 'none'}
                        />
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