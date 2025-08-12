'use client';

import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { 
  Play, 
  Plus, 
  ListMusic,
  Heart,
  SkipForward,
  UserIcon,
  Disc3,
  Star,
  Share,
  Info
} from 'lucide-react';
import { useAudioPlayer } from '@/app/components/AudioPlayerContext';
import { Track } from '@/app/components/AudioPlayerContext';

interface TrackContextMenuProps {
  children: React.ReactNode;
  track: Track;
  showPlayOptions?: boolean;
  showQueueOptions?: boolean;
  showFavoriteOption?: boolean;
  showAlbumArtistOptions?: boolean;
}

export function TrackContextMenu({
  children,
  track,
  showPlayOptions = true,
  showQueueOptions = true,
  showFavoriteOption = true,
  showAlbumArtistOptions = true
}: TrackContextMenuProps) {
  const { 
    playTrack, 
    addToQueue, 
    insertAtBeginningOfQueue,
    toggleCurrentTrackStar,
    currentTrack,
    queue
  } = useAudioPlayer();

  const handlePlayTrack = () => {
    playTrack(track, true);
  };

  const handleAddToQueue = () => {
    addToQueue(track);
  };

  const handlePlayNext = () => {
    // Add track to the beginning of the queue to play next
    insertAtBeginningOfQueue(track);
  };

  const handleToggleFavorite = () => {
    if (currentTrack?.id === track.id) {
      toggleCurrentTrackStar();
    }
    // For non-current tracks, we'd need a separate function to toggle favorites
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {showPlayOptions && (
          <>
            <ContextMenuItem onClick={handlePlayTrack} className="cursor-pointer">
              <Play className="mr-2 h-4 w-4" />
              Play Now
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        
        {showQueueOptions && (
          <>
            <ContextMenuItem onClick={handlePlayNext} className="cursor-pointer">
              <SkipForward className="mr-2 h-4 w-4" />
              Play Next
            </ContextMenuItem>
            <ContextMenuItem onClick={handleAddToQueue} className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Add to Queue
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}

        {showFavoriteOption && (
          <>
            <ContextMenuItem onClick={handleToggleFavorite} className="cursor-pointer">
              <Heart className={`mr-2 h-4 w-4 ${track.starred ? 'fill-current text-red-500' : ''}`} />
              {track.starred ? 'Remove from Favorites' : 'Add to Favorites'}
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}

        {showAlbumArtistOptions && (
          <>
            <ContextMenuItem className="cursor-pointer">
              <Disc3 className="mr-2 h-4 w-4" />
              Go to Album
            </ContextMenuItem>
            <ContextMenuItem className="cursor-pointer">
              <UserIcon className="mr-2 h-4 w-4" />
              Go to Artist
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}

        <ContextMenuItem className="cursor-pointer">
          <Info className="mr-2 h-4 w-4" />
          Track Info
        </ContextMenuItem>
        <ContextMenuItem className="cursor-pointer">
          <Share className="mr-2 h-4 w-4" />
          Share
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Additional context menus for albums and artists
interface AlbumContextMenuProps {
  children: React.ReactNode;
  albumId: string;
  albumName: string;
}

export function AlbumContextMenu({ 
  children, 
  albumId, 
  albumName 
}: AlbumContextMenuProps) {
  const { playAlbum, addAlbumToQueue } = useAudioPlayer();

  const handlePlayAlbum = () => {
    playAlbum(albumId);
  };

  const handleAddAlbumToQueue = () => {
    addAlbumToQueue(albumId);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={handlePlayAlbum} className="cursor-pointer">
          <Play className="mr-2 h-4 w-4" />
          Play Album
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleAddAlbumToQueue} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          Add Album to Queue
        </ContextMenuItem>
        <ContextMenuItem className="cursor-pointer">
          <SkipForward className="mr-2 h-4 w-4" />
          Play Album Next
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="cursor-pointer">
          <Heart className="mr-2 h-4 w-4" />
          Add to Favorites
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="cursor-pointer">
          <UserIcon className="mr-2 h-4 w-4" />
          Go to Artist
        </ContextMenuItem>
        <ContextMenuItem className="cursor-pointer">
          <Info className="mr-2 h-4 w-4" />
          Album Info
        </ContextMenuItem>
        <ContextMenuItem className="cursor-pointer">
          <Share className="mr-2 h-4 w-4" />
          Share Album
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

interface ArtistContextMenuProps {
  children: React.ReactNode;
  artistId: string;
  artistName: string;
}

export function ArtistContextMenu({ 
  children, 
  artistId, 
  artistName 
}: ArtistContextMenuProps) {
  const { playArtist, addArtistToQueue } = useAudioPlayer();

  const handlePlayArtist = () => {
    playArtist(artistId);
  };

  const handleAddArtistToQueue = () => {
    addArtistToQueue(artistId);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={handlePlayArtist} className="cursor-pointer">
          <Play className="mr-2 h-4 w-4" />
          Play All Songs
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleAddArtistToQueue} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          Add All to Queue
        </ContextMenuItem>
        <ContextMenuItem className="cursor-pointer">
          <SkipForward className="mr-2 h-4 w-4" />
          Play All Next
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="cursor-pointer">
          <Heart className="mr-2 h-4 w-4" />
          Add to Favorites
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="cursor-pointer">
          <Info className="mr-2 h-4 w-4" />
          Artist Info
        </ContextMenuItem>
        <ContextMenuItem className="cursor-pointer">
          <Share className="mr-2 h-4 w-4" />
          Share Artist
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
