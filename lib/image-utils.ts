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
