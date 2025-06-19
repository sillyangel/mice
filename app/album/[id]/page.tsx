'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Album, Song } from '@/lib/navidrome';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { Play, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusIcon } from "@radix-ui/react-icons";
import { useAudioPlayer } from '@/app/components/AudioPlayerContext'
import Loading from "@/app/components/loading";
import { Separator } from '@/components/ui/separator';
import { getNavidromeAPI } from '@/lib/navidrome';

export default function AlbumPage() {
  const { id } = useParams();
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracklist, setTracklist] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStarred, setIsStarred] = useState(false);
  const { getAlbum, starItem, unstarItem } = useNavidrome();
  const { playTrack, addAlbumToQueue, playAlbum, playAlbumFromTrack } = useAudioPlayer();
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

  const formatDuration = (duration: number): string => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get cover art URL with proper fallback
  const coverArtUrl = album.coverArt 
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
        <div className="space-y-2">
          <Separator />
          {tracklist.map((song, index) => (
            <div key={song.id} className="py-2 flex justify-between items-center hover:bg-hover rounded-lg cursor-pointer" onClick={() => handlePlayClick(song)}>
              <div className="flex items-center">
                <div className="mr-2 w-6 text-right">{song.track || index + 1}</div>
                <div>
                  <p className="font-semibold text-lg flex items-center">
                    {song.title}
                  </p>
                  <p className="text-sm font-normal flex items-center">
                    <p className="text-gray-400">{song.artist}</p>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <p className="text-sm mr-4">{formatDuration(song.duration)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    <br/>
    </>
  );
}