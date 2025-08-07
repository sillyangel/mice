'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useOfflineLibrary } from '@/hooks/use-offline-library';
import { Wifi, WifiOff, Download, Clock } from 'lucide-react';

export function OfflineStatusIndicator() {
  const { isOnline, stats, isSyncing, lastSync } = useOfflineLibrary();

  if (!isOnline) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <WifiOff size={12} />
        Offline Mode
      </Badge>
    );
  }

  if (isSyncing) {
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <Download size={12} className="animate-bounce" />
        Syncing...
      </Badge>
    );
  }

  if (stats.pendingOperations > 0) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Clock size={12} />
        {stats.pendingOperations} pending
      </Badge>
    );
  }

  return (
    <Badge variant="default" className="flex items-center gap-1">
      <Wifi size={12} />
      Online
    </Badge>
  );
}

export function OfflineLibraryStats() {
  const { stats, lastSync } = useOfflineLibrary();

  if (!stats.albums && !stats.songs && !stats.artists) {
    return null;
  }

  return (
    <div className="text-xs text-muted-foreground space-y-1">
      <div>
        📀 {stats.albums} albums • 🎵 {stats.songs} songs • 👤 {stats.artists} artists
      </div>
      {lastSync && (
        <div>
          Last sync: {lastSync.toLocaleDateString()} at {lastSync.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
