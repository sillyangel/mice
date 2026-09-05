'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Lazy-load the spotlight search overlay until it's first opened
const SpotlightSearch = dynamic(
  () => import('./SpotlightSearch').then((mod) => mod.SpotlightSearch),
  { ssr: false, loading: () => null }
);

interface GlobalSearchContextProps {
  isSpotlightOpen: boolean;
  openSpotlight: () => void;
  closeSpotlight: () => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextProps | undefined>(undefined);

export function GlobalSearchProvider({ children }: { children: React.ReactNode }) {
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);

  const openSpotlight = useCallback(() => {
    setIsSpotlightOpen(true);
  }, []);

  const closeSpotlight = useCallback(() => {
    setIsSpotlightOpen(false);
  }, []);

  return (
    <GlobalSearchContext.Provider value={{
      isSpotlightOpen,
      openSpotlight,
      closeSpotlight
    }}>
      {children}
      <SpotlightSearch 
        isOpen={isSpotlightOpen} 
        onClose={closeSpotlight} 
      />
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalSearch() {
  const context = useContext(GlobalSearchContext);
  if (!context) {
    throw new Error('useGlobalSearch must be used within a GlobalSearchProvider');
  }
  return context;
}
