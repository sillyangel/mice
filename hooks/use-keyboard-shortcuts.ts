'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardShortcutsOptions {
  onPlayPause?: () => void;
  onNextTrack?: () => void;
  onPreviousTrack?: () => void;
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
  onToggleMute?: () => void;
  onSpotlightSearch?: () => void;
  disabled?: boolean;
}

export function useKeyboardShortcuts({
  onPlayPause,
  onNextTrack,
  onPreviousTrack,
  onVolumeUp,
  onVolumeDown,
  onToggleMute,
  onSpotlightSearch,
  disabled = false
}: KeyboardShortcutsOptions = {}) {
  const router = useRouter();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts if user is typing in an input field
    const target = event.target as HTMLElement;
    const isInputField = target.tagName === 'INPUT' || 
                        target.tagName === 'TEXTAREA' || 
                        target.contentEditable === 'true' ||
                        target.closest('[data-cmdk-input]'); // Command palette input

    if (disabled || isInputField) return;

    // Prevent default behavior for our shortcuts
    const preventDefault = () => {
      event.preventDefault();
      event.stopPropagation();
    };

    switch (event.key) {
      case ' ': // Space - Play/Pause
        if (onPlayPause) {
          preventDefault();
          onPlayPause();
        }
        break;

      case 'ArrowRight': // Right Arrow - Next Track
        if (onNextTrack) {
          preventDefault();
          onNextTrack();
        }
        break;

      case 'ArrowLeft': // Left Arrow - Previous Track
        if (onPreviousTrack) {
          preventDefault();
          onPreviousTrack();
        }
        break;

      case 'ArrowUp': // Up Arrow - Volume Up
        if (onVolumeUp) {
          preventDefault();
          onVolumeUp();
        }
        break;

      case 'ArrowDown': // Down Arrow - Volume Down
        if (onVolumeDown) {
          preventDefault();
          onVolumeDown();
        }
        break;

      case 'm': // M - Toggle Mute
      case 'M':
        if (onToggleMute) {
          preventDefault();
          onToggleMute();
        }
        break;

      case 'k': // Cmd+K or Ctrl+K - Spotlight Search
      case 'K':
        if ((event.metaKey || event.ctrlKey) && onSpotlightSearch) {
          preventDefault();
          onSpotlightSearch();
        }
        break;

      default:
        break;
    }
  }, [
    disabled,
    onPlayPause,
    onNextTrack,
    onPreviousTrack,
    onVolumeUp,
    onVolumeDown,
    onToggleMute,
    onSpotlightSearch,
    router
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    // Return any utility functions if needed
    isShortcutActive: !disabled
  };
}
