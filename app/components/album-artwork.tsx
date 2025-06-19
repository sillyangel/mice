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

import { Album } from "@/lib/navidrome"
import { useNavidrome } from "./NavidromeContext"
import Link from "next/link";
import { useAudioPlayer } from "@/app/components/AudioPlayerContext";
import { getNavidromeAPI } from "@/lib/navidrome";

interface AlbumArtworkProps extends React.HTMLAttributes<HTMLDivElement> {
  album: Album
  aspectRatio?: "portrait" | "square"
  width?: number
  height?: number
}

export function AlbumArtwork({
  album,
  aspectRatio = "portrait",
  width,
  height,
  className,
  ...props
}: AlbumArtworkProps) {
  const router = useRouter();
  const { addAlbumToQueue } = useAudioPlayer();
  const { playlists, starItem, unstarItem } = useNavidrome();
  const api = getNavidromeAPI();

  const handleClick = () => {
    router.push(`/album/${album.id}`);
  };

  const handleAddToQueue = () => {
    addAlbumToQueue(album.id);
  };

  const handleStar = () => {
    if (album.starred) {
      unstarItem(album.id, 'album');
    } else {
      starItem(album.id, 'album');
    }
  };

  // Get cover art URL with proper fallback
  const coverArtUrl = album.coverArt 
    ? api.getCoverArtUrl(album.coverArt, 300)
    : '/default-user.jpg';

  return (
    <div className={cn("space-y-3", className)} {...props}>
      <ContextMenu>
        <ContextMenuTrigger>
          <div onClick={handleClick} className="overflow-hidden rounded-md">
            <Image
              src={coverArtUrl}
              alt={album.name}
              width={width}
              height={height}
              
              className={cn(
                "h-auto w-auto object-cover transition-all hover:scale-105",
                aspectRatio === "portrait" ? "aspect-[3/4]" : "aspect-square"
              )}
            />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-40">
          <ContextMenuItem onClick={handleStar}>
            {album.starred ? 'Remove from Favorites' : 'Add to Favorites'}
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
          <ContextMenuItem onClick={handleAddToQueue}>Add Album to Queue</ContextMenuItem>
          <ContextMenuItem>Play Next</ContextMenuItem>
          <ContextMenuItem>Play Later</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleStar}>
            {album.starred ? '★ Starred' : '☆ Star'}
          </ContextMenuItem>
          <ContextMenuItem>Share</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <div className="space-y-1 text-sm" >
        <p className="font-medium leading-none" onClick={handleClick}>{album.name}</p>
        <p className="text-xs text-muted-foreground underline">
          <Link href={`/artist/${album.artistId}`}>{album.artist}</Link>
        </p>
      </div>
    </div>
  )
}