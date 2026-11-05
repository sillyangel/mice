'use client';

import Image from "next/image"
import { PlusCircledIcon } from "@radix-ui/react-icons"
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

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

import { useNavidrome } from "./NavidromeContext"
import Link from "next/link";
import { useAudioPlayer, Track } from "@/app/components/AudioPlayerContext";
import { getNavidromeAPI } from "@/lib/navidrome";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArtistIcon } from "@/app/components/artist-icon";
import { Heart, Music, Disc, Mic, Play, Download, MoreHorizontal } from "lucide-react";
import { Album, Artist, Song } from "@/lib/navidrome";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AlbumArtworkProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragOver' | 'onDragEnter' | 'onDragLeave' | 'onDrop'
> {
  album: Album
  aspectRatio?: "portrait" | "square"
  width?: number
  height?: number
  loading?: 'eager' | 'lazy'
  showArtist?: boolean
}

export function AlbumArtwork({
  album,
  aspectRatio = "portrait",
  width,
  height,
  loading = 'lazy',
  showArtist = true,
  className,
  ...props
}: AlbumArtworkProps) {
  const { api, isConnected } = useNavidrome();
  const router = useRouter();
  const { addAlbumToQueue, playTrack, addToQueue } = useAudioPlayer();
  const { playlists, starItem, unstarItem } = useNavidrome();
  
  // Memoize cover art URL with dynamic sizing
  const coverArtUrl = useMemo(() => {
    if (!api || !album.coverArt) return '/default-user.jpg';
    
    // Use width prop or default size for optimization
    const imageSize = width || height || 300;
    return api.getCoverArtUrl(album.coverArt, imageSize);
  }, [api, album.coverArt, width, height]);

  // Use callback to prevent function recreation on every render
  const handleImageLoad = useCallback(() => {
    // Image loaded successfully - no state update needed
  }, []);

  const handleImageError = useCallback(() => {
    // Image failed to load silently (a broken cover falls back to the default)
  }, []);

  const handleClick = () => {
    router.push(`/album/${album.id}`);
  };

  const handlePrefetch = () => {
    try {
      // Next.js App Router will prefetch on hover when using Link with prefetch
      // but we also call router.prefetch to ensure programmatic prefetch when present.
      const r = router as unknown as { prefetch?: (href: string) => Promise<void> | void };
      if (r && typeof r.prefetch === 'function') {
        r.prefetch(`/album/${album.id}`);
      }
    } catch {}
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

    const handlePlayAlbum = async (album: Album) => {
      if (!api) return;
      
      try {
        const songs = await api.getAlbumSongs(album.id);
        if (songs.length > 0) {
          const tracks = songs.map((song: Song) => ({
            id: song.id,
            name: song.title,
            artist: song.artist,
            album: song.album,
            albumId: song.albumId,
            artistId: song.artistId,
            url: api.getStreamUrlForSong(song),
            duration: song.duration,
            coverArt: song.coverArt ? api.getCoverArtUrl(song.coverArt, 1200) : undefined,
            starred: !!song.starred
          }));
          
          playTrack(tracks[0]);
          tracks.slice(1).forEach((track: Track) => addToQueue(track));
        }
      } catch (error) {
        console.error('Failed to play album:', error);
      }
    };
  
    const toggleFavorite = async (id: string, type: 'song' | 'album' | 'artist', isStarred: boolean) => {
      if (!api) return;
      
      try {
        if (isStarred) {
          await api.unstar(id, type);
        } else {
          await api.star(id, type);
        }
      } catch (error) {
        console.error('Failed to toggle favorite:', error);
      }
    };
    
  return (
    <div className={cn("group cursor-pointer select-none", className)} {...props}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.2 }}
      >
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              className="relative aspect-square w-full rounded-md lg:rounded-lg overflow-hidden bg-black/30 shadow-md group/cover"
              onClick={handleClick}
              onMouseEnter={handlePrefetch}
              onFocus={handlePrefetch}
            >
              {album.coverArt && api ? (
                <Image
                  src={coverArtUrl}
                  alt={`${album.name} by ${album.artist.split(";")[0]}`}
                  fill
                  className="w-full h-full object-cover transition-transform duration-300 group-hover/cover:scale-[1.02]"
                  sizes="(max-width: 768px) 50vw, 300px"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  priority={false}
                  loading={loading}
                />
              ) : (
                <div className="w-full h-full bg-muted/40 rounded flex items-center justify-center">
                  <Disc className="w-12 h-12 text-muted-foreground" />
                </div>
              )}

              {/* Apple Music Floating Hover Controls: Play circle (bottom left) & More circle (bottom right) */}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-end justify-between p-2.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayAlbum(album);
                  }}
                  className="w-9 h-9 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white backdrop-blur-md shadow-lg hover:scale-105 active:scale-95 transition-all"
                  title="Play Album"
                  aria-label="Play Album"
                >
                  <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button
                      className="w-9 h-9 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white backdrop-blur-md shadow-lg hover:scale-105 active:scale-95 transition-all"
                      title="More options"
                      aria-label="More options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#1f1d1c]/95 border-white/10 text-white">
                    <DropdownMenuItem onClick={() => handlePlayAlbum(album)} className="cursor-pointer">
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
                </DropdownMenu>
              </div>
            </div>

            {/* Typography matching Apple Music layout */}
            <div className="mt-2 text-left">
              <h3 className="font-semibold text-[14px] text-white/95 truncate leading-snug hover:underline">
                <Link href={`/album/${album.id}`} prefetch>{album.name}</Link>
              </h3>
              {showArtist ? (
                <p className="text-xs text-white/50 truncate mt-0.5">
                  {album.artistId ? (
                    <Link
                      href={`/artist/${album.artistId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-white hover:underline"
                    >
                      {album.artist.split(";").join(", ")}
                    </Link>
                  ) : (
                    album.artist.split(";").join(", ")
                  )}
                </p>
              ) : (
                <p className="text-xs text-white/50 truncate mt-0.5">
                  {album.year || 'Album'}
                </p>
              )}
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
      </motion.div>
    </div>
  )
}