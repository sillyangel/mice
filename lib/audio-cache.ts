export interface CachedTrack {
  id: string;
  url: string;
  blob?: Blob;
  audioBuffer?: AudioBuffer;
  isLoading: boolean;
  loadedAt: number;
}

class AudioCacheService {
  private cache = new Map<string, CachedTrack>();
  private maxCacheSize = 50; // Maximum number of tracks to cache
  private maxCacheAge = 30 * 60 * 1000; // 30 minutes in milliseconds
  private preloadCount = 3; // Number of upcoming tracks to preload
  private audioContext: AudioContext | null = null;

  constructor() {
    this.initAudioContext();
    this.startCleanupInterval();
  }
  private initAudioContext() {
    if (typeof window !== 'undefined') {
      try {
        this.audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch (error) {
        console.warn('AudioContext not supported:', error);
      }
    }
  }

  private startCleanupInterval() {
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.cleanupExpiredTracks();
      }, 5 * 60 * 1000); // Clean up every 5 minutes
    }
  }

  private cleanupExpiredTracks() {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((track, key) => {
      if (now - track.loadedAt > this.maxCacheAge) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      this.cache.delete(key);
    });

    // If cache is still too large, remove oldest tracks
    if (this.cache.size > this.maxCacheSize) {
      const sortedTracks = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.loadedAt - b.loadedAt);

      const tracksToRemove = sortedTracks.slice(0, this.cache.size - this.maxCacheSize);
      tracksToRemove.forEach(([key]) => {
        this.cache.delete(key);
      });
    }
  }

  async preloadTrack(id: string, url: string): Promise<void> {
    if (this.cache.has(id)) {
      return; // Already cached or loading
    }

    const cachedTrack: CachedTrack = {
      id,
      url,
      isLoading: true,
      loadedAt: Date.now()
    };

    this.cache.set(id, cachedTrack);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status}`);
      }

      const blob = await response.blob();
      cachedTrack.blob = blob;

      // Also decode audio for gapless playback if AudioContext is available
      if (this.audioContext && this.audioContext.state !== 'closed') {
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
          cachedTrack.audioBuffer = audioBuffer;
        } catch (error) {
          console.warn('Failed to decode audio buffer:', error);
        }
      }

      cachedTrack.isLoading = false;
      console.log(`Preloaded track: ${id}`);
    } catch (error) {
      console.error(`Failed to preload track ${id}:`, error);
      this.cache.delete(id);
    }
  }

  async preloadUpcomingTracks(trackIds: string[], trackUrls: string[]): Promise<void> {
    const tracksToPreload = trackIds.slice(0, this.preloadCount);
    const urlsToPreload = trackUrls.slice(0, this.preloadCount);

    const preloadPromises = tracksToPreload.map((id, index) => {
      if (!this.cache.has(id)) {
        return this.preloadTrack(id, urlsToPreload[index]);
      }
      return Promise.resolve();
    });

    await Promise.allSettled(preloadPromises);
  }

  getCachedTrack(id: string): CachedTrack | null {
    return this.cache.get(id) || null;
  }

  getCachedBlob(id: string): Blob | null {
    const cached = this.cache.get(id);
    return cached?.blob || null;
  }

  getCachedAudioBuffer(id: string): AudioBuffer | null {
    const cached = this.cache.get(id);
    return cached?.audioBuffer || null;
  }

  createObjectUrl(id: string): string | null {
    const blob = this.getCachedBlob(id);
    if (blob) {
      return URL.createObjectURL(blob);
    }
    return null;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStatus(): { size: number; maxSize: number; tracks: string[] } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      tracks: Array.from(this.cache.keys())
    };
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  // Ensure AudioContext is resumed (required for some browsers)
  async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Failed to resume AudioContext:', error);
      }
    }
  }
}

// Singleton instance
export const audioCacheService = new AudioCacheService();
