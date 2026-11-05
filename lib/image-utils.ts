/**
 * Utility functions for calculating optimal image sizes for different contexts
 */

export interface ImageSizeContext {
  /** The display width in CSS pixels */
  displayWidth: number;
  /** The display height in CSS pixels */
  displayHeight: number;
  /** Device pixel ratio for high-DPI displays */
  devicePixelRatio?: number;
  /** Additional scaling factor (e.g., for hover effects) */
  scaleFactor?: number;
}

/**
 * Calculate the optimal image size for the given context
 * Takes into account device pixel ratio and potential scaling effects
 */
export function calculateOptimalImageSize(context: ImageSizeContext): number {
  const { displayWidth, displayHeight, devicePixelRatio = 1, scaleFactor = 1.1 } = context;
  
  // Use the larger dimension to ensure we cover the entire display area
  const baseDimension = Math.max(displayWidth, displayHeight);
  
  // Account for device pixel ratio and potential scaling
  const optimalSize = Math.ceil(baseDimension * devicePixelRatio * scaleFactor);
  
  // Cap at reasonable maximum to avoid excessive bandwidth usage
  return Math.min(optimalSize, 1200);
}

/**
 * Get optimal image size for common component contexts
 * All sizes are clean divisions of 1200 for optimal scaling
 */
export const ImageSizes = {
  // Small thumbnails in lists - 1200/20 = 60, rounded to 64 for better display
  THUMBNAIL: 60,
  
  // Small album covers in compact views - 1200/10 = 120
  SMALL_ALBUM: 120,
  
  // Medium album covers in grid views - 1200/5 = 240
  MEDIUM_ALBUM: 240,
  
  // Large album covers in detail views - 1200/3 = 400
  LARGE_ALBUM: 400,
  
  // Extra large for full-screen displays - 1200/2 = 600
  XLARGE_ALBUM: 600,
  
  // Full resolution - 1200/1 = 1200
  FULL_ALBUM: 1200,
  
  // Artist images
  ARTIST_SMALL: 120,   // 1200/10
  ARTIST_MEDIUM: 240,  // 1200/5
  ARTIST_LARGE: 400,   // 1200/3
  
  // Player images
  PLAYER_MINI: 60,     // 1200/20
  PLAYER_COMPACT: 120, // 1200/10
  PLAYER_FULL: 400,    // 1200/3
} as const;

/**
 * Get responsive image size based on container and viewport
 */
export function getResponsiveImageSize(
  containerWidth: number,
  viewportWidth: number = typeof window !== 'undefined' ? window?.innerWidth || 1920 : 1920,
  devicePixelRatio: number = typeof window !== 'undefined' ? window?.devicePixelRatio || 1 : 1
): number {
  let targetSize: number;
  
  // Determine base size based on container and viewport
  // All sizes are clean divisions of 1200
  if (containerWidth <= 60) {
    targetSize = ImageSizes.THUMBNAIL; // 60px
  } else if (containerWidth <= 120) {
    targetSize = ImageSizes.SMALL_ALBUM; // 120px
  } else if (containerWidth <= 240 || viewportWidth <= 768) {
    targetSize = ImageSizes.MEDIUM_ALBUM; // 240px
  } else if (containerWidth <= 400 || viewportWidth <= 1024) {
    targetSize = ImageSizes.LARGE_ALBUM; // 400px
  } else if (containerWidth <= 600 || viewportWidth <= 1440) {
    targetSize = ImageSizes.XLARGE_ALBUM; // 600px
  } else {
    targetSize = ImageSizes.FULL_ALBUM; // 1200px
  }
  
  // Apply device pixel ratio but ensure we stay within clean divisions of 1200
  const scaledSize = Math.ceil(targetSize * devicePixelRatio);
  
  // Round to nearest clean division of 1200
  const divisions = [60, 120, 240, 400, 600, 1200];
  return divisions.find(size => size >= scaledSize) || 1200;
}

/**
 * Hook to get optimal image size for a container
 * Returns clean divisions of 1200 for optimal scaling
 */
export function useOptimalImageSize(
  width: number,
  height: number = width,
  scaleFactor: number = 1.1
): number {
  if (typeof window === 'undefined') {
    // SSR fallback - return appropriate size based on dimensions
    return getResponsiveImageSize(width, 1920, 1);
  }
  
  const optimalSize = calculateOptimalImageSize({
    displayWidth: width,
    displayHeight: height,
    devicePixelRatio: window.devicePixelRatio || 1,
    scaleFactor,
  });
  
  // Round to nearest clean division of 1200
  const divisions = [60, 120, 240, 400, 600, 1200];
  return divisions.find(size => size >= optimalSize) || 1200;
}

const dominantColorCache = new Map<string, string>();
const dominantColorInFlight = new Map<string, Promise<string>>();
const ambientColorCache = new Map<string, string>();
const ambientColorInFlight = new Map<string, Promise<string>>();

function setBoundedCache(cache: Map<string, string>, key: string, value: string, maxEntries = 500) {
  if (cache.size >= maxEntries) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

/**
 * Extract dominant color from an image (cached in memory & downsampled to 32x32)
 * @param imageUrl - URL of the image to analyze
 * @returns Promise that resolves to CSS color string (rgb format)
 */
export async function extractDominantColor(imageUrl: string): Promise<string> {
  const cached = dominantColorCache.get(imageUrl);
  if (cached) return cached;

  const pending = dominantColorInFlight.get(imageUrl);
  if (pending) return pending;

  const promise = new Promise<string>((resolve) => {
    try {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            resolve('rgb(25, 25, 25)');
            return;
          }

          // Downsample onto a tiny 32x32 canvas instead of allocating full image dimensions
          canvas.width = 32;
          canvas.height = 32;
          ctx.drawImage(img, 0, 0, 32, 32);

          const data = ctx.getImageData(0, 0, 32, 32).data;
          let r = 0, g = 0, b = 0;
          let sampleCount = 0;

          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            sampleCount++;
          }

          if (sampleCount === 0) {
            resolve('rgb(25, 25, 25)');
            return;
          }

          r = Math.floor(r / sampleCount);
          g = Math.floor(g / sampleCount);
          b = Math.floor(b / sampleCount);

          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          if (brightness > 200) {
            r = Math.floor(r * 0.7);
            g = Math.floor(g * 0.7);
            b = Math.floor(b * 0.7);
          } else if (brightness < 50) {
            r = Math.min(255, Math.floor(r * 1.3));
            g = Math.min(255, Math.floor(g * 1.3));
            b = Math.min(255, Math.floor(b * 1.3));
          }

          const color = `rgb(${r}, ${g}, ${b})`;
          setBoundedCache(dominantColorCache, imageUrl, color);
          resolve(color);
        } catch {
          resolve('rgb(25, 25, 25)');
        }
      };

      img.onerror = () => {
        resolve('rgb(25, 25, 25)');
      };

      img.src = imageUrl;
    } catch {
      resolve('rgb(25, 25, 25)');
    }
  }).finally(() => {
    dominantColorInFlight.delete(imageUrl);
  });

  dominantColorInFlight.set(imageUrl, promise);
  return promise;
}

/**
 * Extract Apple Music-style ambient dark background tint from cover artwork.
 * Results are cached by URL so revisiting albums/playlists/artists is instantaneous.
 */
export function getCachedAmbientColor(imageUrl: string | null | undefined): string | undefined {
  if (!imageUrl) return undefined;
  return ambientColorCache.get(imageUrl);
}

export async function extractAmbientColor(imageUrl: string, fallback = '#1f1d1c'): Promise<string> {
  const cached = ambientColorCache.get(imageUrl);
  if (cached) return cached;

  const pending = ambientColorInFlight.get(imageUrl);
  if (pending) return pending;

  const promise = new Promise<string>((resolve) => {
    try {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            resolve(fallback);
            return;
          }

          canvas.width = 32;
          canvas.height = 32;
          ctx.drawImage(img, 0, 0, 32, 32);
          const data = ctx.getImageData(0, 0, 32, 32).data;
          let r = 0, g = 0, b = 0, count = 0;

          for (let i = 0; i < data.length; i += 4) {
            const pr = data[i];
            const pg = data[i + 1];
            const pb = data[i + 2];
            const brightness = (pr + pg + pb) / 3;
            if (brightness > 20 && brightness < 240) {
              r += pr;
              g += pg;
              b += pb;
              count++;
            }
          }

          if (count > 0) {
            r = Math.floor(r / count);
            g = Math.floor(g / count);
            b = Math.floor(b / count);
            const targetR = Math.max(16, Math.floor(r * 0.45));
            const targetG = Math.max(14, Math.floor(g * 0.40));
            const targetB = Math.max(14, Math.floor(b * 0.38));
            const color = `rgb(${targetR}, ${targetG}, ${targetB})`;
            setBoundedCache(ambientColorCache, imageUrl, color);
            resolve(color);
          } else {
            resolve(fallback);
          }
        } catch {
          resolve(fallback);
        }
      };

      img.onerror = () => resolve(fallback);
      img.src = imageUrl;
    } catch {
      resolve(fallback);
    }
  }).finally(() => {
    ambientColorInFlight.delete(imageUrl);
  });

  ambientColorInFlight.set(imageUrl, promise);
  return promise;
}

