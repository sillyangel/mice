'use client';

import { useState, useEffect } from 'react';

export type SidebarItemType = 
  | 'search' 
  | 'home' 
  | 'queue' 
  | 'radio' 
  | 'artists' 
  | 'albums' 
  | 'playlists' 
  | 'favorites'
  | 'browse'
  | 'songs'
  | 'history'
  | 'settings';

export interface SidebarItem {
  id: SidebarItemType;
  label: string;
  visible: boolean;
  icon: string; // We'll use this for icon identification
  href: string; // Navigation path
}

export interface SidebarLayoutSettings {
  items: SidebarItem[];
  shortcuts: 'albums' | 'playlists' | 'both';
  showIcons: boolean;
}

const defaultSidebarItems: SidebarItem[] = [
  { id: 'search', label: 'Search', visible: true, icon: 'search', href: '/search' },
  { id: 'home', label: 'Home', visible: true, icon: 'home', href: '/' },
  { id: 'queue', label: 'Queue', visible: true, icon: 'queue', href: '/queue' },
  { id: 'radio', label: 'Radio', visible: true, icon: 'radio', href: '/radio' },
  { id: 'artists', label: 'Artists', visible: true, icon: 'artists', href: '/library/artists' },
  { id: 'albums', label: 'Albums', visible: true, icon: 'albums', href: '/library/albums' },
  { id: 'playlists', label: 'Playlists', visible: true, icon: 'playlists', href: '/library/playlists' },
  { id: 'favorites', label: 'Favorites', visible: true, icon: 'favorites', href: '/favorites' },
  { id: 'browse', label: 'Browse', visible: true, icon: 'browse', href: '/browse' },
  { id: 'songs', label: 'Songs', visible: true, icon: 'songs', href: '/library/songs' },
  { id: 'history', label: 'History', visible: true, icon: 'history', href: '/history' },
  { id: 'settings', label: 'Settings', visible: true, icon: 'settings', href: '/settings' },
];

const defaultSettings: SidebarLayoutSettings = {
  items: defaultSidebarItems,
  shortcuts: 'both',
  showIcons: true,
};

export function useSidebarLayout() {
  const [settings, setSettings] = useState<SidebarLayoutSettings>(defaultSettings);
  const [pendingSettings, setPendingSettings] = useState<SidebarLayoutSettings | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-layout-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure all items are present
        const mergedItems = defaultSidebarItems.map(defaultItem => {
          const savedItem = parsed.items?.find((item: SidebarItem) => item.id === defaultItem.id);
          return savedItem ? { ...defaultItem, ...savedItem } : defaultItem;
        });
        
        const loadedSettings = {
          items: mergedItems,
          shortcuts: parsed.shortcuts || defaultSettings.shortcuts,
          showIcons: parsed.showIcons !== undefined ? parsed.showIcons : defaultSettings.showIcons,
        };
        setSettings(loadedSettings);
      } catch (error) {
        console.error('Failed to parse sidebar layout settings:', error);
      }
    }
  }, []);

  const saveSettings = (newSettings: SidebarLayoutSettings) => {
    setSettings(newSettings);
    setPendingSettings(null);
    localStorage.setItem('sidebar-layout-settings', JSON.stringify(newSettings));
  };

  const updatePendingSettings = (newSettings: SidebarLayoutSettings) => {
    setPendingSettings(newSettings);
  };

  const getCurrentSettings = () => pendingSettings || settings;

  const hasUnsavedChanges = () => pendingSettings !== null;

  const reorderItems = (activeId: string, overId: string) => {
    const currentSettings = getCurrentSettings();
    const activeIndex = currentSettings.items.findIndex(item => item.id === activeId);
    const overIndex = currentSettings.items.findIndex(item => item.id === overId);

    if (activeIndex !== -1 && overIndex !== -1) {
      const newItems = [...currentSettings.items];
      const [removed] = newItems.splice(activeIndex, 1);
      newItems.splice(overIndex, 0, removed);

      const newSettings = { ...currentSettings, items: newItems };
      updatePendingSettings(newSettings);
    }
  };

  const updateItemOrder = (newItems: SidebarItem[]) => {
    const currentSettings = getCurrentSettings();
    const newSettings = { ...currentSettings, items: newItems };
    updatePendingSettings(newSettings);
  };

  const toggleItemVisibility = (itemId: SidebarItemType) => {
    const currentSettings = getCurrentSettings();
    const newItems = currentSettings.items.map(item =>
      item.id === itemId ? { ...item, visible: !item.visible } : item
    );
    const newSettings = { ...currentSettings, items: newItems };
    updatePendingSettings(newSettings);
  };

  const updateShortcuts = (shortcuts: 'albums' | 'playlists' | 'both') => {
    const currentSettings = getCurrentSettings();
    const newSettings = { ...currentSettings, shortcuts };
    updatePendingSettings(newSettings);
  };

  const updateShowIcons = (showIcons: boolean) => {
    const currentSettings = getCurrentSettings();
    const newSettings = { ...currentSettings, showIcons };
    updatePendingSettings(newSettings);
  };

  const applyChanges = () => {
    if (pendingSettings) {
      saveSettings(pendingSettings);
    }
  };

  const discardChanges = () => {
    setPendingSettings(null);
  };

  const resetToDefaults = () => {
    saveSettings(defaultSettings);
  };

  const exportSettings = () => {
    const allSettings = {
      sidebarLayout: settings,
      sidebarVisible: localStorage.getItem('sidebar-visible'),
      theme: localStorage.getItem('theme'),
      // Add other settings as needed
    };
    
    const blob = new Blob([JSON.stringify(allSettings, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stillnavidrome-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importSettings = (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          
          if (imported.sidebarLayout) {
            const mergedItems = defaultSidebarItems.map(defaultItem => {
              const importedItem = imported.sidebarLayout.items?.find(
                (item: SidebarItem) => item.id === defaultItem.id
              );
              return importedItem ? { ...defaultItem, ...importedItem } : defaultItem;
            });
            
            setSettings({
              items: mergedItems,
              shortcuts: imported.sidebarLayout.shortcuts || defaultSettings.shortcuts,
              showIcons: imported.sidebarLayout.showIcons !== undefined 
                ? imported.sidebarLayout.showIcons 
                : defaultSettings.showIcons,
            });
          }
          
          if (imported.sidebarVisible !== undefined) {
            localStorage.setItem('sidebar-visible', imported.sidebarVisible);
          }
          
          if (imported.theme) {
            localStorage.setItem('theme', imported.theme);
          }
          
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  return {
    settings: getCurrentSettings(),
    hasUnsavedChanges,
    updateItemOrder,
    reorderItems,
    toggleItemVisibility,
    updateShortcuts,
    updateShowIcons,
    applyChanges,
    discardChanges,
    exportSettings,
    importSettings,
    resetToDefaults,
  };
}
