'use client';

import { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { usePathname } from 'next/navigation';
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import Link from "next/link";
import { Playlist } from "@/lib/navidrome";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  playlists: Playlist[];
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ className, playlists, collapsed = false, onToggle }: SidebarProps) {
  const isRoot = usePathname() === "/";
  const isBrowse = usePathname() === "/browse";
  const isSearch = usePathname() === "/search";
  const isAlbums = usePathname() === "/library/albums";
  const isArtists = usePathname() === "/library/artists";
  const isQueue = usePathname() === "/queue";
  const isRadio = usePathname() === "/radio";
  const isHistory = usePathname() === "/history";
  const isSongs = usePathname() === "/library/songs";
  const isPlaylists = usePathname() === "/library/playlists";
  const isFavorites = usePathname() === "/favorites";
  const isNew = usePathname() === "/new";

  return (
    <div className={cn("pb-6 relative", className)}>
      {/* Collapse/Expand Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="absolute top-2 right-2 z-10 h-6 w-6 p-0"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <p className={cn("mb-2 px-4 text-lg font-semibold tracking-tight", collapsed && "sr-only")}>
            Discover
          </p>
          <div className="space-y-1">
            <Link href="/">
              <Button 
                variant={isRoot ? "secondary" : "ghost"} 
                className={cn("w-full justify-start mb-2", collapsed && "justify-center px-2")}
                title={collapsed ? "Listen Now" : undefined}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn("h-4 w-4", !collapsed && "mr-2")}
                >
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10 8 16 12 10 16 10 8" />
                </svg>
                {!collapsed && "Listen Now"}
              </Button>
            </Link>
            <Link href="/browse">
              <Button 
                variant={isBrowse ? "secondary" : "ghost"} 
                className={cn("w-full justify-start mb-2", collapsed && "justify-center px-2")}
                title={collapsed ? "Browse" : undefined}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn("h-4 w-4", !collapsed && "mr-2")}
                >
                  <rect width="7" height="7" x="3" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="14" rx="1" />
                  <rect width="7" height="7" x="3" y="14" rx="1" />
                </svg>
                {!collapsed && "Browse"}
              </Button>
            </Link>
            <Link href="/search">
              <Button 
                variant={isSearch ? "secondary" : "ghost"} 
                className={cn("w-full justify-start mb-2", collapsed && "justify-center px-2")}
                title={collapsed ? "Search" : undefined}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn("h-4 w-4", !collapsed && "mr-2")}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                {!collapsed && "Search"}
              </Button>
            </Link>
            <Link href="/queue">
              <Button 
                variant={isQueue ? "secondary" : "ghost"} 
                className={cn("w-full justify-start mb-2", collapsed && "justify-center px-2")}
                title={collapsed ? "Queue" : undefined}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn("h-4 w-4", !collapsed && "mr-2")}
                >
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
                {!collapsed && "Queue"}
              </Button>
            </Link>
            <Link href="/radio">
              <Button 
                variant={isRadio ? "secondary" : "ghost"} 
                className={cn("w-full justify-start mb-2", collapsed && "justify-center px-2")}
                title={collapsed ? "Radio" : undefined}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn("h-4 w-4", !collapsed && "mr-2")}
                >
                  <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
                  <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
                  <circle cx="12" cy="12" r="2"/>
                  <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
                  <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
                </svg>
                {!collapsed && "Radio"}
              </Button>
            </Link>
          </div>
        </div>
          <div>
            <div className="px-3 py-2">
              <p className={cn("mb-2 px-4 text-lg font-semibold tracking-tight", collapsed && "sr-only")}>
                Library
              </p>
              <div className="space-y-1">
                <Link href="/library/playlists">
                <Button 
                  variant={isPlaylists ? "secondary" : "ghost"} 
                  className={cn("w-full justify-start mb-1", collapsed && "justify-center px-2")}
                  title={collapsed ? "Playlists" : undefined}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn("h-4 w-4", !collapsed && "mr-2")}
                  >
                    <path d="M21 15V6" />
                    <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                    <path d="M12 12H3" />
                    <path d="M16 6H3" />
                    <path d="M12 18H3" />
                  </svg>
                  {!collapsed && "Playlists"}
                </Button>
                </Link>
                <Link href="/library/songs">
                <Button 
                  variant={isSongs ? "secondary" : "ghost"} 
                  className={cn("w-full justify-start mb-2", collapsed && "justify-center px-2")}
                  title={collapsed ? "Songs" : undefined}
                >
                  <svg 
                    className={cn("h-4 w-4", !collapsed && "mr-2")} 
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
                  {!collapsed && "Songs"}
                </Button>
                </Link>
                <Link href="/library/artists">
                <Button 
                  variant={isArtists ? "secondary" : "ghost"} 
                  className={cn("w-full justify-start mb-2", collapsed && "justify-center px-2")}
                  title={collapsed ? "Artists" : undefined}
                >
                <svg 
                  className={cn("h-4 w-4", !collapsed && "mr-2")} 
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
                    {!collapsed && "Artists"}
                  </Button>
                </Link>
                <Link href="/library/albums">
                  <Button 
                    variant={isAlbums ? "secondary" : "ghost"} 
                    className={cn("w-full justify-start mb-2", collapsed && "justify-center px-2")}
                    title={collapsed ? "Albums" : undefined}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={cn("h-4 w-4", !collapsed && "mr-2")}
                    >
                      <path d="m16 6 4 14" />
                      <path d="M12 6v14" />
                      <path d="M8 8v12" />
                      <path d="M4 4v16" />
                    </svg>
                    {!collapsed && "Albums"}
                  </Button>
                </Link>
                <Link href="/history">
                  <Button 
                    variant={isHistory ? "secondary" : "ghost"} 
                    className={cn("w-full justify-start mb-2", collapsed && "justify-center px-2")}
                    title={collapsed ? "History" : undefined}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={cn("h-4 w-4", !collapsed && "mr-2")}
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10 5.52 0 10-4.48 10-10 0-5.52-4.48-10-10-10Z" />
                      <path d="M12 8v4l4 2" />
                    </svg>
                    {!collapsed && "History"}
                  </Button>
                </Link>
                <Link href="/favorites">
                  <Button 
                    variant={isFavorites ? "secondary" : "ghost"} 
                    className={cn("w-full justify-start mb-2", collapsed && "justify-center px-2")}
                    title={collapsed ? "Favorites" : undefined}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={cn("h-4 w-4", !collapsed && "mr-2")}
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    {!collapsed && "Favorites"}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
