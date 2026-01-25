'use client';

import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfiniteScrollProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  loadingText?: string;
  endMessage?: string;
  className?: string;
}

export function InfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  loadingText = 'Loading more items...',
  endMessage = 'No more items to load',
  className
}: InfiniteScrollProps) {
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '100px 0px',
  });

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [inView, hasMore, isLoading, onLoadMore]);

  return (
    <div 
      ref={ref} 
      className={cn(
        'py-4 flex flex-col items-center justify-center w-full', 
        className
      )}
    >
      {isLoading && (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="text-sm text-muted-foreground">{loadingText}</p>
        </div>
      )}
      
      {!hasMore && !isLoading && (
        <p className="text-sm text-muted-foreground">{endMessage}</p>
      )}
    </div>
  );
}
