'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Album, Artist, Song } from '@/lib/navidrome';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { AlbumArtwork } from '@/app/components/album-artwork';
import { PopularSongs } from '@/app/components/PopularSongs';
import { SimilarArtists } from '@/app/components/SimilarArtists';
import { ArtistBio } from '@/app/components/ArtistBio';
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
  const [popularSongs, setPopularSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [isPlayingArtist, setIsPlayingArtist] = useState(false);
  const { getArtist, starItem, unstarItem } = useNavidrome();
  const { playArtist } = useAudioPlayer();
  const { toast } = useToast();
  const api = getNavidromeAPI();

  useEffect(() => {
    const fetchArtistData = async () => {
      setLoading(true);
      try {
        if (artistId && api) {
          const artistData = await getArtist(artistId as string);
          setArtist(artistData.artist);
          setArtistAlbums(artistData.albums);
          setIsStarred(!!artistData.artist.starred);

          // Fetch popular songs for the artist
          try {
            const songs = await api.getArtistTopSongs(artistData.artist.name, 10);
            setPopularSongs(songs);
          } catch (error) {
            console.error('Failed to fetch popular songs:', error);
          }
        }
      } catch (error) {
        console.error('Failed to fetch artist data:', error);
      }
      setLoading(false);
    };

    fetchArtistData();
  }, [artistId, getArtist, api]);

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
      await playArtist(artist.id);
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
  const artistImageUrl = artist.coverArt && api
    ? api.getCoverArtUrl(artist.coverArt, 1200)
    : '/default-user.jpg';

  return (
    <div className="h-full px-4 py-6 lg:px-8 pb-24">
      <div className="space-y-6">
        {/* Artist Header */}
        <div className="relative rounded-lg p-8">
          <div className="relative rounded-sm p-10">
            <div
              className="absolute inset-0 bg-center bg-cover bg-no-repeat blur-xl"
              style={{ backgroundImage: `url(${artistImageUrl})` }}
            />
            <div className="relative z-10 flex items-center space-x-6">
              <div className="relative">
                <Image
                  src={artistImageUrl}
                  alt={artist.name}
                  width={120}
                  height={120}
                  className="rounded-full shadow-lg"
                />
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-white mb-2">{artist.name}</h1>
                <p className="text-white/80 mb-4">{artist.albumCount} albums</p>
                <div className="flex gap-3">
                  <Button 
                    onClick={handlePlayArtist} 
                    disabled={isPlayingArtist}
                    className="bg-primary hover:bg-primary/70"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {isPlayingArtist ? 'Adding to Queue...' : 'Play Artist'}
                  </Button>
                  <Button onClick={handleStar} variant="secondary">
                    <Heart className={isStarred ? 'text-red-500' : 'text-gray-500'} fill={isStarred ? 'red' : 'none'} />
                    {isStarred ? 'Starred' : 'Star Artist'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* About Section */}
        <ArtistBio artistName={artist.name} />
        
        {/* Popular Songs Section */}
        {popularSongs.length > 0 && (
          <PopularSongs songs={popularSongs} artistName={artist.name} />
        )}

        {/* Albums Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Discography</h2>
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
        

        

        {/* Similar Artists Section */}
        <SimilarArtists artistName={artist.name} />
      </div>
    </div>
  );
}
