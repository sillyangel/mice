'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Home, Search, SquarePlay } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useGlobalSearch } from './GlobalSearchProvider';

export function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { openSpotlight } = useGlobalSearch();

  const isLibraryActive = pathname.startsWith('/library') || pathname.startsWith('/favorites');
  const isHomeActive = !isLibraryActive && !pathname.startsWith('/search');

  return (
    <div className="fixed bottom-[max(14px,env(safe-area-inset-bottom))] left-4 right-4 z-[55] flex items-center justify-between gap-3 max-w-[420px] mx-auto pointer-events-none select-none">
      {/* Floating dual-tab pill: Home & Library */}
      <div className="flex-1 h-[58px] bg-[#1c1c1e]/90 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl p-1 flex items-center justify-between gap-1 pointer-events-auto">
        {/* Home Tab */}
        <motion.button
          onClick={() => router.push('/')}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "flex-1 h-full rounded-full flex flex-col items-center justify-center transition-all duration-200 cursor-pointer",
            isHomeActive
              ? "bg-[#fa243c]/20 text-[#fa243c]"
              : "text-white/80 hover:text-white"
          )}
          aria-label="Home"
        >
          <Home className={cn("w-5 h-5", isHomeActive ? "text-[#fa243c]" : "text-white")} />
          <span className={cn(
            "text-[10px] font-semibold leading-none mt-1",
            isHomeActive ? "text-[#fa243c]" : "text-white/80"
          )}>
            Home
          </span>
        </motion.button>

        {/* Library Tab */}
        <motion.button
          onClick={() => router.push('/library')}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "flex-1 h-full rounded-full flex flex-col items-center justify-center transition-all duration-200 cursor-pointer",
            isLibraryActive
              ? "bg-[#fa243c]/20 text-[#fa243c]"
              : "text-white/80 hover:text-white"
          )}
          aria-label="Library"
        >
          <SquarePlay className={cn("w-5 h-5", isLibraryActive ? "text-[#fa243c]" : "text-white")} />
          <span className={cn(
            "text-[10px] font-semibold leading-none mt-1",
            isLibraryActive ? "text-[#fa243c]" : "text-white/80"
          )}>
            Library
          </span>
        </motion.button>
      </div>

      {/* Floating circular search button */}
      <motion.button
        onClick={() => openSpotlight()}
        whileTap={{ scale: 0.92 }}
        className="w-[58px] h-[58px] rounded-full bg-[#1c1c1e]/90 backdrop-blur-2xl border border-white/10 shadow-2xl flex items-center justify-center text-white shrink-0 pointer-events-auto cursor-pointer hover:bg-white/10 transition-colors"
        aria-label="Search"
      >
        <Search className="w-5 h-5 text-white" strokeWidth={2.4} />
      </motion.button>
    </div>
  );
}
