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

export interface MeshPalette {
  base: string;
  blob1: string;
  blob2: string;
  blob3: string;
  blob4: string;
}

export const DEFAULT_MESH_PALETTE: MeshPalette = {
  base: 'rgb(28, 22, 26)',
  blob1: 'rgb(82, 46, 62)',
  blob2: 'rgb(56, 38, 74)',
  blob3: 'rgb(92, 54, 44)',
  blob4: 'rgb(38, 30, 48)',
};

const meshPaletteCache = new Map<string, MeshPalette>();
const meshPaletteInFlight = new Map<string, Promise<MeshPalette>>();

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) {
    h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  } else if (max === gn) {
    h = ((bn - rn) / d + 2) / 6;
  } else {
    h = ((rn - gn) / d + 4) / 6;
  }
  return [h * 360, s, l];
}

function hslToRgbString(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(1, s));
  const light = Math.max(0, Math.min(1, l));

  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;

  if (hue < 60) {
    r1 = c; g1 = x; b1 = 0;
  } else if (hue < 120) {
    r1 = x; g1 = c; b1 = 0;
  } else if (hue < 180) {
    r1 = 0; g1 = c; b1 = x;
  } else if (hue < 240) {
    r1 = 0; g1 = x; b1 = c;
  } else if (hue < 300) {
    r1 = x; g1 = 0; b1 = c;
  } else {
    r1 = c; g1 = 0; b1 = x;
  }

  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);
  return `rgb(${r}, ${g}, ${b})`;
}

export function getCachedMeshPalette(imageUrl: string | null | undefined): MeshPalette | undefined {
  if (!imageUrl) return undefined;
  return meshPaletteCache.get(imageUrl);
}

/**
 * Extract an Apple Music-style multi-stop fluid mesh palette from cover artwork.
 * Samples spatial quadrants + vibrant accents from a tiny 32x32 canvas and normalizes
 * saturation/luminance so white fullscreen lyrics always remain rich and legible.
 */
export async function extractMeshPalette(imageUrl: string): Promise<MeshPalette> {
  const cached = meshPaletteCache.get(imageUrl);
  if (cached) return cached;

  const pending = meshPaletteInFlight.get(imageUrl);
  if (pending) return pending;

  const promise = new Promise<MeshPalette>((resolve) => {
    try {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            resolve(DEFAULT_MESH_PALETTE);
            return;
          }

          const size = 32;
          canvas.width = size;
          canvas.height = size;
          ctx.drawImage(img, 0, 0, size, size);
          const data = ctx.getImageData(0, 0, size, size).data;

          // Accumulate weighted RGB for 4 quadrants + overall + top vibrant pixels
          const quads = [
            { r: 0, g: 0, b: 0, w: 0 },
            { r: 0, g: 0, b: 0, w: 0 },
            { r: 0, g: 0, b: 0, w: 0 },
            { r: 0, g: 0, b: 0, w: 0 },
          ];
          let totalR = 0, totalG = 0, totalB = 0, totalW = 0;
          let maxSat = 0;
          let bestVibScore = -1;
          let vibR = 80, vibG = 45, vibB = 60;
          let secondVibScore = -1;
          let vib2R = 60, vib2G = 40, vib2B = 75;
          let bestVibHue = 0;

          for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
              const idx = (y * size + x) * 4;
              const a = data[idx + 3];
              if (a < 128) continue;

              const pr = data[idx];
              const pg = data[idx + 1];
              const pb = data[idx + 2];
              const [h, s, l] = rgbToHsl(pr, pg, pb);

              if (l > 0.08 && l < 0.92 && s > maxSat) {
                maxSat = s;
              }

              // Weight chromatic mid-tone pixels higher so artwork accents shine through
              const midToneWeight = 1 - Math.abs(l - 0.5) * 1.1;
              const weight = Math.max(0.15, midToneWeight) * (1 + s * 3.0);

              const qIndex = (y >= size / 2 ? 2 : 0) + (x >= size / 2 ? 1 : 0);
              quads[qIndex].r += pr * weight;
              quads[qIndex].g += pg * weight;
              quads[qIndex].b += pb * weight;
              quads[qIndex].w += weight;

              totalR += pr * weight;
              totalG += pg * weight;
              totalB += pb * weight;
              totalW += weight;

              const vibScore = s * (1 - Math.abs(l - 0.48) * 1.35);
              if (vibScore > bestVibScore) {
                bestVibScore = vibScore;
                vibR = pr;
                vibG = pg;
                vibB = pb;
                bestVibHue = h;
              }
            }
          }

          // Second pass for a distinct secondary accent hue (at least ~25 deg apart if available)
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 128) continue;
            const pr = data[i];
            const pg = data[i + 1];
            const pb = data[i + 2];
            const [h, s, l] = rgbToHsl(pr, pg, pb);
            const hueDiff = Math.min(Math.abs(h - bestVibHue), 360 - Math.abs(h - bestVibHue));
            const vibScore = s * (1 - Math.abs(l - 0.48) * 1.35) * (hueDiff > 24 ? 1.35 : 0.7);
            if (vibScore > secondVibScore && hueDiff > 15) {
              secondVibScore = vibScore;
              vib2R = pr;
              vib2G = pg;
              vib2B = pb;
            }
          }

          if (totalW <= 0) {
            resolve(DEFAULT_MESH_PALETTE);
            return;
          }

          const avgR = totalR / totalW;
          const avgG = totalG / totalW;
          const avgB = totalB / totalW;
          const [avgH, avgS, avgL] = rgbToHsl(avgR, avgG, avgB);
          const isMonochrome = maxSat < 0.11;

          const tuneBlob = (
            r: number,
            g: number,
            b: number,
            hueShift: number,
            minLight: number,
            maxLight: number,
            satBoost = 1.35
          ): string => {
            const [h, s, l] = rgbToHsl(r, g, b);
            if (isMonochrome) {
              const monoL = Math.max(minLight * 0.75, Math.min(maxLight * 0.75, l * 0.55));
              return hslToRgbString(avgH, Math.min(0.06, s), monoL);
            }
            const useHue = s < 0.08 ? avgH + hueShift : h + hueShift * 0.35;
            const boostedS = Math.min(0.88, Math.max(0.38, (s < 0.12 ? Math.max(avgS, maxSat * 0.65) : s) * satBoost));
            const clampedL = Math.max(minLight, Math.min(maxLight, l * 0.72 + 0.08));
            return hslToRgbString(useHue, boostedS, clampedL);
          };

          const qColor = (idx: number) => {
            const q = quads[idx];
            return q.w > 0 ? [q.r / q.w, q.g / q.w, q.b / q.w] : [avgR, avgG, avgB];
          };

          const [q0r, q0g, q0b] = qColor(0);
          const [q3r, q3g, q3b] = qColor(3);

          const base = isMonochrome
            ? hslToRgbString(avgH, Math.min(0.05, avgS), Math.max(0.10, Math.min(0.18, avgL * 0.38)))
            : hslToRgbString(
                bestVibScore > 0.18 ? bestVibHue : avgH,
                Math.min(0.76, Math.max(0.36, Math.max(avgS, maxSat * 0.6) * 1.2)),
                Math.max(0.15, Math.min(0.25, avgL * 0.42 + 0.06))
              );

          const blob1 = tuneBlob(
            bestVibScore > 0.12 ? vibR : q0r,
            bestVibScore > 0.12 ? vibG : q0g,
            bestVibScore > 0.12 ? vibB : q0b,
            0,
            0.26,
            0.42,
            1.42
          );
          const blob2 = tuneBlob(
            secondVibScore > 0.10 ? vib2R : q3r,
            secondVibScore > 0.10 ? vib2G : q3g,
            secondVibScore > 0.10 ? vib2B : q3b,
            -18,
            0.22,
            0.38,
            1.35
          );
          const blob3 = tuneBlob(q0r, q0g, q0b, 20, 0.24, 0.40, 1.28);
          const blob4 = tuneBlob(q3r, q3g, q3b, -32, 0.16, 0.30, 1.22);

          const palette: MeshPalette = { base, blob1, blob2, blob3, blob4 };
          if (meshPaletteCache.size >= 500) {
            const oldest = meshPaletteCache.keys().next().value;
            if (oldest !== undefined) meshPaletteCache.delete(oldest);
          }
          meshPaletteCache.set(imageUrl, palette);
          resolve(palette);
        } catch {
          resolve(DEFAULT_MESH_PALETTE);
        }
      };

      img.onerror = () => resolve(DEFAULT_MESH_PALETTE);
      img.src = imageUrl;
    } catch {
      resolve(DEFAULT_MESH_PALETTE);
    }
  }).finally(() => {
    meshPaletteInFlight.delete(imageUrl);
  });

  meshPaletteInFlight.set(imageUrl, promise);
  return promise;
}

export interface CardColors {
  bg: string;
  hoverBg: string;
  border: string;
  hoverBorder: string;
  glow: string;
  accent: string;
}

export const DEFAULT_CARD_COLORS: CardColors = {
  bg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
  hoverBg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.04) 100%)',
  border: 'rgba(255, 255, 255, 0.08)',
  hoverBorder: 'rgba(255, 255, 255, 0.16)',
  glow: '0 8px 24px -4px rgba(0, 0, 0, 0.3)',
  accent: '#a1a1aa',
};

const cardColorsCache = new Map<string, CardColors>();
const cardColorsInFlight = new Map<string, Promise<CardColors>>();

export function getCachedCardColors(imageUrl: string | null | undefined): CardColors | undefined {
  if (!imageUrl) return undefined;
  return cardColorsCache.get(imageUrl);
}

export async function extractCardColors(imageUrl: string): Promise<CardColors> {
  const cached = cardColorsCache.get(imageUrl);
  if (cached) return cached;

  const pending = cardColorsInFlight.get(imageUrl);
  if (pending) return pending;

  const promise = new Promise<CardColors>((resolve) => {
    try {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            resolve(DEFAULT_CARD_COLORS);
            return;
          }

          const size = 32;
          canvas.width = size;
          canvas.height = size;
          ctx.drawImage(img, 0, 0, size, size);

          const data = ctx.getImageData(0, 0, size, size).data;
          let bestScore = -1;
          let bestR = 50, bestG = 50, bestB = 50;
          let avgR = 0, avgG = 0, avgB = 0, count = 0;

          for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a < 128) continue;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const [h, s, l] = rgbToHsl(r, g, b);
            if (l > 0.05 && l < 0.95) {
              avgR += r;
              avgG += g;
              avgB += b;
              count++;

              const score = s * (1 - Math.abs(l - 0.5) * 1.2);
              if (score > bestScore) {
                bestScore = score;
                bestR = r;
                bestG = g;
                bestB = b;
              }
            }
          }

          let finalR = bestScore > 0.08 ? bestR : count > 0 ? Math.round(avgR / count) : 50;
          let finalG = bestScore > 0.08 ? bestG : count > 0 ? Math.round(avgG / count) : 50;
          let finalB = bestScore > 0.08 ? bestB : count > 0 ? Math.round(avgB / count) : 50;

          let [h, s, l] = rgbToHsl(finalR, finalG, finalB);
          s = Math.min(0.85, Math.max(0.40, s * 1.3));
          l = Math.min(0.38, Math.max(0.20, l * 0.7 + 0.04));

          const c = (1 - Math.abs(2 * l - 1)) * s;
          const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
          const m = l - c / 2;
          let r1 = 0, g1 = 0, b1 = 0;
          if (h < 60) { r1 = c; g1 = x; b1 = 0; }
          else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
          else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
          else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
          else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
          else { r1 = c; g1 = 0; b1 = x; }

          const cr = Math.round((r1 + m) * 255);
          const cg = Math.round((g1 + m) * 255);
          const cb = Math.round((b1 + m) * 255);

          const cardColors: CardColors = {
            bg: `linear-gradient(135deg, rgba(${cr}, ${cg}, ${cb}, 0.38) 0%, rgba(${cr}, ${cg}, ${cb}, 0.16) 100%)`,
            hoverBg: `linear-gradient(135deg, rgba(${cr}, ${cg}, ${cb}, 0.54) 0%, rgba(${cr}, ${cg}, ${cb}, 0.26) 100%)`,
            border: `rgba(${cr}, ${cg}, ${cb}, 0.40)`,
            hoverBorder: `rgba(${Math.min(255, cr + 40)}, ${Math.min(255, cg + 40)}, ${Math.min(255, cb + 40)}, 0.65)`,
            glow: `0 10px 28px -4px rgba(${cr}, ${cg}, ${cb}, 0.40)`,
            accent: `rgb(${Math.min(255, cr + 70)}, ${Math.min(255, cg + 70)}, ${Math.min(255, cb + 70)})`,
          };

          if (cardColorsCache.size >= 500) {
            const oldest = cardColorsCache.keys().next().value;
            if (oldest !== undefined) cardColorsCache.delete(oldest);
          }
          cardColorsCache.set(imageUrl, cardColors);
          resolve(cardColors);
        } catch {
          resolve(DEFAULT_CARD_COLORS);
        }
      };

      img.onerror = () => resolve(DEFAULT_CARD_COLORS);
      img.src = imageUrl;
    } catch {
      resolve(DEFAULT_CARD_COLORS);
    }
  }).finally(() => {
    cardColorsInFlight.delete(imageUrl);
  });

  cardColorsInFlight.set(imageUrl, promise);
  return promise;
}


