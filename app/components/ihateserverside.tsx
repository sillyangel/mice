'use client';

import React, { useState, useEffect } from 'react';
import { Menu } from "@/app/components/menu";
import { Sidebar } from "@/app/components/sidebar";
import { useNavidrome } from "@/app/components/NavidromeContext";
import { AudioPlayer } from "./AudioPlayer";
import { Toaster } from "@/components/ui/toaster";
import { useFavoriteAlbums } from "@/hooks/use-favorite-albums";

interface IhateserversideProps {
  children: React.ReactNode;
}

const Ihateserverside: React.FC<IhateserversideProps> = ({ children }) => {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isStatusBarVisible, setIsStatusBarVisible] = useState(true);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { playlists } = useNavidrome();
  const { favoriteAlbums, removeFavoriteAlbum } = useFavoriteAlbums();

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
    const savedCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    const savedVisible = localStorage.getItem('sidebar-visible') !== 'false'; // Default to true
    setIsSidebarCollapsed(savedCollapsed);
    setIsSidebarVisible(savedVisible);
  }, []);

  const toggleSidebarCollapse = () => {
    const newCollapsed = !isSidebarCollapsed;
    setIsSidebarCollapsed(newCollapsed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', newCollapsed.toString());
    }
  };

  const toggleSidebarVisibility = () => {
    const newVisible = !isSidebarVisible;
    setIsSidebarVisible(newVisible);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-visible', newVisible.toString());
    }
  };

  const handleTransitionEnd = () => {
    if (!isSidebarVisible) {
      setIsSidebarHidden(true); // This will fully hide the sidebar after transition
    }
  };

  if (!isClient) {
    // Return a basic layout during SSR to match initial client render
    return (
      <div className="hidden md:flex md:flex-col md:h-screen md:w-screen md:overflow-hidden">
        {/* Top Menu */}
        <div
          className="sticky z-10 bg-background border-b w-full"
          style={{
            left: 'env(titlebar-area-x, 0)',
            top: 'env(titlebar-area-y, 0)',
          }}
        >
          <Menu
            toggleSidebar={toggleSidebarVisibility}
            isSidebarVisible={isSidebarVisible}
            toggleStatusBar={() => setIsStatusBarVisible(!isStatusBarVisible)}
            isStatusBarVisible={isStatusBarVisible}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden w-full">
          {isSidebarVisible && (
            <div className="w-16 shrink-0 border-r transition-all duration-200">
              <Sidebar
                playlists={playlists}
                className="h-full overflow-y-auto"
                visible={isSidebarVisible}
                favoriteAlbums={favoriteAlbums}
                onRemoveFavoriteAlbum={removeFavoriteAlbum}
              />
            </div>
          )}
          <div className="flex-1 overflow-y-auto min-w-0">
            <div>{children}</div>
          </div>
        </div>

        {/* Floating Audio Player */}
        <AudioPlayer />
        <Toaster />
      </div>
    );
  }
  
  return (
    <>
      {/* Mobile Layout */}
      <div className="flex md:hidden flex-col h-screen w-screen overflow-hidden">
        {/* Top Menu */}
        <div className="shrink-0 bg-background border-b w-full">
          <Menu
            toggleSidebar={toggleSidebarVisibility}
            isSidebarVisible={isSidebarVisible}
            toggleStatusBar={() => setIsStatusBarVisible(!isStatusBarVisible)}
            isStatusBarVisible={isStatusBarVisible}
          />
        </div>

        {/* Main Content Area with bottom padding for audio player */}
        <div className="flex-1 overflow-y-auto pb-24">
          <div>{children}</div>
        </div>

        {/* Mobile Audio Player - always visible on mobile */}
        <Toaster />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex md:flex-col md:h-screen md:w-screen md:overflow-hidden">
        {/* Top Menu */}
        <div
          className="sticky z-10 bg-background border-b w-full"
          style={{
            left: 'env(titlebar-area-x, 0)',
            top: 'env(titlebar-area-y, 0)',
          }}
        >
          <Menu
            toggleSidebar={toggleSidebarVisibility}
            isSidebarVisible={isSidebarVisible}
            toggleStatusBar={() => setIsStatusBarVisible(!isStatusBarVisible)}
            isStatusBarVisible={isStatusBarVisible}
          />
        </div>

        {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden w-full">
            {isSidebarVisible && (
              <div className="w-16 shrink-0 border-r transition-all duration-200">
                <Sidebar
                  playlists={playlists}
                  className="h-full overflow-y-auto"
                  visible={isSidebarVisible}
                  favoriteAlbums={favoriteAlbums}
                  onRemoveFavoriteAlbum={removeFavoriteAlbum}
                />
              </div>
            )}
            <div className="flex-1 overflow-y-auto min-w-0">
              <div>{children}</div>
            </div>
          </div>

        <Toaster />
      </div>
      
      {/* Single Shared Audio Player - shows on all layouts */}
      <AudioPlayer />
    </>
  );
};

export default Ihateserverside;