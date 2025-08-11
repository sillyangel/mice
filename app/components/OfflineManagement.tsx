'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useOfflineLibrary } from '@/hooks/use-offline-library';
import { 
  Download, 
  Trash2, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Database, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Music,
  User,
  List,
  HardDrive
} from 'lucide-react';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(date: Date | null): string {
  if (!date) return 'Never';
  return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
}

export function OfflineManagement() {
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState(false);
  
  const {
    isInitialized,
    isOnline,
    isSyncing,
    lastSync,
    stats,
    syncProgress,
    syncLibraryFromServer,
    syncPendingOperations,
    clearOfflineData,
    refreshStats
  } = useOfflineLibrary();

  // Refresh stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (isInitialized && !isSyncing) {
        refreshStats();
      }
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [isInitialized, isSyncing, refreshStats]);

  const handleFullSync = async () => {
    try {
      await syncLibraryFromServer();
      toast({
        title: "Sync Complete",
        description: "Your music library has been synced for offline use.",
      });
    } catch (error) {
      console.error('Full sync failed:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync library. Check your connection and try again.",
        variant: "destructive"
      });
    }
  };

  const handlePendingSync = async () => {
    try {
      await syncPendingOperations();
      toast({
        title: "Pending Operations Synced",
        description: "All pending changes have been synced to the server.",
      });
    } catch (error) {
      console.error('Pending sync failed:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync pending operations. Will retry automatically when online.",
        variant: "destructive"
      });
    }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all offline data? This cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    try {
      await clearOfflineData();
      toast({
        title: "Offline Data Cleared",
        description: "All offline music data has been removed.",
      });
    } catch (error) {
      console.error('Clear data failed:', error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear offline data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsClearing(false);
    }
  };

  if (!isInitialized) {
    return (
      <Card className="mb-6 break-inside-avoid py-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Offline Library
          </CardTitle>
          <CardDescription>
            Setting up offline library...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
              <p className="text-muted-foreground">Initializing offline storage...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="mb-6 break-inside-avoid py-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={isOnline ? "default" : "destructive"}>
                {isOnline ? "Online" : "Offline"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {isOnline ? "Connected to Navidrome server" : "Working offline"}
              </span>
            </div>
            
            {stats.pendingOperations > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-yellow-600">
                  {stats.pendingOperations} pending operation{stats.pendingOperations !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Status */}
      <Card className="mb-6 break-inside-avoid py-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Library Sync
          </CardTitle>
          <CardDescription>
            Keep your offline library up to date
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSyncing && syncProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{syncProgress.stage}</span>
                <span>{syncProgress.current}%</span>
              </div>
              <Progress value={syncProgress.current} className="w-full" />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Last Sync</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(lastSync)}
              </p>
            </div>
            
            <div className="flex gap-2">
              {stats.pendingOperations > 0 && isOnline && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePendingSync}
                  disabled={isSyncing}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Sync Pending ({stats.pendingOperations})
                </Button>
              )}
              
              <Button
                onClick={handleFullSync}
                disabled={!isOnline || isSyncing}
                size="sm"
              >
                <Download className="h-4 w-4 mr-1" />
                {isSyncing ? 'Syncing...' : 'Full Sync'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Library Statistics */}
      <Card className="mb-6 break-inside-avoid py-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Offline Library Stats
          </CardTitle>
          <CardDescription>
            Your offline music collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center">
                <Music className="h-8 w-8 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.albums.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Albums</p>
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center">
                <User className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.artists.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Artists</p>
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center">
                <Music className="h-8 w-8 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.songs.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Songs</p>
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center">
                <List className="h-8 w-8 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.playlists.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Playlists</p>
              </div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm font-medium">Storage Used</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {formatBytes(stats.storageSize)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Offline Features */}
      <Card className="mb-6 break-inside-avoid py-5">
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>Offline Features</CardTitle>
          <CardDescription>
            What works when you&apos;re offline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Browse & Search</p>
                <p className="text-sm text-muted-foreground">
                  Browse your synced albums, artists, and search offline
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Favorites & Playlists</p>
                <p className="text-sm text-muted-foreground">
                  Star songs/albums and create playlists (syncs when online)
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Play Downloaded Music</p>
                <p className="text-sm text-muted-foreground">
                  Play songs you&apos;ve downloaded for offline listening
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Auto-Sync</p>
                <p className="text-sm text-muted-foreground">
                  Changes sync automatically when you reconnect
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="mb-6 break-inside-avoid py-5 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete all offline data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Clear All Offline Data</p>
              <p className="text-sm text-muted-foreground">
                This will remove all synced library data and downloaded audio
              </p>
            </div>
            
            <Button
              variant="destructive"
              onClick={handleClearData}
              disabled={isClearing}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {isClearing ? 'Clearing...' : 'Clear Data'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
