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
}

export interface SidebarLayoutSettings {
  items: SidebarItem[];
  shortcuts: 'albums' | 'playlists' | 'both';
  showIcons: boolean;
}

const defaultSidebarItems: SidebarItem[] = [
  { id: 'search', label: 'Search', visible: true, icon: 'search' },
  { id: 'home', label: 'Home', visible: true, icon: 'home' },
  { id: 'queue', label: 'Queue', visible: true, icon: 'queue' },
  { id: 'radio', label: 'Radio', visible: true, icon: 'radio' },
  { id: 'artists', label: 'Artists', visible: true, icon: 'artists' },
  { id: 'albums', label: 'Albums', visible: true, icon: 'albums' },
  { id: 'playlists', label: 'Playlists', visible: true, icon: 'playlists' },
  { id: 'favorites', label: 'Favorites', visible: true, icon: 'favorites' },
  { id: 'browse', label: 'Browse', visible: true, icon: 'browse' },
  { id: 'songs', label: 'Songs', visible: true, icon: 'songs' },
  { id: 'history', label: 'History', visible: true, icon: 'history' },
  { id: 'settings', label: 'Settings', visible: true, icon: 'settings' },
];

const defaultSettings: SidebarLayoutSettings = {
  items: defaultSidebarItems,
  shortcuts: 'both',
  showIcons: true,
};

export function useSidebarLayout() {
  const [settings, setSettings] = useState<SidebarLayoutSettings>(defaultSettings);

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
        
        setSettings({
          items: mergedItems,
          shortcuts: parsed.shortcuts || defaultSettings.shortcuts,
          showIcons: parsed.showIcons !== undefined ? parsed.showIcons : defaultSettings.showIcons,
        });
      } catch (error) {
        console.error('Failed to parse sidebar layout settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('sidebar-layout-settings', JSON.stringify(settings));
  }, [settings]);

  const updateItemOrder = (newItems: SidebarItem[]) => {
    setSettings(prev => ({ ...prev, items: newItems }));
  };

  const toggleItemVisibility = (itemId: SidebarItemType) => {
    setSettings(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, visible: !item.visible } : item
      ),
    }));
  };

  const updateShortcuts = (shortcuts: 'albums' | 'playlists' | 'both') => {
    setSettings(prev => ({ ...prev, shortcuts }));
  };

  const updateShowIcons = (showIcons: boolean) => {
    setSettings(prev => ({ ...prev, showIcons }));
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

  const resetToDefaults = () => {
    setSettings(defaultSettings);
  };

  return {
    settings,
    updateItemOrder,
    toggleItemVisibility,
    updateShortcuts,
    updateShowIcons,
    exportSettings,
    importSettings,
    resetToDefaults,
  };
}
