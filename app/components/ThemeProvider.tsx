'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'default' | 'blue' | 'violet' | 'red' | 'rose' | 'orange' | 'green' | 'yellow';
type Mode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  mode: Mode;
  setTheme: (theme: Theme) => void;
  setMode: (mode: Mode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('default');
  const [mode, setMode] = useState<Mode>('system');
  const [mounted, setMounted] = useState(false);

  // Load theme settings from localStorage on component mount
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    const savedMode = localStorage.getItem('theme-mode');
    const validThemes: Theme[] = ['default', 'blue', 'violet', 'red', 'rose', 'orange', 'green', 'yellow'];
    const validModes: Mode[] = ['light', 'dark', 'system'];
    
    if (savedTheme && validThemes.includes(savedTheme as Theme)) {
      setTheme(savedTheme as Theme);
    }
    
    if (savedMode && validModes.includes(savedMode as Mode)) {
      setMode(savedMode as Mode);
    }
  }, []);

  // Apply theme changes
  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('theme-default', 'theme-blue', 'theme-violet', 'theme-red', 'theme-rose', 'theme-orange', 'theme-green', 'theme-yellow', 'dark');
    
    // Add new theme class
    root.classList.add(`theme-${theme}`);
    
    // Apply dark/light mode
    const applyMode = () => {
      if (mode === 'dark') {
        root.classList.add('dark');
      } else if (mode === 'light') {
        root.classList.remove('dark');
      } else { // system
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        root.classList.toggle('dark', mediaQuery.matches);
      }
    };
    
    applyMode();
    
    // Listen for system preference changes only if mode is 'system'
    let mediaQuery: MediaQueryList | null = null;
    if (mode === 'system') {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', applyMode);
    }
    
    // Save settings to localStorage
    localStorage.setItem('theme', theme);
    localStorage.setItem('theme-mode', mode);
    
    // Cleanup listener
    return () => {
      if (mediaQuery) {
        mediaQuery.removeEventListener('change', applyMode);
      }
    };
  }, [theme, mode, mounted]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        mode,
        setTheme,
        setMode,
      }}
    >
      <div>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};
