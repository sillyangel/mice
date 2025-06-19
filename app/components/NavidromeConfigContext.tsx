'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NavidromeConfig } from '@/lib/navidrome';

interface NavidromeConfigContextType {
  config: NavidromeConfig;
  updateConfig: (newConfig: NavidromeConfig) => void;
  isConnected: boolean;
  testConnection: (config: NavidromeConfig) => Promise<boolean>;
  clearConfig: () => void;
}

const NavidromeConfigContext = createContext<NavidromeConfigContextType | undefined>(undefined);

interface NavidromeConfigProviderProps {
  children: ReactNode;
}

export const NavidromeConfigProvider: React.FC<NavidromeConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<NavidromeConfig>({
    serverUrl: '',
    username: '',
    password: ''
  });
  const [isConnected, setIsConnected] = useState(false);

  // Load config from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedConfig = localStorage.getItem('navidrome-config');
      if (savedConfig) {
        try {
          const parsedConfig = JSON.parse(savedConfig);
          setConfig(parsedConfig);
        } catch (error) {
          console.error('Failed to parse saved Navidrome config:', error);
        }
      }
    }
  }, []);

  // Save config to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && config.serverUrl) {
      localStorage.setItem('navidrome-config', JSON.stringify(config));
    }
  }, [config]);

  const updateConfig = (newConfig: NavidromeConfig) => {
    setConfig(newConfig);
    setIsConnected(false);
  };

  const testConnection = async (testConfig: NavidromeConfig): Promise<boolean> => {
    try {
      // Import here to avoid server-side issues
      const { default: NavidromeAPI } = await import('@/lib/navidrome');
      const api = new NavidromeAPI(testConfig);
      const result = await api.ping();
      setIsConnected(result);
      return result;
    } catch (error) {
      console.error('Connection test failed:', error);
      setIsConnected(false);
      return false;
    }
  };

  const clearConfig = () => {
    setConfig({
      serverUrl: '',
      username: '',
      password: ''
    });
    setIsConnected(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('navidrome-config');
    }
  };

  return (
    <NavidromeConfigContext.Provider value={{
      config,
      updateConfig,
      isConnected,
      testConnection,
      clearConfig
    }}>
      {children}
    </NavidromeConfigContext.Provider>
  );
};

export const useNavidromeConfig = (): NavidromeConfigContextType => {
  const context = useContext(NavidromeConfigContext);
  if (context === undefined) {
    throw new Error('useNavidromeConfig must be used within a NavidromeConfigProvider');
  }
  return context;
};
