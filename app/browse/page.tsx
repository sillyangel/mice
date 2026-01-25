'use client';

import { useCallback, useEffect } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { AlbumArtwork } from '@/app/components/album-artwork';
import { ArtistIcon } from '@/app/components/artist-icon';
import { useNavidrome } from '@/app/components/NavidromeContext';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { useProgressiveAlbumLoading } from '@/hooks/use-progressive-album-loading';
import { 
  Shuffle, 
  ArrowDown, 
  RefreshCcw,
  Loader2
} from 'lucide-react';
import Loading from '@/app/components/loading';
import { useInView } from 'react-intersection-observer';

export default function BrowsePage() {
  const { artists: allArtists, isLoading: contextLoading } = useNavidrome();
  // Filter to only show album artists (artists with at least one album)
  const artists = allArtists.filter(artist => artist.albumCount && artist.albumCount > 0);
  const { shuffleAllAlbums } = useAudioPlayer();
  
  // Use our progressive loading hook
  const { 
    albums, 
    isLoading, 
    hasMore, 
    loadMoreAlbums, 
    refreshAlbums
  } = useProgressiveAlbumLoading('alphabeticalByName');
  
  // Infinite scroll with intersection observer
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });
  
  // Load more albums when the load more sentinel comes into view
  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      loadMoreAlbums();
    }
  }, [inView, hasMore, isLoading, loadMoreAlbums]);
  
  // Pull-to-refresh simulation
  const handleRefresh = useCallback(() => {
    refreshAlbums();
  }, [refreshAlbums]);

  if (contextLoading) {
    return <Loading />;
  }

  return (
    <div className="p-6 pb-24 w-full">
      <div className="space-y-2">
        <div className="h-full flex flex-col space-y-6">
          <div className="border-none p-0 outline-hidden flex flex-col grow">
          
          <div className="flex items-center justify-between">
              <div className="space-y-1">
              <p className="text-3xl font-semibold tracking-tight">
                Browse Artists
              </p>
              <p className="text-sm text-muted-foreground">
                the people who make the music
              </p>
            </div>
            <Button onClick={shuffleAllAlbums} className="flex items-center gap-2">
              <Shuffle className="w-4 h-4" />
              Shuffle All Albums
            </Button>
          </div>
          <Separator className="my-4" />
          <div className="relative grow">
            <div className="relative">
            <ScrollArea>
            <div className="flex space-x-4 pb-4">
            {artists.map((artist, index) => (
                  <ArtistIcon
                    key={artist.id}
                    artist={artist}
                    className="shrink-0 overflow-hidden"
                    size={190}
                    loading={index < 10 ? 'eager' : 'lazy'}
                  />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-3xl font-semibold tracking-tight">
                Browse Albums
              </p>
              <p className="text-sm text-muted-foreground">
                Browse the full collection of albums ({albums.length} loaded).
              </p>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
          <Separator className="my-4" />
          <div className="relative grow">
            <ScrollArea className="h-full">
              <div className="h-full overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 p-4 pb-8">
                  {albums.map((album, index) => (
                    <AlbumArtwork
                      key={album.id}
                      album={album}
                      className="w-full"
                      aspectRatio="square"
                      width={200}
                      height={200}
                      loading={index < 20 ? 'eager' : 'lazy'}
                    />
                  ))}
                </div>
                {/* Load more sentinel */}
                {hasMore && (
                  <div 
                    ref={ref} 
                    className="flex justify-center p-4 pb-24"
                  >
                    <Button 
                      onClick={loadMoreAlbums} 
                      disabled={isLoading}
                      variant="ghost"
                      className="flex flex-col items-center gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <ArrowDown className="h-6 w-6" />
                      )}
                      <span className="text-sm">
                        {isLoading ? 'Loading...' : 'Load More Albums'}
                      </span>
                    </Button>
                  </div>
                )}
                
                {!hasMore && albums.length > 0 && (
                  <div className="flex justify-center p-4 pb-24">
                    <p className="text-sm text-muted-foreground">
                      All albums loaded ({albums.length} total)
                    </p>
                  </div>
                )}
                
                {albums.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center justify-center p-12">
                    <p className="text-lg font-medium mb-2">No albums found</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Try refreshing or check your connection
                    </p>
                    <Button onClick={handleRefresh}>Refresh</Button>
                  </div>
                )}
              </div>
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}