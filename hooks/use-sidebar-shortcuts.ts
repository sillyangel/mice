'use client';

import { useState, useEffect } from 'react';

export type SidebarShortcutType = 'playlists' | 'albums' | 'both';

export function useSidebarShortcuts() {
  const [shortcutType, setShortcutType] = useState<SidebarShortcutType>('both');

  useEffect(() => {
    // Load preference from localStorage
    const savedType = localStorage.getItem('sidebar-shortcut-type');
    if (savedType && ['playlists', 'albums', 'both'].includes(savedType)) {
      setShortcutType(savedType as SidebarShortcutType);
    }
  }, []);

  const updateShortcutType = (type: SidebarShortcutType) => {
    setShortcutType(type);
    localStorage.setItem('sidebar-shortcut-type', type);
  };

  return {
    shortcutType,
    updateShortcutType,
    showPlaylists: shortcutType === 'playlists' || shortcutType === 'both',
    showAlbums: shortcutType === 'albums' || shortcutType === 'both'
  };
}
