'use client';

import { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { usePathname } from 'next/navigation';
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import Link from "next/link";
import Image from "next/image";
import { Playlist, Album } from "@/lib/navidrome";
import { 
  Search,
  Home,
  List,
  Radio,
  Users,
  Disc,
  Music,
  Heart,
  Grid3X3,
  Clock,
  Settings,
  Circle
} from "lucide-react";
import { useNavidrome } from "./NavidromeContext";
import { useRecentlyPlayedAlbums } from "@/hooks/use-recently-played-albums";
import { useSidebarShortcuts } from "@/hooks/use-sidebar-shortcuts";
import { useSidebarLayout, SidebarItem } from "@/hooks/use-sidebar-layout";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

// Icon mapping for sidebar items
const iconMap: Record<string, React.ReactNode> = {
  search: <Search className="h-4 w-4" />,
  home: <Home className="h-4 w-4" />,
  queue: <List className="h-4 w-4" />,
  radio: <Radio className="h-4 w-4" />,
  artists: <Users className="h-4 w-4" />,
  albums: <Disc className="h-4 w-4" />,
  playlists: <Music className="h-4 w-4" />,
  favorites: <Heart className="h-4 w-4" />,
  browse: <Grid3X3 className="h-4 w-4" />,
  songs: <Circle className="h-4 w-4" />,
  history: <Clock className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
};

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  playlists: Playlist[];
  visible?: boolean;
  favoriteAlbums?: Array<{id: string, name: string, artist: string, coverArt?: string}>;
  onRemoveFavoriteAlbum?: (albumId: string) => void;
}

export function Sidebar({ className, playlists, visible = true, favoriteAlbums = [], onRemoveFavoriteAlbum }: SidebarProps) {
  const pathname = usePathname();
  const { api } = useNavidrome();
  const { recentAlbums } = useRecentlyPlayedAlbums();
  const { shortcutType } = useSidebarShortcuts();
  const { settings } = useSidebarLayout();

  if (!visible) {
    return null;
  }

  // Check if a route is active
  const isRouteActive = (href: string): boolean => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Get visible navigation items
  const visibleItems = settings.items.filter(item => item.visible);

  return (
    <div className={cn("pb-23 relative w-16", className)}>
      <div className="space-y-4 py-4 pt-6">
        <div className="px-3 py-2">
          <div className="space-y-1">
            {/* Main Navigation Items */}
            {visibleItems.map((item) => (
              <Link key={item.id} href={item.href}>
                <Button 
                  variant={isRouteActive(item.href) ? "secondary" : "ghost"} 
                  className="w-full justify-center px-2"
                  title={item.label}
                >
                  {settings.showIcons && (iconMap[item.icon] || <div className="h-4 w-4" />)}
                </Button>
              </Link>
            ))}
            
            {/* Dynamic Shortcuts Section */}
            {(shortcutType === 'albums' || shortcutType === 'both') && favoriteAlbums.length > 0 && (
              <>
                <div className="border-t my-2"></div>
                {favoriteAlbums.slice(0, 5).map((album) => (
                  <ContextMenu key={album.id}>
                    <ContextMenuTrigger>
                      <Link href={`/album/${album.id}`}>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-center px-2"
                          title={`${album.name} by ${album.artist}`}
                        >
                          {album.coverArt && api ? (
                            <Image
                              src={api.getCoverArtUrl(album.coverArt, 150)}
                              alt={album.name}
                              width={16}
                              height={16}
                              className="rounded"
                            />
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                            >
                              <path d="m16 6 4 14" />
                              <path d="M12 6v14" />
                              <path d="M8 8v12" />
                              <path d="M4 4v16" />
                            </svg>
                          )}
                        </Button>
                      </Link>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onRemoveFavoriteAlbum?.(album.id);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        Remove from favorites
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </>
            )}

            {/* Recently Played Albums */}
            {(shortcutType === 'albums' || shortcutType === 'both') && recentAlbums.length > 0 && (
              <>
                <div className="border-t my-2"></div>
                {recentAlbums.slice(0, 5).map((album) => (
                  <Link key={album.id} href={`/album/${album.id}`}>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-center px-2"
                      title={`${album.name} by ${album.artist} (Recently Played)`}
                    >
                      {album.coverArt && api ? (
                        <Image
                          src={api.getCoverArtUrl(album.coverArt, 150)}
                          alt={album.name}
                          width={16}
                          height={16}
                          className="rounded opacity-70"
                        />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4 opacity-70"
                        >
                          <path d="m16 6 4 14" />
                          <path d="M12 6v14" />
                          <path d="M8 8v12" />
                          <path d="M4 4v16" />
                        </svg>
                      )}
                    </Button>
                  </Link>
                ))}
              </>
            )}
            
            {/* Playlists Section */}
            {(shortcutType === 'playlists' || shortcutType === 'both') && playlists.length > 0 && (
              <>
                <div className="border-t my-2"></div>
                {playlists.slice(0, 5).map((playlist) => (
                  <Link key={playlist.id} href={`/playlist/${playlist.id}`}>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-center px-2"
                      title={`${playlist.name} by ${playlist.owner} - ${playlist.songCount} songs`}
                    >
                      {playlist.coverArt && api ? (
                        <Image
                          src={api.getCoverArtUrl(playlist.coverArt, 32)}
                          alt={playlist.name}
                          width={16}
                          height={16}
                          className="rounded"
                        />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M21 15V6" />
                          <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                          <path d="M12 12H3" />
                          <path d="M16 6H3" />
                          <path d="M12 18H3" />
                        </svg>
                      )}
                    </Button>
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
