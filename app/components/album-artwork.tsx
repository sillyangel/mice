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

import { useNavidrome } from "./NavidromeContext"
import Link from "next/link";
import { useAudioPlayer, Track } from "@/app/components/AudioPlayerContext";
import { getNavidromeAPI } from "@/lib/navidrome";
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArtistIcon } from "@/app/components/artist-icon";
import { Heart, Music, Disc, Mic, Play } from "lucide-react";
import { Album, Artist, Song } from "@/lib/navidrome";

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
  const { api, isConnected } = useNavidrome();
  const router = useRouter();
  const { addAlbumToQueue, playTrack, addToQueue } = useAudioPlayer();
  const { playlists, starItem, unstarItem } = useNavidrome();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

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
            url: api.getStreamUrl(song.id),
            duration: song.duration,
            coverArt: song.coverArt ? api.getCoverArtUrl(song.coverArt) : undefined,
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
  // Get cover art URL with proper fallback
  const coverArtUrl = album.coverArt && api
    ? api.getCoverArtUrl(album.coverArt, 300)
    : '/default-user.jpg';

  return (
    <div className={cn("space-y-3", className)} {...props}>
      <ContextMenu>
        <ContextMenuTrigger>
          <Card key={album.id} className="overflow-hidden cursor-pointer px-0 py-0 gap-0" onClick={() => handleClick()}>
                              <div className="aspect-square relative group">
                                  {album.coverArt && api ? (
                                      <>
                                        {imageLoading && (
                                          <div className="absolute inset-0 bg-muted animate-pulse rounded flex items-center justify-center">
                                            <Disc className="w-12 h-12 text-muted-foreground animate-spin" />
                                          </div>
                                        )}
                                        <Image
                                            src={api.getCoverArtUrl(album.coverArt)}
                                            alt={album.name}
                                            fill
                                            className={`w-full h-full object-cover transition-opacity duration-300 ${
                                              imageLoading ? 'opacity-0' : 'opacity-100'
                                            }`}
                                            sizes="(max-width: 768px) 100vw, 300px"
                                            onLoad={() => setImageLoading(false)}
                                            onError={() => {
                                              setImageLoading(false);
                                              setImageError(true);
                                            }}
                                        />
                                      </>
                                  ) : (
                                      <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                                          <Disc className="w-12 h-12 text-muted-foreground" />
                                      </div>
                                  )}
                                  {!imageLoading && (
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Play className="w-6 h-6 mx-auto hidden group-hover:block" onClick={() => handlePlayAlbum(album)}/>
                                    </div>
                                  )}
                              </div>
                              <CardContent className="p-4">
                                {imageLoading ? (
                                  <>
                                    <div className="h-5 w-3/4 bg-muted animate-pulse rounded mb-2" />
                                    <div className="h-4 w-1/2 bg-muted animate-pulse rounded mb-1" />
                                    <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
                                  </>
                                ) : (
                                  <>
                                    <h3 className="font-semibold truncate">{album.name}</h3>
                                    <p className="text-sm text-muted-foreground truncate " onClick={() => router.push(album.artistId)}>{album.artist}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {album.songCount} songs • {Math.floor(album.duration / 60)} min
                                    </p>
                                  </>
                                )}
                              </CardContent>
                            </Card>
          {/* <div onClick={handleClick} className="overflow-hidden rounded-md">
            <Image
              src={coverArtUrl}
              alt={album.name}
              width={width}
              height={height}
              
              className={cn(
                "w-full h-full object-cover transition-all hover:scale-105",
                aspectRatio === "portrait" ? "aspect-3/4" : "aspect-square"
              )}
            />
          </div> */}
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
    </div>
  )
}