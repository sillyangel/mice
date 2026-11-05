'use client';

import React from 'react';

interface EqualizerBarsProps {
  className?: string;
  isAnimating?: boolean;
}

export function EqualizerBars({
  className = "w-3.5 h-3.5",
  isAnimating = true,
}: EqualizerBarsProps) {
  return (
    <span
      className={`inline-flex items-end justify-center gap-[2px] ${className}`}
      aria-hidden="true"
    >
      <span
        className={`w-[2.5px] rounded-full bg-current ${
          isAnimating ? 'animate-eq-1' : 'h-[35%]'
        }`}
        style={{ minHeight: '3px' }}
      />
      <span
        className={`w-[2.5px] rounded-full bg-current ${
          isAnimating ? 'animate-eq-2' : 'h-[100%]'
        }`}
        style={{ minHeight: '3px' }}
      />
      <span
        className={`w-[2.5px] rounded-full bg-current ${
          isAnimating ? 'animate-eq-3' : 'h-[60%]'
        }`}
        style={{ minHeight: '3px' }}
      />
    </span>
  );
}
