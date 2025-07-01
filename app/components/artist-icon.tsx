'use client';

import Image from "next/image"
import { PlusCircledIcon } from "@radix-ui/react-icons"
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "../../components/ui/context-menu"
import { useAudioPlayer } from "@/app/components/AudioPlayerContext";
import { getNavidromeAPI } from "@/lib/navidrome";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavidrome } from '@/app/components/NavidromeContext';
import { Artist } from '@/lib/navidrome';

interface ArtistIconProps extends React.HTMLAttributes<HTMLDivElement> {
  artist: Artist
  size?: number
  imageOnly?: boolean
}

export function ArtistIcon({
  artist,
  size = 150,
  imageOnly = false,
  className,
  ...props
}: ArtistIconProps) {
  const router = useRouter();
  const { addArtistToQueue } = useAudioPlayer();
  const { playlists, starItem, unstarItem } = useNavidrome();
  const api = getNavidromeAPI();
  
  const handleClick = () => {
    router.push(`/artist/${artist.id}`);
  };

  const handleAddToQueue = () => {
    addArtistToQueue(artist.id);
  };

  const handleStar = () => {
    if (artist.starred) {
      unstarItem(artist.id, 'artist');
    } else {
      starItem(artist.id, 'artist');
    }
  };
  // Get cover art URL with proper fallback
  const artistImageUrl = artist.coverArt && api
    ? api.getCoverArtUrl(artist.coverArt, 200)
    : '/default-user.jpg';

  // If imageOnly is true, return just the image without context menu or text
  if (imageOnly) {
    return (
      <div 
        className={cn("overflow-hidden rounded-full cursor-pointer flex-shrink-0", className)} 
        onClick={handleClick}
        style={{ width: size, height: size }}
        {...props}
      >
        <Image
          src={artistImageUrl}
          alt={artist.name}
          width={size}
          height={size}
          className="w-full h-full object-cover transition-all hover:scale-105"
        />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)} {...props}>
      <ContextMenu>
        <ContextMenuTrigger>
          <Card key={artist.id} className="overflow-hidden">
            <div
              className="aspect-square relative group cursor-pointer"
              style={{ width: size, height: size }}
              onClick={() => handleClick()}
            >
              <div className="w-full h-full">
                <Image
                  src={artist.coverArt && api ? api.getCoverArtUrl(artist.coverArt, 200) : '/placeholder-artist.png'}
                  alt={artist.name}
                  width={size}
                  height={size}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="sm">
                  View Artist
                </Button>
              </div>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold truncate">{artist.name}</h3>
              <p className="text-sm text-muted-foreground">
                {artist.albumCount} albums
              </p>
            </CardContent>
          </Card>
          {/* <div 
            className="overflow-hidden rounded-full cursor-pointer flex-shrink-0" 
            onClick={handleClick}
            style={{ width: size, height: size }}
          >
            <Image
              src={artistImageUrl}
              alt={artist.name}
              width={size}
              height={size}
              className="w-full h-full object-cover transition-all hover:scale-105"
            />
          </div> */}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-40">
          <ContextMenuItem onClick={handleStar}>
            {artist.starred ? 'Remove from Favorites' : 'Add to Favorites'}
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>Add to Playlist</ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              <ContextMenuItem>
                <PlusCircledIcon className="mr-2 h-4 w-4" />
                New Playlist
              </ContextMenuItem>
              <ContextMenuSeparator />
              {playlists.map((playlist) => (
                <ContextMenuItem key={playlist.id}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className="mr-2 h-4 w-4"
                    viewBox="0 0 24 24"
                  >
                    <path d="M21 15V6M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM12 12H3M16 6H3M12 18H3" />
                  </svg>
                  {playlist.name}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleAddToQueue}>Add All Songs to Queue</ContextMenuItem>
          <ContextMenuItem>Play Next</ContextMenuItem>
          <ContextMenuItem>Play Later</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleStar}>
            {artist.starred ? '★ Starred' : '☆ Star'}
          </ContextMenuItem>
          <ContextMenuItem>Share</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
