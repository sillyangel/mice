'use client';

import { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { usePathname } from 'next/navigation';
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import Link from "next/link";
import { Playlist } from "@/lib/navidrome";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  playlists: Playlist[];
}

export function Sidebar({ className, playlists }: SidebarProps) {
  const isRoot = usePathname() === "/";
  const isBrowse = usePathname() === "/browse";
  const isAlbums = usePathname() === "/library/albums";
  const isArtists = usePathname() === "/library/artists";
  const isQueue = usePathname() === "/queue";
  const isHistory = usePathname() === "/history";
  const isSongs = usePathname() === "/library/songs";  const isPlaylists = usePathname() === "/library/playlists";

  return (
    <div className={cn("pb-6", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <p className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Discover
          </p>
          <div className="space-y-1">
            <Link href="/">
              <Button variant={isRoot ? "secondary" : "ghost"} className="w-full justify-start mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 h-4 w-4"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10 8 16 12 10 16 10 8" />
                </svg>
                Listen Now
              </Button>
            </Link>
            <Link href="/browse">
              <Button variant={isBrowse ? "secondary" : "ghost"} className="w-full justify-start mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 h-4 w-4"
                >
                  <rect width="7" height="7" x="3" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="14" rx="1" />
                  <rect width="7" height="7" x="3" y="14" rx="1" />
                </svg>
                Browse
              </Button>
            </Link>
            <Link href="/queue">
              <Button variant={isQueue ? "secondary" : "ghost"} className="w-full justify-start mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 h-4 w-4"
                >
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
                Queue
              </Button>
            </Link>
          </div>
        </div>
          <div>
            <div className="px-3 py-2">
              <p className="mb-2 px-4 text-lg font-semibold tracking-tight">
                Library
              </p>
              <div className="space-y-1">
                <Link href="/library/playlists">
                <Button variant={isPlaylists ? "secondary" : "ghost"} className="w-full justify-start mb-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2 h-4 w-4"
                  >
                    <path d="M21 15V6" />
                    <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                    <path d="M12 12H3" />
                    <path d="M16 6H3" />
                    <path d="M12 18H3" />
                  </svg>
                  Playlists
                </Button>
                </Link>
                <Link href="/library/songs">
                <Button variant={isSongs ? "secondary" : "ghost"} className="w-full justify-start mb-2">
                  <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="18" r="4" />
                    <path d="M12 18V2l7 4" />
                  </svg>
                  Songs
                </Button>
                </Link>
                <Link href="/library/artists">
                <Button variant={isArtists ? "secondary" : "ghost"} className="w-full justify-start mb-2">
                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" >
                      <path d="m12 8-9.04 9.06a2.82 2.82 0 1 0 3.98 3.98L16 12" />
                      <circle cx="17" cy="7" r="5" />
                    </svg>
                    Artists
                  </Button>
                </Link>
                <Link href="/library/albums">
                  <Button variant={isAlbums ? "secondary" : "ghost"} className="w-full justify-start mb-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2 h-4 w-4"
                    >
                      <path d="m16 6 4 14" />
                      <path d="M12 6v14" />
                      <path d="M8 8v12" />
                      <path d="M4 4v16" />
                    </svg>
                    Albums
                  </Button>
                </Link>
                <Link href="/history">
                  <Button variant={isHistory ? "secondary" : "ghost"} className="w-full justify-start mb-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2 h-4 w-4"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10 5.52 0 10-4.48 10-10 0-5.52-4.48-10-10-10Z" />
                      <path d="M12 8v4l4 2" />
                    </svg>
                    History
                  </Button>
                </Link>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
