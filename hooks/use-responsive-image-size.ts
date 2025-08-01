import { useState, useEffect, useRef } from 'react';

interface UseResponsiveImageSizeOptions {
  /** Minimum size threshold */
  minSize?: number;
  /** Maximum size threshold */
  maxSize?: number;
  /** Multiplier for high DPI displays */
  dpiMultiplier?: number;
  /** Available size tiers from Navidrome */
  availableSizes?: number[];
}

/**
 * Hook to calculate optimal image size based on container dimensions
 */
export function useResponsiveImageSize(options: UseResponsiveImageSizeOptions = {}) {
  const {
    minSize = 60,
    maxSize = 1200,
    dpiMultiplier = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1,
    availableSizes = [60, 120, 240, 400, 600, 1200] // Clean divisions of 1200
  } = options;

  const containerRef = useRef<HTMLElement>(null);
  const [imageSize, setImageSize] = useState<number>(300); // Default fallback

  useEffect(() => {
    const calculateOptimalSize = () => {
      if (!containerRef.current) return;

      const element = containerRef.current;
      const rect = element.getBoundingClientRect();
      
      // Use the larger dimension (width or height) as base
      const displaySize = Math.max(rect.width, rect.height);
      
      // Account for device pixel ratio for crisp images on high DPI displays
      const targetSize = Math.round(displaySize * dpiMultiplier);
      
      // Clamp to min/max bounds
      const clampedSize = Math.max(minSize, Math.min(maxSize, targetSize));
      
      // Find the next larger available size to ensure quality
      const optimalSize = availableSizes.find(size => size >= clampedSize) || availableSizes[availableSizes.length - 1];
      
      setImageSize(optimalSize);
    };

    // Calculate initial size
    calculateOptimalSize();

    // Recalculate on resize
    const resizeObserver = new ResizeObserver(calculateOptimalSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [minSize, maxSize, dpiMultiplier, availableSizes]);

  return {
    containerRef,
    imageSize,
    /** Get size for a specific display dimension */
    getSizeForDimension: (dimension: number) => {
      const targetSize = Math.round(dimension * dpiMultiplier);
      const clampedSize = Math.max(minSize, Math.min(maxSize, targetSize));
      return availableSizes.find(size => size >= clampedSize) || availableSizes[availableSizes.length - 1];
    }
  };
}

/**
 * Simple function to get optimal image size for known dimensions
 */
export function getOptimalImageSize(
  displayWidth: number, 
  displayHeight: number, 
  options: Omit<UseResponsiveImageSizeOptions, 'availableSizes'> & { availableSizes?: number[] } = {}
): number {
  const {
    minSize = 60,
    maxSize = 1200,
    dpiMultiplier = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    availableSizes = [60, 120, 240, 400, 600, 1200] // Clean divisions of 1200
  } = options;

  const displaySize = Math.max(displayWidth, displayHeight);
  const targetSize = Math.round(displaySize * dpiMultiplier);
  const clampedSize = Math.max(minSize, Math.min(maxSize, targetSize));
  
  return availableSizes.find(size => size >= clampedSize) || availableSizes[availableSizes.length - 1];
}
