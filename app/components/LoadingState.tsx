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
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-2 border-muted" />
          <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <Music className="absolute inset-0 m-auto h-6 w-6 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          {label}
          <span className="animate-pulse">...</span>
        </p>
      </div>
    </div>
  );
}