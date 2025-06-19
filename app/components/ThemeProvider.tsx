'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'blue' | 'violet';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
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
  const [theme, setTheme] = useState<Theme>('blue');
  const [mounted, setMounted] = useState(false);

  // Load theme settings from localStorage on component mount
  useEffect(() => {
    setMounted(true);
    
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    
    if (savedTheme && (savedTheme === 'blue' || savedTheme === 'violet')) {
      setTheme(savedTheme);
    }
  }, []);

  // Apply theme changes
  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('theme-blue', 'theme-violet', 'dark');
    
    // Add new theme class
    root.classList.add(`theme-${theme}`);
    
    // Always follow system preference for dark mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = () => {
      root.classList.toggle('dark', mediaQuery.matches);
    };
    
    applySystemTheme();
    mediaQuery.addEventListener('change', applySystemTheme);
    
    // Save theme to localStorage
    localStorage.setItem('theme', theme);
    
    // Cleanup listener
    return () => mediaQuery.removeEventListener('change', applySystemTheme);
  }, [theme, mounted]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
      }}
    >
      <div className={`theme-${theme}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};
