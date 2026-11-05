'use client';

import { Music } from 'lucide-react';

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = 'Loading', className }: LoadingStateProps) {
  return (
    <div
      className={`flex min-h-[50vh] w-full items-center justify-center p-6 ${className || ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-14 w-14 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <Music className="h-6 w-6 text-primary shrink-0" />
        </div>
        <p className="text-sm font-medium text-white/70">
          {label}
          <span className="animate-pulse">...</span>
        </p>
      </div>
    </div>
  );
}

export default LoadingState;