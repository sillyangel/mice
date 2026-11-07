'use client';

import React from 'react';
import { cn } from "@/lib/utils";
import { usePathname } from 'next/navigation';
import Link from "next/link";
import Image from "next/image";
import { Playlist } from "@/lib/navidrome";
import { 
  Search,
  Home,
  ListMusic,
  Radio,
  Users,
  Disc3,
  Library,
  Star,
  Music2,
  Settings,
} from "lucide-react";
import { useNavidrome } from "./NavidromeContext";
import { useRecentlyPlayedAlbums } from "@/hooks/use-recently-played-albums";
import { useSidebarShortcuts } from "@/hooks/use-sidebar-shortcuts";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";
import { useAudioPlayer } from "@/app/components/AudioPlayerContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

// Friendly, high-clarity icon mapping for sidebar items
const iconMap: Record<string, React.ReactNode> = {
  search: <Search className="w-5 h-5" />,
  home: <Home className="w-5 h-5" />,
  queue: <ListMusic className="w-5 h-5" />,
  radio: <Radio className="w-5 h-5" />,
  artists: <Users className="w-5 h-5" />,
  albums: <Disc3 className="w-5 h-5" />,
  playlists: <Library className="w-5 h-5" />,
  favorites: <Star className="w-5 h-5" />,
  songs: <Music2 className="w-5 h-5" />,
  settings: <Settings className="w-5 h-5" />,
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
  const { currentTrack, isMinimized } = useAudioPlayer();

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
    <TooltipProvider delayDuration={100}>
      <aside
        aria-label="Main Navigation"
        className={cn(
          "relative w-16 z-50 bg-background/85 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl mt-3 ml-3 mb-3 flex flex-col items-center py-3 select-none transition-[height] duration-300 ease-out overflow-hidden",
          className
        )}
        style={{
          height: !currentTrack
            ? 'calc(100% - 1.5rem)'
            : isMinimized
              ? 'calc(100% - 4.5rem)'
              : 'calc(100% - 7.25rem)',
        }}
      >
        {/* Brand App Logo at the top */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/"
              className="w-10 h-10 mb-2 rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 group relative"
            >
              <Image
                src="/icon-512.png"
                alt="mice"
                width={32}
                height={32}
                priority
                className="w-8 h-8 rounded-xl shadow-md group-hover:shadow-primary/30 transition-shadow"
              />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={14}>
            <span className="font-semibold">mice</span>
          </TooltipContent>
        </Tooltip>

        {/* Subtle pill divider */}
        <div className="w-6 h-px bg-white/10 mb-2 shrink-0" />

        {/* Navigation & Shortcut Items Container */}
        <div className="flex-1 w-full flex flex-col items-center gap-1.5 overflow-y-auto overflow-x-hidden px-2 py-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
          {/* Main Navigation Items */}
          {visibleItems.map((item) => {
            const isActive = isRouteActive(item.href);
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200 group",
                      isActive
                        ? "bg-white/15 text-white shadow-sm ring-1 ring-white/20"
                        : "text-muted-foreground hover:text-white hover:bg-white/[0.08] active:scale-95"
                    )}
                  >
                    {/* Active Left Indicator Dot/Pill */}
                    {isActive && (
                      <span className="absolute -left-2 w-1 h-3.5 rounded-full bg-primary shadow-sm shadow-primary/60" />
                    )}
                    {settings.showIcons && (iconMap[item.icon] || <div className="w-5 h-5" />)}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={14}>
                  <span>{item.label}</span>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Favorite Albums Shortcuts Section */}
          {(shortcutType === 'albums' || shortcutType === 'both') && favoriteAlbums.length > 0 && (
            <>
              <div className="w-6 h-px bg-white/10 my-2 shrink-0" />
              {favoriteAlbums.slice(0, 5).map((album) => (
                <ContextMenu key={album.id}>
                  <ContextMenuTrigger asChild>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={`/album/${album.id}`}
                          prefetch={false}
                          className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-white/[0.08] transition-all group"
                        >
                          {album.coverArt && api ? (
                            <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/10 group-hover:border-white/30 group-hover:scale-105 transition-all shadow-sm">
                              <Image
                                src={album.coverArt.startsWith('http') ? album.coverArt : api.getCoverArtUrl(album.coverArt, 96)}
                                alt={album.name}
                                width={28}
                                height={28}
                                className="w-full h-full object-cover"
                                decoding="async"
                              />
                            </div>
                          ) : (
                            <Disc3 className="w-5 h-5 text-muted-foreground group-hover:text-white" />
                          )}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={14} className="max-w-[220px]">
                        <p className="font-semibold text-xs truncate">{album.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{album.artist}</p>
                      </TooltipContent>
                    </Tooltip>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemoveFavoriteAlbum?.(album.id);
                      }}
                      className="text-destructive focus:text-destructive text-xs"
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
              <div className="w-6 h-px bg-white/10 my-2 shrink-0" />
              {recentAlbums.slice(0, 5).map((album) => (
                <Tooltip key={album.id}>
                  <TooltipTrigger asChild>
                    <Link
                      href={`/album/${album.id}`}
                      prefetch={false}
                      className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-white/[0.08] transition-all group"
                    >
                      {album.coverArt && api ? (
                        <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/10 opacity-75 group-hover:opacity-100 group-hover:scale-105 transition-all shadow-sm">
                          <Image
                            src={api.getCoverArtUrl(album.coverArt, 96)}
                            alt={album.name}
                            width={28}
                            height={28}
                            className="w-full h-full object-cover"
                            decoding="async"
                          />
                        </div>
                      ) : (
                        <Disc3 className="w-5 h-5 text-muted-foreground/60 group-hover:text-white" />
                      )}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={14} className="max-w-[220px]">
                    <p className="font-semibold text-xs truncate">{album.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{album.artist} (Recent)</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </>
          )}

          {/* Playlists Shortcuts Section */}
          {(shortcutType === 'playlists' || shortcutType === 'both') && playlists.length > 0 && (
            <>
              <div className="w-6 h-px bg-white/10 my-2 shrink-0" />
              {playlists.slice(0, 5).map((playlist) => (
                <Tooltip key={playlist.id}>
                  <TooltipTrigger asChild>
                    <Link
                      href={`/playlist/${playlist.id}`}
                      prefetch={false}
                      className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-white/[0.08] transition-all group"
                    >
                      {playlist.coverArt && api ? (
                        <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/10 group-hover:border-white/30 group-hover:scale-105 transition-all shadow-sm">
                          <Image
                            src={api.getCoverArtUrl(playlist.coverArt, 96)}
                            alt={playlist.name}
                            width={28}
                            height={28}
                            className="w-full h-full object-cover"
                            decoding="async"
                          />
                        </div>
                      ) : (
                        <Library className="w-5 h-5 text-muted-foreground group-hover:text-white" />
                      )}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={14} className="max-w-[220px]">
                    <p className="font-semibold text-xs truncate">{playlist.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{playlist.songCount || 0} songs</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
