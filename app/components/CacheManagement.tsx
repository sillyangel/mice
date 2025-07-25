'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Database,
  Trash2,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { CacheManager } from '@/lib/cache';

export function CacheManagement() {
  const [cacheStats, setCacheStats] = useState({
    total: 0,
    expired: 0,
    size: '0 B'
  });
  const [isClearing, setIsClearing] = useState(false);
  const [lastCleared, setLastCleared] = useState<string | null>(null);

  const loadCacheStats = () => {
    if (typeof window === 'undefined') return;
    
    let total = 0;
    let expired = 0;
    let totalSize = 0;
    const now = Date.now();

    // Check localStorage for cache entries
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('cache-') || key.startsWith('navidrome-cache-') || key.startsWith('library-cache-'))) {
        total++;
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
          try {
            const parsed = JSON.parse(value);
            if (parsed.expiresAt && now > parsed.expiresAt) {
              expired++;
            }
          } catch (error) {
            expired++;
          }
        }
      }
    }

    // Convert bytes to human readable format
    const formatSize = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    setCacheStats({
      total,
      expired,
      size: formatSize(totalSize * 2) // *2 for UTF-16 encoding
    });
  };

  useEffect(() => {
    loadCacheStats();
    
    // Check if there's a last cleared timestamp
    const lastClearedTime = localStorage.getItem('cache-last-cleared');
    if (lastClearedTime) {
      setLastCleared(new Date(parseInt(lastClearedTime)).toLocaleString());
    }
  }, []);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      // Clear all cache using the CacheManager
      CacheManager.clearAll();
      
      // Also clear any other cache-related localStorage items
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('cache-') || 
              key.startsWith('navidrome-cache-') || 
              key.startsWith('library-cache-') ||
              key.includes('album') ||
              key.includes('artist') ||
              key.includes('song')) {
            localStorage.removeItem(key);
          }
        });
        
        // Set last cleared timestamp
        localStorage.setItem('cache-last-cleared', Date.now().toString());
      }
      
      // Update stats
      loadCacheStats();
      setLastCleared(new Date().toLocaleString());
      
      // Show success feedback
      setTimeout(() => {
        setIsClearing(false);
      }, 1000);
      
    } catch (error) {
      console.error('Failed to clear cache:', error);
      setIsClearing(false);
    }
  };

  const handleCleanExpired = () => {
    if (typeof window === 'undefined') return;
    
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('cache-') || key.startsWith('navidrome-cache-') || key.startsWith('library-cache-'))) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            if (parsed.expiresAt && now > parsed.expiresAt) {
              keysToRemove.push(key);
            }
          }
        } catch (error) {
          // Invalid cache item, remove it
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    loadCacheStats();
  };

  return (
    <Card className="break-inside-avoid py-5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Cache Management
        </CardTitle>
        <CardDescription>
          Manage application cache to improve performance and free up storage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cache Statistics */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-2xl font-bold">{cacheStats.total}</p>
            <p className="text-xs text-muted-foreground">Total Items</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{cacheStats.expired}</p>
            <p className="text-xs text-muted-foreground">Expired</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{cacheStats.size}</p>
            <p className="text-xs text-muted-foreground">Storage Used</p>
          </div>
        </div>

        {/* Cache Actions */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              onClick={handleClearCache}
              disabled={isClearing}
              variant="destructive"
              size="sm"
              className="flex-1"
            >
              {isClearing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {isClearing ? 'Clearing...' : 'Clear All Cache'}
            </Button>
            
            <Button
              onClick={handleCleanExpired}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <HardDrive className="h-4 w-4 mr-2" />
              Clean Expired
            </Button>
          </div>
          
          <Button
            onClick={loadCacheStats}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Stats
          </Button>
        </div>

        {/* Cache Info */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Cache includes albums, artists, songs, and image URLs to improve loading times.</p>
          {lastCleared && (
            <p>Last cleared: {lastCleared}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
