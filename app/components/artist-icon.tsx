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

import { Artist } from "@/lib/navidrome"
import { useNavidrome } from "./NavidromeContext"
import { useAudioPlayer } from "@/app/components/AudioPlayerContext";
import { getNavidromeAPI } from "@/lib/navidrome";

interface ArtistIconProps extends React.HTMLAttributes<HTMLDivElement> {
  artist: Artist
  size?: number
}

export function ArtistIcon({
  artist,
  size = 150,
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

  return (
    <div className={cn("space-y-3", className)} {...props}>
      <ContextMenu>
        <ContextMenuTrigger>
          <div 
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
          </div>
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
      <div className="space-y-1 text-sm" onClick={handleClick}>
        <p className="font-medium leading-none text-center">{artist.name}</p>
        <p className="text-xs text-muted-foreground text-center">{artist.albumCount} albums</p>
      </div>
    </div>
  );
}
