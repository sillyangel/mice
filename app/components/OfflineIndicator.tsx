'use client';

import React, { useState, useEffect } from 'react';
import { Download, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOfflineDownloads } from '@/hooks/use-offline-downloads';

interface OfflineIndicatorProps {
  id: string;
  type: 'album' | 'song';
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function OfflineIndicator({ 
  id, 
  type, 
  className, 
  showLabel = false,
  size = 'md' 
}: OfflineIndicatorProps) {
  const [isOffline, setIsOffline] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { checkOfflineStatus, isInitialized } = useOfflineDownloads();

  useEffect(() => {
    let mounted = true;

    const checkStatus = async () => {
      if (!isInitialized) return;

      setIsChecking(true);
      try {
        const status = await checkOfflineStatus(id, type);
        if (mounted) {
          setIsOffline(status);
        }
      } catch (error) {
        console.error('Failed to check offline status:', error);
        if (mounted) {
          setIsOffline(false);
        }
      } finally {
        if (mounted) {
          setIsChecking(false);
        }
      }
    };

    checkStatus();

    return () => {
      mounted = false;
    };
  }, [id, type, isInitialized, checkOfflineStatus]);

  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }[size];

  const textSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }[size];

  if (isChecking) {
    return (
      <div className={cn('flex items-center gap-1 text-muted-foreground', className)}>
        <Loader2 className={cn(iconSize, 'animate-spin')} />
        {showLabel && <span className={textSize}>Checking...</span>}
      </div>
    );
  }

  if (!isOffline) {
    return null; // Don't show anything if not downloaded
  }

  return (
    <div className={cn('flex items-center gap-1 text-green-600', className)}>
      <Download className={iconSize} />
      {showLabel && (
        <span className={textSize}>
          {type === 'album' ? 'Album Downloaded' : 'Downloaded'}
        </span>
      )}
    </div>
  );
}

interface DownloadButtonProps {
  id: string;
  type: 'album' | 'song';
  onDownload?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  children?: React.ReactNode;
}

export function DownloadButton({ 
  id, 
  type, 
  onDownload,
  className, 
  size = 'md',
  variant = 'outline',
  children 
}: DownloadButtonProps) {
  const [isOffline, setIsOffline] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { 
    checkOfflineStatus, 
    deleteOfflineContent, 
    isInitialized,
    downloadProgress 
  } = useOfflineDownloads();

  const isDownloading = downloadProgress.status === 'downloading' || downloadProgress.status === 'starting';

  useEffect(() => {
    let mounted = true;

    const checkStatus = async () => {
      if (!isInitialized) return;

      setIsChecking(true);
      try {
        const status = await checkOfflineStatus(id, type);
        if (mounted) {
          setIsOffline(status);
        }
      } catch (error) {
        console.error('Failed to check offline status:', error);
        if (mounted) {
          setIsOffline(false);
        }
      } finally {
        if (mounted) {
          setIsChecking(false);
        }
      }
    };

    checkStatus();

    return () => {
      mounted = false;
    };
  }, [id, type, isInitialized, checkOfflineStatus]);

  const handleClick = async () => {
    if (isOffline) {
      // Remove from offline storage
      try {
        await deleteOfflineContent(id, type);
        setIsOffline(false);
      } catch (error) {
        console.error('Failed to delete offline content:', error);
      }
    } else {
      // Start download
      if (onDownload) {
        onDownload();
      }
    }
  };

  const buttonSize = {
    sm: 'sm',
    md: 'default',
    lg: 'lg'
  }[size] as 'sm' | 'default' | 'lg';

  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }[size];

  if (isChecking) {
    return (
      <Button 
        variant={variant} 
        size={buttonSize}
        disabled
        className={className}
      >
        <Loader2 className={cn(iconSize, 'animate-spin mr-2')} />
        {children || 'Checking...'}
      </Button>
    );
  }

  return (
    <Button 
      variant={variant} 
      size={buttonSize}
      onClick={handleClick}
      disabled={isDownloading}
      className={className}
    >
      {isDownloading ? (
        <>
          <Loader2 className={cn(iconSize, 'animate-spin mr-2')} />
          {children || 'Downloading...'}
        </>
      ) : isOffline ? (
        <>
          <X className={cn(iconSize, 'mr-2')} />
          {children || 'Remove Download'}
        </>
      ) : (
        <>
          <Download className={cn(iconSize, 'mr-2')} />
          {children || 'Download'}
        </>
      )}
    </Button>
  );
}
