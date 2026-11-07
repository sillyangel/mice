"use client";

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAudioPlayer, useAudioQueue } from '@/app/components/AudioPlayerContext';
import { Progress } from '@/components/ui/progress';
import { lrcLibClient } from '@/lib/lrclib';
import { getNavidromeAPI } from '@/lib/navidrome';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useGlobalSearch } from './GlobalSearchProvider';
import { AudioSettingsDialog } from './AudioSettingsDialog';
import {
  DEFAULT_MESH_PALETTE,
  extractMeshPalette,
  getCachedMeshPalette,
  type MeshPalette,
} from '@/lib/image-utils';
import { 
  FaPlay, 
  FaPause, 
  FaVolumeHigh, 
  FaForward, 
  FaBackward, 
  FaVolumeXmark,
  FaShuffle,
  FaRepeat,
  FaXmark,
  FaQuoteLeft,
  FaListUl,
  FaSliders
} from "react-icons/fa6";
import { Star } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LyricLine {
  time: number;
  text: string;
}

export interface LyricSyllable {
  text: string;
  isPartOfWord?: boolean;
  startTime: number;
  endTime: number;
}

interface LyricDisplayItem {
  id: string;
  time: number;
  endTime?: number;
  text: string;
  isInterlude: boolean;
  syllables?: LyricSyllable[];
}

function buildAppleLyricsFromSpicy(content: any[]): LyricDisplayItem[] {
  if (!Array.isArray(content) || !content.length) return [];
  const items: LyricDisplayItem[] = [];

  const firstVocal = content.find(
    (c) => c?.Type === 'Vocal' && c?.Lead?.Syllables && c.Lead.Syllables.length > 0
  );
  const firstStartTime = firstVocal?.StartTime ?? firstVocal?.Lead?.StartTime ?? 0;

  if (firstStartTime >= 2.5) {
    items.push({
      id: 'interlude-intro',
      time: 0,
      endTime: firstStartTime,
      text: '',
      isInterlude: true,
    });
  }

  for (let i = 0; i < content.length; i++) {
    const item = content[i];
    if (item?.Type !== 'Vocal' || !item?.Lead?.Syllables?.length) continue;

    const syllables: LyricSyllable[] = item.Lead.Syllables.map((s: any) => ({
      text: s.Text || '',
      isPartOfWord: !!s.IsPartOfWord,
      startTime: s.StartTime ?? 0,
      endTime: s.EndTime ?? s.StartTime ?? 0,
    }));

    const lineText = syllables.map((s) => s.text).join('').trim();
    if (!lineText) continue;

    const startTime = item.StartTime ?? item.Lead?.StartTime ?? syllables[0]?.startTime ?? 0;
    const endTime = item.EndTime ?? item.Lead?.EndTime ?? syllables[syllables.length - 1]?.endTime ?? startTime;

    // Check if there is an interlude before this line
    const prevItem = items[items.length - 1];
    if (prevItem && !prevItem.isInterlude && prevItem.endTime !== undefined) {
      if (startTime - prevItem.endTime >= 4.5) {
        items.push({
          id: `interlude-${i}-${prevItem.endTime}`,
          time: prevItem.endTime,
          endTime: startTime,
          text: '',
          isInterlude: true,
        });
      }
    }

    items.push({
      id: `spicy-lyric-${i}-${startTime}`,
      time: startTime,
      endTime: endTime,
      text: lineText,
      isInterlude: false,
      syllables,
    });
  }

  return items;
}

const INSTRUMENTAL_PATTERNS = new Set([
  '',
  '♪',
  '♫',
  '♬',
  '...',
  '•••',
  '[instrumental]',
  '(instrumental)',
  '[music]',
  '(music)',
]);

function isInstrumentalLine(text: string): boolean {
  return INSTRUMENTAL_PATTERNS.has(text.trim().toLowerCase());
}

function buildAppleLyrics(rawLines: LyricLine[]): LyricDisplayItem[] {
  if (!rawLines.length) return [];
  const sorted = [...rawLines].sort((a, b) => a.time - b.time);

  // Collapse consecutive empty/instrumental markers so LRC end-of-line tags stay clean
  const collapsed: LyricLine[] = [];
  for (const line of sorted) {
    const prev = collapsed[collapsed.length - 1];
    if (prev && isInstrumentalLine(prev.text) && isInstrumentalLine(line.text)) {
      continue;
    }
    collapsed.push({ time: Math.max(0, line.time), text: line.text.trim() });
  }

  const firstVocal = collapsed.find((l) => !isInstrumentalLine(l.text));
  if (!firstVocal) return [];

  const items: LyricDisplayItem[] = [];

  // Apple Music intro three-dot indicator when vocals begin after an instrumental intro
  if (firstVocal.time >= 2.5) {
    items.push({
      id: 'interlude-intro',
      time: 0,
      endTime: firstVocal.time,
      text: '',
      isInterlude: true,
    });
  }

  for (let i = 0; i < collapsed.length; i++) {
    const current = collapsed[i];
    if (current.time < firstVocal.time && isInstrumentalLine(current.text)) {
      continue;
    }

    if (!isInstrumentalLine(current.text)) {
      items.push({
        id: `lyric-${i}-${current.time}`,
        time: current.time,
        text: current.text,
        isInterlude: false,
      });
    } else {
      // Find next vocal line to decide if this is a real instrumental break or a brief breath
      let nextVocal: LyricLine | undefined;
      for (let j = i + 1; j < collapsed.length; j++) {
        if (!isInstrumentalLine(collapsed[j].text)) {
          nextVocal = collapsed[j];
          break;
        }
      }

      const prevItem = items[items.length - 1];
      if (prevItem && !prevItem.isInterlude && prevItem.endTime === undefined) {
        prevItem.endTime = current.time;
      }

      if (nextVocal && nextVocal.time - current.time >= 4.5) {
        items.push({
          id: `interlude-${i}-${current.time}`,
          time: current.time,
          endTime: nextVocal.time,
          text: '',
          isInterlude: true,
        });
      }
    }
  }

  return items;
}

function getActiveAppleLyricIndex(items: LyricDisplayItem[], currentTime: number): number {
  if (!items.length) return -1;
  for (let i = items.length - 1; i >= 0; i--) {
    if (currentTime >= items[i].time) {
      const item = items[i];
      if (item.isInterlude && item.endTime !== undefined && currentTime >= item.endTime) {
        continue;
      }
      return i;
    }
  }
  return -1;
}

const AppleInterludeDots: React.FC<{
  startTime: number;
  endTime?: number;
  currentTime: number;
  isPlaying: boolean;
  onClick: () => void;
}> = ({ startTime, endTime, currentTime, isPlaying, onClick }) => {
  const span = endTime && endTime > startTime ? endTime - startTime : 8;
  const rawProgress = Math.min(1, Math.max(0, (currentTime - startTime) / span));

  return (
    <motion.div
      onClick={onClick}
      className="inline-flex items-center gap-2.5 py-3 px-4 -mx-4 rounded-2xl cursor-pointer select-none"
      animate={isPlaying ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={isPlaying ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
      title="Instrumental interlude"
    >
      {[0, 1, 2].map((dotIndex) => {
        const dotFill = Math.min(1, Math.max(0, (rawProgress - dotIndex / 3) * 3));
        const opacity = 0.26 + dotFill * 0.74;
        return (
          <span
            key={dotIndex}
            className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-white transition-[opacity,transform,box-shadow] duration-200"
            style={{
              opacity,
              transform: `scale(${0.9 + dotFill * 0.16})`,
              boxShadow:
                dotFill > 0.45
                  ? `0 0 ${Math.round(10 + dotFill * 8)}px rgba(255, 255, 255, ${(0.35 + dotFill * 0.35).toFixed(2)})`
                  : 'none',
            }}
          />
        );
      })}
    </motion.div>
  );
};

interface FullScreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQueue?: () => void;
}

type MobileTab = 'player' | 'lyrics' | 'queue';

const MobileQueueList = React.memo(function MobileQueueList({
  currentTrackId,
  onSelectQueueId,
}: {
  currentTrackId?: string;
  onSelectQueueId: (queueId: string) => void;
}) {
  const { queue } = useAudioQueue();
  return (
    <ScrollArea className="flex-1">
      <div className="space-y-2 py-4">
        {queue.slice(0, 80).map((track, index) => {
          const qid = track.queueId || `${track.id}-${index}`;
          return (
            <div
              key={qid}
              onClick={() => track.queueId && onSelectQueueId(track.queueId)}
              className={`flex items-center p-3 rounded-lg cursor-pointer hover:bg-white/10 transition-colors ${
                track.id === currentTrackId ? 'bg-primary/20' : 'bg-gray-800/30'
              }`}
            >
              <img
                src={track.coverArt || '/default-album.png'}
                alt={track.album || track.name}
                width={40}
                height={40}
                loading="lazy"
                decoding="async"
                className="w-10 h-10 rounded mr-3 object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{track.name}</p>
                <p className="text-xs text-gray-400 truncate">{track.artist}</p>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
});

export const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({ isOpen, onClose, onOpenQueue }) => {
  const { 
    currentTrack, 
    playPreviousTrack, 
    playNextTrack, 
    skipToTrackByQueueId,
    shuffle, 
    toggleShuffle, 
    toggleCurrentTrackStar,
    audioSettings,
    updateAudioSettings
  } = useAudioPlayer();
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  
  const isMobile = useIsMobile();
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [meshPalette, setMeshPalette] = useState<MeshPalette>(
    () => getCachedMeshPalette(currentTrack?.coverArt) ?? DEFAULT_MESH_PALETTE
  );
  const [lyrics, setLyrics] = useState<LyricDisplayItem[]>([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const [showLyrics, setShowLyrics] = useState(true);
  const [isUserScrollingLyrics, setIsUserScrollingLyrics] = useState(false);
  const [activeTab, setActiveTab] = useState<MobileTab>('player');
  const lyricsRef = useRef<HTMLDivElement>(null);
  const userScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLyricsUserScroll = () => {
    setIsUserScrollingLyrics(true);
    if (userScrollTimerRef.current) {
      clearTimeout(userScrollTimerRef.current);
    }
    userScrollTimerRef.current = setTimeout(() => {
      setIsUserScrollingLyrics(false);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (userScrollTimerRef.current) {
        clearTimeout(userScrollTimerRef.current);
      }
    };
  }, []);

  // Initialize volume from saved preference when fullscreen opens
  useEffect(() => {
    if (!isOpen) return;
    try {
      const savedVolume = localStorage.getItem('navidrome-volume');
      if (savedVolume !== null) {
        const vol = parseFloat(savedVolume);
        if (!isNaN(vol) && vol >= 0 && vol <= 1) {
          setVolume(vol);
          const mainAudio = document.querySelector('audio') as HTMLAudioElement | null;
          if (mainAudio) mainAudio.volume = vol;
        }
      }
    } catch {}
  }, [isOpen]);

  // Load lyrics when track changes (only while FullScreenPlayer is open)
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const loadLyrics = async () => {
      if (!currentTrack) {
        setLyrics([]);
        return;
      }

      try {
        // 1. First priority: SpicyLyrics API for rich Apple Music word-by-word (syllable) synced lyrics
        try {
          const params = new URLSearchParams();
          if (currentTrack.name) params.set('title', currentTrack.name);
          if (currentTrack.artist) params.set('artist', currentTrack.artist);
          if (currentTrack.album) params.set('album', currentTrack.album);
          if (currentTrack.duration) params.set('duration', String(currentTrack.duration));

          const res = await fetch(`/api/lyrics?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.Body?.Type === 'Syllable' && Array.isArray(data?.Body?.Content)) {
              const spicyItems = buildAppleLyricsFromSpicy(data.Body.Content);
              if (spicyItems.length > 0 && !cancelled) {
                setLyrics(spicyItems);
                return;
              }
            }
          }
        } catch (spicyErr) {
          console.warn('SpicyLyrics fetch failed or bypassed:', spicyErr);
        }

        // 2. Second priority: Structured lyrics from Navidrome/OpenSubsonic server
        const api = getNavidromeAPI();
        let lines: LyricLine[] = [];
        if (api) {
          const supportsLyrics = await api.hasExtension('songLyrics');
          if (supportsLyrics) {
            const structured = await api.getLyricsBySongId(currentTrack.id);
            const synced = structured.find((entry) => entry.synced && typeof entry.offset === 'number') || structured.find((entry) => entry.synced);
            if (synced) {
              const offsetMs = typeof synced.offset === 'number' ? synced.offset : 0;
              lines = (synced.line || [])
                .map((line) => ({
                  time: ((line.start ?? 0) + offsetMs) / 1000,
                  text: line.value || '',
                }))
                .sort((a, b) => a.time - b.time);
            }
          }
        }

        // 3. Fall back to lrclib.net when neither server nor SpicyLyrics provided lyrics
        if (!lines.some((l) => !isInstrumentalLine(l.text))) {
          const lyricsData = await lrcLibClient.searchTrack(
            currentTrack.artist,
            currentTrack.name,
            currentTrack.album,
            currentTrack.duration
          );

          if (lyricsData && lyricsData.syncedLyrics) {
            lines = lrcLibClient.parseSyncedLyrics(lyricsData.syncedLyrics);
          }
        }

        if (!cancelled) {
          setLyrics(buildAppleLyrics(lines));
        }
      } catch (error) {
        console.warn('Failed to load lyrics:', error);
        if (!cancelled) setLyrics([]);
      }
    };

    loadLyrics();
    return () => {
      cancelled = true;
    };
  }, [isOpen, currentTrack?.id]);

  // Update current lyric index based on time
  useEffect(() => {
    const newIndex = getActiveAppleLyricIndex(lyrics, currentTime);
    if (newIndex !== currentLyricIndex) {
      setCurrentLyricIndex(newIndex);
    }
  }, [lyrics, currentTime, currentLyricIndex]);

  // Auto-scroll active lyric smoothly into Apple Music's focal zone (paused briefly during manual wheel/touch scroll)
  useEffect(() => {
    const shouldScroll =
      !isUserScrollingLyrics &&
      lyrics.length > 0 &&
      (isMobile ? activeTab === 'lyrics' : showLyrics);

    if (currentLyricIndex >= 0 && shouldScroll && lyricsRef.current) {
      const scrollTimeout = setTimeout(() => {
        try {
          const scrollContainer = (lyricsRef.current?.querySelector('[data-radix-scroll-area-viewport]') ||
            lyricsRef.current) as HTMLElement | null;
          const currentLyricElement = lyricsRef.current?.querySelector(
            `[data-lyric-index="${currentLyricIndex}"]`
          ) as HTMLElement | null;

          if (scrollContainer && currentLyricElement) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const elementRect = currentLyricElement.getBoundingClientRect();
            const relativeTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;
            const focusFraction = isMobile ? 0.28 : 0.32;
            const targetScrollTop =
              relativeTop - containerRect.height * focusFraction + elementRect.height * 0.35;

            scrollContainer.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'smooth',
            });
          }
        } catch (error) {
          console.warn('Lyrics scroll failed:', error);
        }
      }, 60);

      return () => clearTimeout(scrollTimeout);
    }
  }, [currentLyricIndex, showLyrics, lyrics.length, isMobile, activeTab, isUserScrollingLyrics]);

  // Reset lyrics scroll when track changes
  useEffect(() => {
    setIsUserScrollingLyrics(false);
    if (currentTrack?.id && lyricsRef.current) {
      const resetTimeout = setTimeout(() => {
        try {
          const scrollContainer = (lyricsRef.current?.querySelector('[data-radix-scroll-area-viewport]') ||
            lyricsRef.current) as HTMLElement | null;
          if (scrollContainer) {
            scrollContainer.scrollTo({ top: 0, behavior: 'instant' });
          }
        } catch {}
        setCurrentLyricIndex(-1);
      }, 40);

      return () => clearTimeout(resetTimeout);
    }
  }, [currentTrack?.id]);

  // Sync with main audio player (~200ms while open + instant native media events)
  useEffect(() => {
    if (!isOpen || !currentTrack) return;

    const mainAudio = document.querySelector('audio') as HTMLAudioElement | null;
    const syncWithMainPlayer = () => {
      if (document.hidden) return;
      const audio = mainAudio || (document.querySelector('audio') as HTMLAudioElement | null);
      if (!audio) return;

      const newCurrentTime = audio.currentTime || 0;
      const newDuration = audio.duration || 0;
      const newIsPlaying = !audio.paused;
      const newVolume = audio.volume;

      setIsPlaying((prev) => (prev !== newIsPlaying ? newIsPlaying : prev));
      setCurrentTime((prev) => (Math.abs(prev - newCurrentTime) >= 0.05 ? newCurrentTime : prev));
      setDuration((prev) => (prev !== newDuration ? newDuration : prev));
      setVolume((prev) => (prev !== newVolume ? newVolume : prev));

      if (newDuration > 0) {
        const newProgress = (newCurrentTime / newDuration) * 100;
        setProgress((prev) => (Math.abs(prev - newProgress) >= 0.05 ? newProgress : prev));
      }
    };

    syncWithMainPlayer();
    if (mainAudio) {
      mainAudio.addEventListener('play', syncWithMainPlayer);
      mainAudio.addEventListener('pause', syncWithMainPlayer);
      mainAudio.addEventListener('seeked', syncWithMainPlayer);
      mainAudio.addEventListener('volumechange', syncWithMainPlayer);
      mainAudio.addEventListener('durationchange', syncWithMainPlayer);
    }
    const interval = setInterval(syncWithMainPlayer, 200);

    return () => {
      clearInterval(interval);
      if (mainAudio) {
        mainAudio.removeEventListener('play', syncWithMainPlayer);
        mainAudio.removeEventListener('pause', syncWithMainPlayer);
        mainAudio.removeEventListener('seeked', syncWithMainPlayer);
        mainAudio.removeEventListener('volumechange', syncWithMainPlayer);
        mainAudio.removeEventListener('durationchange', syncWithMainPlayer);
      }
    };
  }, [isOpen, currentTrack]);

  // Extract Apple Music multi-stop fluid mesh palette from cover art (cached 32x32)
  useEffect(() => {
    if (!currentTrack?.coverArt) {
      setMeshPalette(DEFAULT_MESH_PALETTE);
      return;
    }
    const cached = getCachedMeshPalette(currentTrack.coverArt);
    if (cached) {
      setMeshPalette(cached);
      return;
    }
    if (!isOpen) return;

    let cancelled = false;
    extractMeshPalette(currentTrack.coverArt)
      .then((palette) => {
        if (!cancelled) setMeshPalette(palette);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen, currentTrack?.coverArt]);

  const togglePlayPause = () => {
    // Find the main audio player's play/pause button and click it
    // This ensures we use the same logic as the main player
    const mainPlayButton = document.querySelector('[data-testid="play-pause-button"]') as HTMLButtonElement;
    
    if (mainPlayButton) {
      mainPlayButton.click();
    } else {
      // Fallback to direct audio control if button not found
      const mainAudio = document.querySelector('audio') as HTMLAudioElement;
      if (!mainAudio) {
        return;
      }

      if (isPlaying) {
        try {
          mainAudio.pause();
        } catch (error) {
          console.error('Audio pause() failed:', error);
        }
      } else {
        // Check if audio has a valid source
        if (!mainAudio.src && !mainAudio.currentSrc && currentTrack) {
          mainAudio.src = currentTrack.url;
          mainAudio.load();
        }
        
        mainAudio.play().catch((error) => {
          console.error('Audio play() failed:', error);
        });
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const mainAudio = document.querySelector('audio') as HTMLAudioElement;
    if (!mainAudio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    const newTime = (percentage / 100) * duration;
    
    mainAudio.currentTime = newTime;
    setCurrentTime(newTime);
    try {
      localStorage.setItem('navidrome-current-track-time', newTime.toString());
    } catch {}
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mainAudio = document.querySelector('audio') as HTMLAudioElement;
    if (!mainAudio) return;

    const newVolume = parseInt(e.target.value) / 100;
    mainAudio.volume = newVolume;
    setVolume(newVolume);
    try {
      localStorage.setItem('navidrome-volume', newVolume.toString());
    } catch {}
  };

  // Volume control functions for keyboard shortcuts
  const handleVolumeUp = () => {
    const mainAudio = document.querySelector('audio') as HTMLAudioElement;
    if (!mainAudio) return;
    const newVolume = Math.min(1, mainAudio.volume + 0.1);
    mainAudio.volume = newVolume;
    setVolume(newVolume);
    try {
      localStorage.setItem('navidrome-volume', newVolume.toString());
    } catch {}
  };

  const handleVolumeDown = () => {
    const mainAudio = document.querySelector('audio') as HTMLAudioElement;
    if (!mainAudio) return;
    const newVolume = Math.max(0, mainAudio.volume - 0.1);
    mainAudio.volume = newVolume;
    setVolume(newVolume);
    try {
      localStorage.setItem('navidrome-volume', newVolume.toString());
    } catch {}
  };

  const handleToggleMute = () => {
    const mainAudio = document.querySelector('audio') as HTMLAudioElement;
    if (!mainAudio) return;
    const newVolume = mainAudio.volume === 0 ? 1 : 0;
    mainAudio.volume = newVolume;
    setVolume(newVolume);
    try {
      localStorage.setItem('navidrome-volume', newVolume.toString());
    } catch {}
  };

  const { openSpotlight } = useGlobalSearch();

  // Set up keyboard shortcuts for fullscreen player
  useKeyboardShortcuts({
    onPlayPause: togglePlayPause,
    onNextTrack: playNextTrack,
    onPreviousTrack: playPreviousTrack,
    onVolumeUp: handleVolumeUp,
    onVolumeDown: handleVolumeDown,
    onToggleMute: handleToggleMute,
    onSpotlightSearch: openSpotlight,
    disabled: !isOpen || !currentTrack // Only active when fullscreen is open
  });

  const handleLyricClick = (time: number) => {
    const mainAudio = document.querySelector('audio') as HTMLAudioElement;
    if (!mainAudio) return;

    if (userScrollTimerRef.current) {
      clearTimeout(userScrollTimerRef.current);
      userScrollTimerRef.current = null;
    }
    setIsUserScrollingLyrics(false);

    mainAudio.currentTime = time;
    setCurrentTime(time);
    try {
      localStorage.setItem('navidrome-current-track-time', time.toString());
    } catch {}
    
    // Update progress bar as well
    if (duration > 0) {
      const newProgress = (time / duration) * 100;
      setProgress(newProgress);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderAppleLyricsList = (mobileLayout: boolean) => (
    <div
      className={
        mobileLayout
          ? 'pt-[20vh] pb-[48vh] px-3 sm:px-5 max-w-2xl'
          : 'pt-[26vh] pb-[52vh] pl-6 pr-8 lg:pl-10 lg:pr-14 max-w-3xl'
      }
    >
      {lyrics.map((item, index) => {
        const isActive = index === currentLyricIndex;

        if (item.isInterlude) {
          return (
            <div
              key={item.id}
              data-lyric-index={index}
              style={{
                display: 'grid',
                gridTemplateRows: isActive ? '1fr' : '0fr',
                opacity: isActive ? 1 : 0,
                marginBottom: isActive ? '1.25rem' : '0px',
                transition:
                  'grid-template-rows 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease, margin-bottom 420ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <div className="overflow-hidden">
                <AppleInterludeDots
                  startTime={item.time}
                  endTime={item.endTime}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onClick={() => handleLyricClick(item.endTime ?? item.time)}
                />
              </div>
            </div>
          );
        }

        const hasActive = currentLyricIndex >= 0;
        const dist = hasActive ? Math.abs(index - currentLyricIndex) : index + 1;
        const isPast = hasActive && index < currentLyricIndex;

        let lineOpacity = 1;
        let lineBlur = 0;

        if (!isActive) {
          if (isUserScrollingLyrics) {
            lineOpacity = isPast ? 0.52 : 0.68;
            lineBlur = 0;
          } else if (!hasActive) {
            lineOpacity = index === 0 ? 0.55 : index === 1 ? 0.42 : index === 2 ? 0.32 : 0.24;
            lineBlur = index === 0 ? 0.6 : index === 1 ? 1.4 : index === 2 ? 2.2 : 3.2;
          } else if (dist === 1) {
            lineOpacity = isPast ? 0.36 : 0.48;
            lineBlur = 1.3;
          } else if (dist === 2) {
            lineOpacity = isPast ? 0.28 : 0.38;
            lineBlur = 2.3;
          } else if (dist === 3) {
            lineOpacity = isPast ? 0.22 : 0.30;
            lineBlur = 2.9;
          } else {
            lineOpacity = isPast ? 0.16 : 0.22;
            lineBlur = 3.7;
          }
        }

        return (
          <div
            key={item.id}
            data-lyric-index={index}
            onClick={() => handleLyricClick(item.time)}
            style={
              {
                '--lyric-opacity': lineOpacity,
                '--lyric-blur': `${lineBlur}px`,
                transform: isActive ? 'scale(1.02) translateZ(0)' : 'scale(1) translateZ(0)',
                transformOrigin: 'left center',
                textShadow: isActive
                  ? '0 4px 28px rgba(255, 255, 255, 0.22), 0 2px 12px rgba(0, 0, 0, 0.28)'
                  : 'none',
              } as React.CSSProperties
            }
            className={`${
              mobileLayout
                ? 'text-[26px] sm:text-[32px] mb-5'
                : 'text-[28px] lg:text-[34px] xl:text-[38px] mb-6'
            } font-bold tracking-[-0.025em] leading-[1.22] text-white break-words cursor-pointer select-none rounded-2xl px-4 py-2.5 -mx-4 [opacity:var(--lyric-opacity)] [filter:blur(var(--lyric-blur))] hover:!opacity-95 hover:!blur-0 hover:bg-white/[0.07] active:scale-[0.99] transition-[opacity,transform,filter,background-color,text-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]`}
            title={`Jump to ${formatTime(item.time)}`}
          >
            {item.syllables && item.syllables.length > 0 ? (
              <span>
                {item.syllables.map((syl, sylIdx) => {
                  const isSylActive = isActive && currentTime >= syl.startTime && currentTime < syl.endTime;
                  const isSylPast = isActive && currentTime >= syl.endTime;
                  const isSylFuture = isActive && currentTime < syl.startTime;

                  let sylClass = '';
                  let sylStyle: React.CSSProperties = {};

                  if (!isActive) {
                    // Whole line inherits line-level blur/opacity
                    sylClass = 'text-white';
                  } else if (isSylPast) {
                    // Already sung in active line - bright opaque white with subtle glow
                    sylClass = 'text-white opacity-100 transition-all duration-150';
                  } else if (isSylActive) {
                    // Currently being sung - ultra prominent with active word glow
                    sylClass = 'text-white opacity-100 drop-shadow-[0_0_12px_rgba(255,255,255,0.7)] transition-all duration-100 inline-block scale-[1.03] origin-bottom';
                  } else {
                    // Future words in this line - dimmed until voice arrives
                    sylClass = 'text-white/40 opacity-70 transition-all duration-200';
                  }

                  return (
                    <span
                      key={sylIdx}
                      className={sylClass}
                      style={sylStyle}
                    >
                      {syl.text}
                      {!syl.isPartOfWord && ' '}
                    </span>
                  );
                })}
              </span>
            ) : (
              item.text
            )}
          </div>
        );
      })}
    </div>
  );

  if (!currentTrack) return null;

  const meshPlayState = isPlaying ? 'running' : 'paused';

  return (
    <>
      <AnimatePresence>
        {isOpen && (
      <motion.div
        className="dark fixed inset-0 z-[70] text-white overflow-hidden"
        style={{
          backgroundColor: meshPalette.base,
          transition: 'background-color 900ms ease',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
      >
      {/* Apple Music Ultra-Blurred Fluid Mesh Gradient Background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none select-none overflow-hidden"
        style={{ transform: 'translateZ(0)' }}
      >
        {/* Softly crossfading heavily blurred saturated cover wash for spatial color continuity */}
        {currentTrack.coverArt && (
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={currentTrack.coverArt}
              className="absolute -inset-[18%]"
              style={{
                backgroundImage: `url(${currentTrack.coverArt})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(110px) saturate(1.90) brightness(0.72)',
                transform: 'scale(1.2) translateZ(0)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
            />
          </AnimatePresence>
        )}

        {/* Drifting multi-stop fluid color mesh blobs (GPU transform-only, paused when audio pauses) */}
        <div
          className="absolute -inset-[22%]"
          style={{
            filter: 'blur(115px) saturate(1.55)',
            transform: 'translateZ(0)',
          }}
        >
          <div
            className="apple-mesh-blob-1 absolute -top-[12%] -left-[10%] w-[72vw] h-[72vw] min-w-[520px] min-h-[520px] rounded-full opacity-90"
            style={{
              background: `radial-gradient(circle at center, ${meshPalette.blob1} 0%, transparent 68%)`,
              animationPlayState: meshPlayState,
              transition: 'background 900ms ease',
            }}
          />
          <div
            className="apple-mesh-blob-2 absolute -top-[14%] -right-[12%] w-[68vw] h-[68vw] min-w-[500px] min-h-[500px] rounded-full opacity-85"
            style={{
              background: `radial-gradient(circle at center, ${meshPalette.blob2} 0%, transparent 68%)`,
              animationPlayState: meshPlayState,
              transition: 'background 900ms ease',
            }}
          />
          <div
            className="apple-mesh-blob-3 absolute -bottom-[18%] -left-[8%] w-[70vw] h-[70vw] min-w-[500px] min-h-[500px] rounded-full opacity-85"
            style={{
              background: `radial-gradient(circle at center, ${meshPalette.blob3} 0%, transparent 68%)`,
              animationPlayState: meshPlayState,
              transition: 'background 900ms ease',
            }}
          />
          <div
            className="apple-mesh-blob-4 absolute -bottom-[14%] -right-[10%] w-[74vw] h-[74vw] min-w-[520px] min-h-[520px] rounded-full opacity-90"
            style={{
              background: `radial-gradient(circle at center, ${meshPalette.blob4} 0%, transparent 70%)`,
              animationPlayState: meshPlayState,
              transition: 'background 900ms ease',
            }}
          />
        </div>

        {/* Gentle atmospheric contrast veil so crisp white lyrics pop without muddying colors */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 28% 50%, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.28) 100%)',
          }}
        />
      </div>
      
      <motion.div className="relative h-full w-full flex flex-col" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
        
        {/* Mobile Close Handle */}
        {isMobile && (
          <motion.div className="flex justify-center py-4 px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <div 
              onClick={onClose}
              className="cursor-pointer px-8 py-3 -mx-8 -my-3"
              style={{ touchAction: 'manipulation' }}
            >
              <motion.div className="w-8 h-1 bg-gray-300 rounded-full opacity-60" initial={{ scaleX: 0.9 }} animate={{ scaleX: 1 }} transition={{ duration: 0.3 }} />
            </div>
          </motion.div>
        )}

        {/* Desktop Header */}
        {!isMobile && (
          <motion.div className="absolute top-0 right-0 z-10 p-4 lg:p-6" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <div className="flex items-center gap-2">
              {onOpenQueue && (
                <button 
                  onClick={onOpenQueue}
                  className="text-white hover:bg-white/20 p-2 rounded-full transition-colors flex items-center justify-center w-10 h-10"
                  title="Open Queue"
                >
                  <FaListUl className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={onClose}
                className="text-white hover:bg-white/20 p-2 rounded-full transition-colors flex items-center justify-center w-10 h-10"
                title="Close Player"
              >
                <FaXmark className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {isMobile ? (
            /* Mobile Tab Content */
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                {activeTab === 'player' && (
                  <motion.div key="tab-player" className="h-full flex flex-col justify-center items-center px-8 py-4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
                    {/* Mobile Album Art (crossfade on track change) */}
                    <div className="relative mb-6 shrink-0 flex items-center justify-center" style={{ minHeight: 208 }}>
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={currentTrack.id}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.02, position: 'absolute' as const }}
                          transition={{ duration: 0.25 }}
                          className="flex items-center justify-center"
                        >
                          <Image
                            src={currentTrack.coverArt || '/default-album.png'}
                            alt={`Now playing: ${currentTrack.name} by ${currentTrack.artist}`}
                            width={260}
                            height={260}
                            className={`rounded-lg shadow-2xl object-cover transition-all duration-300 ${
                              !isPlaying ? 'w-52 h-52 opacity-70 scale-95' : 'w-64 h-64'
                            }`}
                            priority
                          />
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Track Info - Left Aligned and Star on Same Line */}
                    <div className="w-full mb-6 shrink-0">
                      <div className="flex items-center justify-between mb-0">
                        <Link
                          href={currentTrack.albumId ? `/album/${currentTrack.albumId}` : '#'}
                          onClick={() => onClose()}
                          className="text-2xl font-bold text-foreground line-clamp-1 flex-1 text-left hover:underline hover:text-white transition-colors"
                          title={`Go to album: ${currentTrack.album || currentTrack.name}`}
                        >
                          {currentTrack.name}
                        </Link>
                        <button
                          onClick={toggleCurrentTrackStar}
                          className="p-2 hover:bg-gray-700/50 rounded-full transition-colors ml-3 pb-0"
                          title={currentTrack?.starred ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star 
                            className={`w-6 h-6 ${currentTrack?.starred ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`} 
                          />
                        </button>
                      </div>
                      <Link 
                        href={currentTrack.artistId ? `/artist/${currentTrack.artistId}` : `/artist/${encodeURIComponent(currentTrack.artist)}`} 
                        onClick={() => onClose()}
                        className="text-lg text-foreground/80 line-clamp-1 block text-left mb-1 hover:underline hover:text-white transition-colors"
                        title={`Go to artist: ${currentTrack.artist}`}
                      >
                        {currentTrack.artist}
                      </Link>
                      {currentTrack.album && (
                        <Link 
                          href={currentTrack.albumId ? `/album/${currentTrack.albumId}` : '#'}  
                          onClick={() => onClose()}
                          className="text-base text-foreground/60 line-clamp-1 cursor-pointer hover:underline hover:text-white transition-colors block text-left"
                          title={`Go to album: ${currentTrack.album}`}
                        >
                          {currentTrack.album}
                        </Link>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="w-full mb-4 shrink-0">
                      <div className="w-full" onClick={handleSeek}>
                        <Progress value={progress} className="h-2 cursor-pointer" />
                      </div>
                      {/* Time below progress on mobile */}
                      <div className="flex justify-between text-sm text-foreground/60 mt-2">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-6 mb-4 shrink-0">
                      <button
                        onClick={toggleShuffle}
                        className={`p-2 hover:bg-gray-700/50 rounded-full transition-colors ${
                          shuffle ? 'text-primary bg-primary/20' : 'text-gray-400'
                        }`}
                        title={shuffle ? 'Shuffle On - Queue is shuffled' : 'Shuffle Off - Click to shuffle queue'}
                      >
                        <FaShuffle className="w-5 h-5" />
                      </button>

                      <button
                        onClick={playPreviousTrack}
                        className="p-2 hover:bg-gray-700/50 rounded-full transition-colors">
                        <FaBackward className="w-6 h-6" />
                      </button>

                      <button
                        onClick={togglePlayPause}
                        className="p-4 hover:bg-gray-700/50 rounded-full transition-colors">
                        {isPlaying ? (
                          <FaPause className="w-10 h-10" />
                        ) : (
                          <FaPlay className="w-10 h-10" />
                        )}
                      </button>

                      <button
                        onClick={playNextTrack}
                        className="p-2 hover:bg-gray-700/50 rounded-full transition-colors">
                        <FaForward className="w-6 h-6" />
                      </button>

                      <button
                        onMouseEnter={() => setShowVolumeSlider(true)}
                        className="p-2 hover:bg-gray-700/50 rounded-full transition-colors">
                        {volume === 0 ? (
                          <FaVolumeXmark className="w-5 h-5" />
                        ) : (
                          <FaVolumeHigh className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    {/* Volume Slider */}
                    {showVolumeSlider && (
                      <div 
                        className="w-32 mb-4"
                        onMouseLeave={() => setShowVolumeSlider(false)}
                      >
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={volume * 100}
                          onChange={handleVolumeChange}
                          className="w-full accent-foreground"
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'lyrics' && lyrics.length > 0 && (
                  <motion.div key="tab-lyrics" className="h-full flex flex-col px-4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div
                      ref={lyricsRef}
                      onWheel={handleLyricsUserScroll}
                      onTouchMove={handleLyricsUserScroll}
                      className="apple-lyrics-scroll apple-lyrics-mask flex-1 overflow-y-auto"
                    >
                      {renderAppleLyricsList(true)}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'queue' && (
                  <motion.div key="tab-queue" className="h-full flex flex-col px-4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <MobileQueueList
                      currentTrackId={currentTrack?.id}
                      onSelectQueueId={skipToTrackByQueueId}
                    />
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
              <div className="flex-shrink-0 pb-safe">
                <div className="flex justify-around py-4 mb-2">
                  <button
                    onClick={() => setActiveTab('player')}
                    className={`flex items-center justify-center p-4 rounded-full transition-colors ${
                      activeTab === 'player' ? 'text-primary bg-primary/20' : 'text-gray-400'
                    }`}
                  >
                    <FaPlay className="w-6 h-6" />
                  </button>

                  {lyrics.length > 0 && (
                    <button
                      onClick={() => setActiveTab('lyrics')}
                      className={`flex items-center justify-center p-4 rounded-full transition-colors ${
                        activeTab === 'lyrics' ? 'text-primary bg-primary/20' : 'text-gray-400'
                      }`}
                    >
                      <FaQuoteLeft className="w-6 h-6" />
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab('queue')}
                    className={`flex items-center justify-center p-4 rounded-full transition-colors ${
                      activeTab === 'queue' ? 'text-primary bg-primary/20' : 'text-gray-400'
                    }`}
                  >
                    <FaListUl className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Desktop Layout */
            <div className="h-full flex flex-row gap-8 p-6 overflow-hidden">
              {/* Left Side - Album Art and Controls */}
              <div className="flex flex-col items-center justify-center min-h-0 flex-1 min-w-0">
                {/* Album Art (crossfade on track change) */}
                <div className="relative mb-6 shrink-0 w-80 h-80">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={currentTrack.id}
                      className="absolute inset-0"
                      initial={{ opacity: 0, scale: 0.985 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.02 }}
                      transition={{ duration: 0.25 }}
                    >
                      <Image
                        src={currentTrack.coverArt || '/default-album.png'}
                        alt={`Now playing: ${currentTrack.name} by ${currentTrack.artist}`}
                        width={320}
                        height={320}
                        className="w-80 h-80 rounded-lg shadow-2xl object-cover"
                        priority
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Track Info */}
                <div className="text-start mb-6 shrink-0 max-w-full">
                  <Link
                    href={currentTrack.albumId ? `/album/${currentTrack.albumId}` : '#'}
                    onClick={() => onClose()}
                    className="text-3xl font-bold text-foreground line-clamp-2 leading-tight mb-2 block hover:underline hover:text-white transition-colors"
                    title={`Go to album: ${currentTrack.album || currentTrack.name}`}
                  >
                    {currentTrack.name}
                  </Link>
                  <Link 
                    href={currentTrack.artistId ? `/artist/${currentTrack.artistId}` : `/artist/${encodeURIComponent(currentTrack.artist)}`} 
                    onClick={() => onClose()}
                    className="text-xl text-foreground/80 mb-1 line-clamp-1 block hover:underline hover:text-white transition-colors"
                    title={`Go to artist: ${currentTrack.artist}`}
                  >
                    {currentTrack.artist}
                  </Link>
                </div>

                {/* Progress */}
                <div className="w-full max-w-md mb-6 px-4 shrink-0">
                  <div className="w-full" onClick={handleSeek}>
                    <Progress value={progress} className="h-2 cursor-pointer" />
                  </div>
                  <div className="flex justify-between text-sm text-foreground/60 mt-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-6 mb-6 shrink-0">
                  <button
                    onClick={toggleShuffle}
                    className={`p-2 hover:bg-gray-700/50 rounded-full transition-colors ${
                      shuffle ? 'text-primary bg-primary/20' : 'text-gray-400'
                    }`}
                    title={shuffle ? 'Shuffle On - Queue is shuffled' : 'Shuffle Off - Click to shuffle queue'}
                  >
                    <FaShuffle className="w-5 h-5" />
                  </button>

                  <button
                    onClick={playPreviousTrack}
                    className="p-2 hover:bg-gray-700/50 rounded-full transition-colors">
                    <FaBackward className="w-5 h-5" />
                  </button>

                  <button
                    onClick={togglePlayPause}
                    className="p-3 hover:bg-gray-700/50 rounded-full transition-colors">
                    {isPlaying ? (
                      <FaPause className="w-10 h-10" />
                    ) : (
                      <FaPlay className="w-10 h-10" />
                    )}
                  </button>

                  <button
                    onClick={playNextTrack}
                    className="p-2 hover:bg-gray-700/50 rounded-full transition-colors">
                    <FaForward className="w-5 h-5" />
                  </button>

                  <button
                    onClick={toggleCurrentTrackStar}
                    className="p-2 hover:bg-gray-700/50 rounded-full transition-colors"
                    title={currentTrack?.starred ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star 
                      className={`w-5 h-5 ${currentTrack?.starred ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`} 
                    />
                  </button>
                </div>

                {/* Volume and Lyrics Toggle - Desktop Only */}
                <div className="flex items-center gap-3 shrink-0 justify-center">
                  <button
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    className="p-2 hover:bg-gray-700/50 rounded-full transition-colors">
                    {volume === 0 ? (
                      <FaVolumeXmark className="w-5 h-5" />
                    ) : (
                      <FaVolumeHigh className="w-5 h-5" />
                    )}
                  </button>
                  
                  {lyrics.length > 0 && (
                    <button
                      onClick={() => setShowLyrics(!showLyrics)}
                      className={`p-2 hover:bg-gray-700/50 rounded-full transition-colors ${
                        showLyrics ? 'text-primary bg-primary/20' : 'text-gray-500'
                      }`}
                      title={showLyrics ? 'Hide Lyrics' : 'Show Lyrics'}
                    >
                      <FaQuoteLeft className="w-5 h-5" />
                    </button>
                  )}

                  <button
                    onClick={() => setShowAudioSettings(true)}
                    className="p-2 hover:bg-gray-700/50 rounded-full transition-colors"
                    title="Audio Settings"
                  >
                    <FaSliders className="w-5 h-5" />
                  </button>
                  
                  {showVolumeSlider && (
                    <div 
                      className="w-24"
                      onMouseLeave={() => setShowVolumeSlider(false)}
                    >
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume * 100}
                        onChange={handleVolumeChange}
                        className="w-full accent-foreground"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side - Lyrics (Desktop Only) */}
              <AnimatePresence initial={false}>
              {showLyrics && lyrics.length > 0 && (
                <motion.div
                  className="flex-1 min-w-0 min-h-0 flex flex-col"
                  ref={lyricsRef}
                  onWheel={handleLyricsUserScroll}
                  onTouchMove={handleLyricsUserScroll}
                  initial={{ x: 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 30, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <div className="h-full flex flex-col min-h-0">
                    <ScrollArea className="apple-lyrics-scroll apple-lyrics-mask flex-1 min-h-0 [&_[data-radix-scroll-area-scrollbar]]:hidden">
                      {renderAppleLyricsList(false)}
                    </ScrollArea>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
  </motion.div>
  )}
    </AnimatePresence>
    <AudioSettingsDialog 
      isOpen={showAudioSettings}
      onClose={() => setShowAudioSettings(false)}
    />
    </>
  );
};
