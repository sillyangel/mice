'use client';

import React, { useState } from 'react';
import { Menu } from "@/app/components/menu";
import { Sidebar } from "@/app/components/sidebar";
import { useNavidrome } from "@/app/components/NavidromeContext";
import { AudioPlayer } from "./AudioPlayer";
import { Toaster } from "@/components/ui/toaster"

interface IhateserversideProps {
  children: React.ReactNode;
}

const Ihateserverside: React.FC<IhateserversideProps> = ({ children }) => {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isStatusBarVisible, setIsStatusBarVisible] = useState(true);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });
  const { playlists } = useNavidrome();

  const toggleSidebarCollapse = () => {
    const newCollapsed = !isSidebarCollapsed;
    setIsSidebarCollapsed(newCollapsed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', newCollapsed.toString());
    }
  };

  const handleTransitionEnd = () => {
    if (!isSidebarVisible) {
      setIsSidebarHidden(true); // This will fully hide the sidebar after transition
    }
  };
  return (
    <div className="hidden md:flex md:flex-col md:h-screen">
      {/* Top Menu */}
      <div
        className="sticky z-10 bg-background border-b"
        style={{
          left: 'env(titlebar-area-x, 0)',
          top: 'env(titlebar-area-y, 0)',
        }}
      >
        <Menu
          toggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
          isSidebarVisible={isSidebarVisible}
          toggleStatusBar={() => setIsStatusBarVisible(!isStatusBarVisible)}
          isStatusBarVisible={isStatusBarVisible}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {isSidebarVisible && (
          <div className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} flex-shrink-0 border-r transition-all duration-200`}>
            <Sidebar
              playlists={playlists}
              className="h-full overflow-y-auto"
              collapsed={isSidebarCollapsed}
              onToggle={toggleSidebarCollapse}
              onTransitionEnd={handleTransitionEnd}
            />
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          <div>{children}</div>
        </div>
      </div>

      {/* Floating Audio Player */}
      {isStatusBarVisible && (
        <AudioPlayer />
      )}
      <Toaster />
    </div>
  );
};

export default Ihateserverside;