'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Menu } from "@/app/components/menu";
import { Sidebar } from "@/app/components/sidebar";
import { useNavidrome } from "@/app/components/NavidromeContext";
import { AudioPlayer } from "./AudioPlayer";
import { BottomNavigation } from './BottomNavigation';
import { Toaster } from "@/components/ui/toaster";
import { useFavoriteAlbums } from "@/hooks/use-favorite-albums";

interface IhateserversideProps {
  children: React.ReactNode;
}

const Ihateserverside: React.FC<IhateserversideProps> = ({ children }) => {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isStatusBarVisible, setIsStatusBarVisible] = useState(true);
  const { playlists } = useNavidrome();
  const { favoriteAlbums, removeFavoriteAlbum } = useFavoriteAlbums();

  useEffect(() => {
    const savedVisible = localStorage.getItem('sidebar-visible') !== 'false';
    setIsSidebarVisible(savedVisible);
  }, []);

  const toggleSidebarVisibility = useCallback(() => {
    setIsSidebarVisible((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebar-visible', next.toString());
      }
      return next;
    });
  }, []);

  const toggleStatusBar = useCallback(() => {
    setIsStatusBarVisible((prev) => !prev);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* Top Menu / Window Controls Overlay Titlebar Area (single Menu instance) */}
      <div
        className="w-full shrink-0 bg-background border-b md:bg-transparent md:border-b-0 select-none md:titlebar-drag flex items-center justify-between"
        style={{ minHeight: 'env(titlebar-area-height, 0px)' }}
      >
        <div className="w-full md:w-auto titlebar-no-drag">
          <Menu
            toggleSidebar={toggleSidebarVisibility}
            isSidebarVisible={isSidebarVisible}
            toggleStatusBar={toggleStatusBar}
            isStatusBarVisible={isStatusBarVisible}
          />
        </div>
      </div>

      {/* Main Content Area — single {children} tree across all viewports */}
      <div className="flex-1 flex overflow-hidden w-full min-h-0">
        {isSidebarVisible && (
          <div className="hidden md:block w-16 shrink-0 h-full transition-all duration-200">
            <Sidebar
              playlists={playlists}
              className="overflow-y-auto"
              visible={isSidebarVisible}
              favoriteAlbums={favoriteAlbums}
              onRemoveFavoriteAlbum={removeFavoriteAlbum}
            />
          </div>
        )}
        <main className="flex-1 overflow-y-auto min-w-0 pb-40 md:pb-0">
          {children}
        </main>
      </div>

      {/* Bottom Navigation for Mobile only */}
      <div className="md:hidden">
        <BottomNavigation />
      </div>

      {/* Single Shared Audio Player & Toaster */}
      <AudioPlayer />
      <Toaster />
    </div>
  );
};

export default Ihateserverside;