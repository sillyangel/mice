'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Album, Artist } from '@/lib/navidrome';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { AlbumArtwork } from '@/app/components/album-artwork';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Heart, Play } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import Loading from '@/app/components/loading';
import { getNavidromeAPI } from '@/lib/navidrome';
import { useToast } from '@/hooks/use-toast';

export default function ArtistPage() {
  const { artist: artistId } = useParams();
  const [isStarred, setIsStarred] = useState(false);
  const [artistAlbums, setArtistAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [isPlayingArtist, setIsPlayingArtist] = useState(false);
  const { getArtist, starItem, unstarItem } = useNavidrome();
  const { addArtistToQueue, playAlbum, clearQueue } = useAudioPlayer();
  const { toast } = useToast();
  const api = getNavidromeAPI();

  useEffect(() => {
    const fetchArtistData = async () => {
      setLoading(true);
      try {
        if (artistId) {
          const artistData = await getArtist(artistId as string);
          setArtist(artistData.artist);
          setArtistAlbums(artistData.albums);
          setIsStarred(!!artistData.artist.starred);
        }
      } catch (error) {
        console.error('Failed to fetch artist data:', error);
      }
      setLoading(false);
    };

    fetchArtistData();
  }, [artistId, getArtist]);

  const handleStar = async () => {
    if (!artist) return;
    
    try {
      if (isStarred) {
        await unstarItem(artist.id, 'artist');
        setIsStarred(false);
      } else {
        await starItem(artist.id, 'artist');
        setIsStarred(true);
      }
    } catch (error) {
      console.error('Failed to star/unstar artist:', error);
    }
  };

  const handlePlayArtist = async () => {
    if (!artist) return;
    
    setIsPlayingArtist(true);
    try {
      // Clear current queue and add all artist albums
      clearQueue();
      await addArtistToQueue(artist.id);
      
      // Start playing the first album if we have any
      if (artistAlbums.length > 0) {
        await playAlbum(artistAlbums[0].id);
      }
      
      toast({
        title: "Playing Artist",
        description: `Now playing all albums by ${artist.name}`,
      });
    } catch (error) {
      console.error('Failed to play artist:', error);
      toast({
        title: "Error",
        description: "Failed to play artist albums.",
        variant: "destructive"
      });
    } finally {
      setIsPlayingArtist(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!artist || artistAlbums.length === 0) {
    return (
      <div className="h-full px-4 py-6 lg:px-8 flex items-center justify-center">
        <p>No albums found for this artist</p>
      </div>
    );
  }

  // Get artist image URL with proper fallback
  const artistImageUrl = artist.coverArt 
    ? api.getCoverArtUrl(artist.coverArt, 300)
    : '/default-user.jpg';

  return (
    <div className="h-full px-4 py-6 lg:px-8">
      <div className="space-y-6">
        {/* Artist Header */}
        <div className="relative bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-8">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <Image 
                src={artistImageUrl} 
                alt={artist.name} 
                width={120} 
                height={120}
                className="rounded-full border-4 border-white shadow-lg"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-2">{artist.name}</h1>
              <p className="text-white/80 mb-4">{artist.albumCount} albums</p>
              <div className="flex gap-3">
                <Button 
                  onClick={handlePlayArtist} 
                  disabled={isPlayingArtist}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isPlayingArtist ? 'Adding to Queue...' : 'Play Artist'}
                </Button>
                <Button onClick={handleStar} variant="secondary">
                  <Heart className={isStarred ? 'text-red-500' : 'text-gray-500'} fill={isStarred ? 'red' : 'none'}/>
                  {isStarred ? 'Starred' : 'Star Artist'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Albums Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Albums</h2>
          <ScrollArea>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-4">
              {artistAlbums.map((album) => (
                <AlbumArtwork
                  key={album.id}
                  album={album}
                  className="w-full"
                  aspectRatio="square"
                  width={200}
                  height={200}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
