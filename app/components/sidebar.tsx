'use client';

import { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { usePathname } from 'next/navigation';
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import Link from "next/link";
import Image from "next/image";
import { Playlist } from "@/lib/navidrome";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavidrome } from "./NavidromeContext";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  playlists: Playlist[];
  collapsed?: boolean;
  onToggle?: () => void;
  visible?: boolean;
  favoriteAlbums?: Array<{id: string, name: string, artist: string, coverArt?: string}>;
  onRemoveFavoriteAlbum?: (albumId: string) => void;
}

export function Sidebar({ className, playlists, collapsed = false, onToggle, visible = true, favoriteAlbums = [], onRemoveFavoriteAlbum }: SidebarProps) {
  const pathname = usePathname();
  const { api } = useNavidrome();

  if (!visible) {
    return null;
  }
  
  // Define all routes and their active states
  const routes = {
    isRoot: pathname === "/",
    isBrowse: pathname === "/browse",
    isSearch: pathname === "/search",
    isQueue: pathname === "/queue",
    isRadio: pathname === "/radio",
    isPlaylists: pathname === "/library/playlists",
    isSongs: pathname === "/library/songs",
    isArtists: pathname === "/library/artists",
    isAlbums: pathname === "/library/albums",
    isHistory: pathname === "/history",
    isFavorites: pathname === "/favorites",
    isSettings: pathname === "/settings",
    // Handle dynamic routes
    isAlbumPage: pathname.startsWith("/album/"),
    isArtistPage: pathname.startsWith("/artist/"),
    isPlaylistPage: pathname.startsWith("/playlist/"),
    isNewPage: pathname === "/new",
  };

  // Helper function to determine if any sidebar route is active
  // This prevents highlights on pages not defined in sidebar
  const isAnySidebarRouteActive = Object.values(routes).some(Boolean);

  return (
    <div className={cn("pb-23 relative w-16", className)}>

      <div className="space-y-4 py-4 pt-6">
        <div className="px-3 py-2">
          <p className={cn("mb-2 px-4 text-lg font-semibold tracking-tight", collapsed && "sr-only")}>
            Navigation
          </p>
          <div className="space-y-1">
            {/* Search */}
            <Link href="/search">
              <Button 
                variant={routes.isSearch ? "secondary" : "ghost"} 
                className={cn("w-full justify-center px-2")}
                title="Search"
              >
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
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </Button>
            </Link>
            
            {/* Home */}
            <Link href="/">
              <Button 
                variant={routes.isRoot ? "secondary" : "ghost"} 
                className={cn("w-full justify-center px-2")}
                title="Home"
              >
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
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10 8 16 12 10 16 10 8" />
                </svg>
              </Button>
            </Link>
            
            {/* Queue */}
            <Link href="/queue">
              <Button 
                variant={routes.isQueue ? "secondary" : "ghost"} 
                className={cn("w-full justify-center px-2")}
                title="Queue"
              >
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
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              </Button>
            </Link>
            
            {/* Radio */}
            <Link href="/radio">
              <Button 
                variant={routes.isRadio ? "secondary" : "ghost"} 
                className={cn("w-full justify-center px-2")}
                title="Radio"
              >
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
                  <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
                  <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
                  <circle cx="12" cy="12" r="2"/>
                  <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
                  <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
                </svg>
              </Button>
            </Link>
            
            {/* Artists */}
            <Link href="/library/artists">
              <Button 
                variant={routes.isArtists ? "secondary" : "ghost"} 
                className={cn("w-full justify-center px-2")}
                title="Artists"
              >
                <svg 
                  className="h-4 w-4" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                >
                  <path d="m12 8-9.04 9.06a2.82 2.82 0 1 0 3.98 3.98L16 12" />
                  <circle cx="17" cy="7" r="5" />
                </svg>
              </Button>
            </Link>
            
            {/* Albums */}
            <Link href="/library/albums">
              <Button 
                variant={routes.isAlbums ? "secondary" : "ghost"} 
                className={cn("w-full justify-center px-2")}
                title="Albums"
              >
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
              </Button>
            </Link>
            
            {/* Playlists */}
            <Link href="/library/playlists">
              <Button 
                variant={routes.isPlaylists ? "secondary" : "ghost"} 
                className={cn("w-full justify-center px-2")}
                title="Playlists"
              >
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
              </Button>
            </Link>
            
            {/* Favorites */}
            <Link href="/favorites">
              <Button 
                variant={routes.isFavorites ? "secondary" : "ghost"} 
                className={cn("w-full justify-center px-2")}
                title="Favorites"
              >
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
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </Button>
            </Link>
          </div>
        </div>
        <div>
          <div className="px-3 py-0 pt-0">
            <p className={cn("mb-2 px-4 text-lg font-semibold tracking-tight sr-only")}>
              Library
            </p>
            <div className="space-y-1">
              {/* Browse */}
              <Link href="/browse">
                <Button 
                  variant={routes.isBrowse ? "secondary" : "ghost"} 
                  className={cn("w-full justify-center px-2")}
                  title="Browse"
                >
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
                    <rect width="7" height="7" x="3" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="14" rx="1" />
                    <rect width="7" height="7" x="3" y="14" rx="1" />
                  </svg>
                </Button>
              </Link>
              
              {/* Songs */}
              <Link href="/library/songs">
                <Button 
                  variant={routes.isSongs ? "secondary" : "ghost"} 
                  className={cn("w-full justify-center px-2")}
                  title="Songs"
                >
                  <svg 
                    className="h-4 w-4" 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <circle cx="8" cy="18" r="4" />
                    <path d="M12 18V2l7 4" />
                  </svg>
                </Button>
              </Link>
              
              {/* History */}
              <Link href="/history">
                <Button 
                  variant={routes.isHistory ? "secondary" : "ghost"} 
                  className={cn("w-full justify-center px-2")}
                  title="History"
                >
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
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10 5.52 0 10-4.48 10-10 0-5.52-4.48-10-10-10Z" />
                    <path d="M12 8v4l4 2" />
                  </svg>
                </Button>
              </Link>
              
              {/* Favorite Albums Section */}
              {favoriteAlbums.length > 0 && (
                <>
                  <div className="border-t my-2"></div>
                  {favoriteAlbums.slice(0, 5).map((album) => (
                    <ContextMenu key={album.id}>
                      <ContextMenuTrigger asChild>
                        <Link href={`/album/${album.id}`}>
                          <Button 
                            variant="ghost" 
                            className="w-full justify-center px-2"
                            title={`${album.name} - ${album.artist}`}
                          >
                            {album.coverArt ? (
                              <Image 
                                src={album.coverArt} 
                                alt={album.name} 
                                width={16} 
                                height={16} 
                                className="w-4 h-4 rounded" 
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
              
              {/* Playlists Section */}
              {playlists.length > 0 && (
                <>
                  <div className="border-t my-2"></div>
                  {playlists.slice(0, 5).map((playlist) => {
                    const playlistImageUrl = playlist.coverArt && api
                      ? api.getCoverArtUrl(playlist.coverArt, 32)
                      : '/play.png'; // fallback to a music icon
                    
                    return (
                      <Link key={playlist.id} href={`/playlist/${playlist.id}`}>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-center px-2 h-10"
                          title={`${playlist.name} by ${playlist.owner} - ${playlist.songCount} songs`}
                        >
                          <div className="w-6 h-6 rounded-sm overflow-hidden">
                            <Image
                              src={playlistImageUrl}
                              alt={playlist.name}
                              width={24}
                              height={24}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </Button>
                      </Link>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="px-3">
          <div className="space-y-0">
            <Link href="/settings">
              <Button 
                variant={routes.isSettings ? "secondary" : "ghost"} 
                className={cn("w-full justify-center px-2")}
                title="Settings"
              >
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
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
