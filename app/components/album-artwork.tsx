'use client';

import React, { memo, useState, useMemo, useCallback } from 'react';
import Image from "next/image";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { Heart, Disc, Play, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "../../components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavidrome } from "./NavidromeContext";
import { useAudioPlayerActions } from "@/app/components/AudioPlayerContext";
import { Album, getNavidromeAPI } from "@/lib/navidrome";

interface AlbumArtworkProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragOver' | 'onDragEnter' | 'onDragLeave' | 'onDrop'
> {
  album: Album;
  aspectRatio?: "portrait" | "square";
  width?: number;
  height?: number;
  loading?: 'eager' | 'lazy';
  showArtist?: boolean;
}

export const AlbumArtwork = memo(function AlbumArtwork({
  album,
  width,
  height,
  loading = 'lazy',
  showArtist = true,
  className,
  style,
  ...props
}: AlbumArtworkProps) {
  const api = getNavidromeAPI();
  const router = useRouter();
  const { addAlbumToQueue, playAlbum } = useAudioPlayerActions();
  const { playlists, starItem, unstarItem } = useNavidrome();
  const [contextOpen, setContextOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const coverArtUrl = useMemo(() => {
    if (!api || !album.coverArt) return '/default-user.jpg';
    const imageSize = width || height || 300;
    return api.getCoverArtUrl(album.coverArt, imageSize);
  }, [api, album.coverArt, width, height]);

  const artistLabel = useMemo(() => album.artist.split(";").join(", "), [album.artist]);

  const handleClick = useCallback(() => {
    router.push(`/album/${album.id}`);
  }, [router, album.id]);

  const handlePrefetch = useCallback(() => {
    try {
      router.prefetch(`/album/${album.id}`);
    } catch {}
  }, [router, album.id]);

  const handleAddToQueue = useCallback(() => {
    addAlbumToQueue(album.id);
  }, [addAlbumToQueue, album.id]);

  const handleStar = useCallback(() => {
    if (album.starred) {
      unstarItem(album.id, 'album');
    } else {
      starItem(album.id, 'album');
    }
  }, [album.id, album.starred, starItem, unstarItem]);

  const handlePlayAlbumClick = useCallback(() => {
    playAlbum(album.id);
  }, [playAlbum, album.id]);

  return (
    <div
      className={cn("group cursor-pointer select-none", className)}
      style={
        loading === 'lazy'
          ? { contentVisibility: 'auto', containIntrinsicSize: '200px 256px', ...style }
          : style
      }
      {...props}
    >
      <ContextMenu onOpenChange={setContextOpen}>
        <ContextMenuTrigger asChild>
          <div>
            <div
              className="relative aspect-square w-full rounded-md lg:rounded-lg overflow-hidden bg-black/30 shadow-md group/cover"
              onClick={handleClick}
              onMouseEnter={handlePrefetch}
            >
              {album.coverArt && api ? (
                <Image
                  src={coverArtUrl}
                  alt={album.name}
                  fill
                  className="w-full h-full object-cover"
                  sizes="(max-width: 768px) 50vw, 300px"
                  priority={false}
                  loading={loading}
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full bg-muted/40 rounded flex items-center justify-center">
                  <Disc className="w-12 h-12 text-muted-foreground" />
                </div>
              )}

              {/* Apple Music Floating Hover Controls: Play circle (bottom left) & More circle (bottom right) */}
              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-end justify-between p-2.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayAlbumClick();
                  }}
                  className="w-9 h-9 rounded-full bg-black/80 hover:bg-black/95 flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-transform"
                  title="Play Album"
                  aria-label="Play Album"
                >
                  <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                </button>

                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button
                      className="w-9 h-9 rounded-full bg-black/80 hover:bg-black/95 flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-transform"
                      title="More options"
                      aria-label="More options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  {dropdownOpen && (
                    <DropdownMenuContent align="end" className="bg-[#1f1d1c]/95 border-white/10 text-white">
                      <DropdownMenuItem onClick={handlePlayAlbumClick} className="cursor-pointer">
                        <Play className="w-4 h-4 mr-2" /> Play Next
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleAddToQueue} className="cursor-pointer">
                        <PlusCircledIcon className="w-4 h-4 mr-2" /> Add to Queue
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleStar} className="cursor-pointer">
                        <Heart className={`w-4 h-4 mr-2 ${album.starred ? 'fill-primary text-primary' : ''}`} />
                        {album.starred ? 'Remove from Favorites' : 'Add to Favorites'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  )}
                </DropdownMenu>
              </div>
            </div>

            {/* Typography matching Apple Music layout */}
            <div className="mt-2 text-left">
              <h3 className="font-semibold text-[14px] text-white/95 truncate leading-snug hover:underline">
                <Link href={`/album/${album.id}`} prefetch={false}>{album.name}</Link>
              </h3>
              {showArtist ? (
                <p className="text-xs text-white/50 truncate mt-0.5">
                  {album.artistId ? (
                    <Link
                      href={`/artist/${album.artistId}`}
                      prefetch={false}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-white hover:underline"
                    >
                      {artistLabel}
                    </Link>
                  ) : (
                    artistLabel
                  )}
                </p>
              ) : (
                <p className="text-xs text-white/50 truncate mt-0.5">
                  {album.year || 'Album'}
                </p>
              )}
            </div>
          </div>
        </ContextMenuTrigger>
        {contextOpen && (
          <ContextMenuContent className="w-44">
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
                    {playlist.name}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleAddToQueue}>Add Album to Queue</ContextMenuItem>
            <ContextMenuItem onClick={handlePlayAlbumClick}>Play Album</ContextMenuItem>
          </ContextMenuContent>
        )}
      </ContextMenu>
    </div>
  );
});