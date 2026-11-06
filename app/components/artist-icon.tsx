'use client';

import React, { memo, useState, useMemo, useCallback } from 'react';
import Image from "next/image";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { useRouter } from 'next/navigation';
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
import { useAudioPlayerActions } from "@/app/components/AudioPlayerContext";
import { getNavidromeAPI, Artist } from "@/lib/navidrome";
import { Card, CardContent } from "@/components/ui/card";
import { useNavidrome } from '@/app/components/NavidromeContext';

interface ArtistIconProps extends React.HTMLAttributes<HTMLDivElement> {
  artist: Artist;
  size?: number;
  imageOnly?: boolean;
  responsive?: boolean;
  loading?: 'eager' | 'lazy';
}

export const ArtistIcon = memo(function ArtistIcon({
  artist,
  size = 150,
  imageOnly = false,
  responsive = false,
  loading = 'lazy',
  className,
  style,
  ...props
}: ArtistIconProps) {
  const router = useRouter();
  const { addArtistToQueue } = useAudioPlayerActions();
  const { playlists, starItem, unstarItem } = useNavidrome();
  const api = getNavidromeAPI();
  const [contextOpen, setContextOpen] = useState(false);

  const handleClick = useCallback(() => {
    router.push(`/artist/${artist.id}`);
  }, [router, artist.id]);

  const handleAddToQueue = useCallback(() => {
    addArtistToQueue(artist.id);
  }, [addArtistToQueue, artist.id]);

  const handleStar = useCallback(() => {
    if (artist.starred) {
      unstarItem(artist.id, 'artist');
    } else {
      starItem(artist.id, 'artist');
    }
  }, [artist.id, artist.starred, starItem, unstarItem]);

  const artistImageUrl = useMemo(() => {
    if (!artist.coverArt || !api) {
      return imageOnly ? '/default-user.jpg' : '/placeholder-artist.png';
    }
    return api.getCoverArtUrl(artist.coverArt, 300);
  }, [artist.coverArt, api, imageOnly]);

  if (imageOnly) {
    return (
      <div
        className={cn("overflow-hidden rounded-full cursor-pointer shrink-0", className)}
        onClick={handleClick}
        style={{ width: size, height: size, ...style }}
        {...props}
      >
        <Image
          src={artistImageUrl}
          alt={artist.name}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          loading={loading}
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div
      className={cn("space-y-3", className)}
      style={
        loading === 'lazy'
          ? { contentVisibility: 'auto', containIntrinsicSize: '200px 270px', ...style }
          : style
      }
      {...props}
    >
      <ContextMenu onOpenChange={setContextOpen}>
        <ContextMenuTrigger asChild>
          <Card
            className="overflow-hidden cursor-pointer px-0 py-0 gap-0 transition-transform duration-150 hover:-translate-y-0.5"
            onClick={handleClick}
          >
            <div
              className="aspect-square relative group bg-black/20"
              style={!responsive ? { width: size, height: size } : undefined}
            >
              <Image
                src={artistImageUrl}
                alt={artist.name}
                {...(responsive
                  ? {
                      fill: true,
                      sizes: "(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw",
                    }
                  : {
                      width: size,
                      height: size,
                    })}
                className={responsive ? "object-cover" : "object-cover w-full h-full"}
                loading={loading}
                decoding="async"
              />
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold truncate">{artist.name}</h3>
              <p className="text-sm text-muted-foreground">
                {artist.albumCount} albums
              </p>
            </CardContent>
          </Card>
        </ContextMenuTrigger>
        {contextOpen && (
          <ContextMenuContent className="w-44">
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
                    {playlist.name}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleAddToQueue}>Add All Songs to Queue</ContextMenuItem>
          </ContextMenuContent>
        )}
      </ContextMenu>
    </div>
  );
});

