'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Home, Search, Disc, Users, Music, Heart, List, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalSearch } from './GlobalSearchProvider';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigationItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/library', label: 'Library', icon: Music },
  { href: '/queue', label: 'Queue', icon: List },
];

export function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { openSpotlight } = useGlobalSearch();

  const handleNavigation = (href: string) => {
    if (href === '/search') {
      // Use spotlight search instead of navigating to search page
      openSpotlight();
    } else {
      router.push(href);
    }
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[50] bg-background/95 backdrop-blur-sm border-t border-border">
      <div className="flex items-center justify-around px-2 py-2 pb-safe mb-2">
        {navigationItems.map((item) => {
          const isItemActive = isActive(item.href);
          const Icon = item.icon;
          
          return (
            <motion.button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-[60px] touch-manipulation",
                "active:scale-95 active:bg-primary/20",
                isItemActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -1 }}
            >
              <Icon className={cn("w-5 h-5 mb-1", isItemActive && "text-primary")} />
              <span className={cn(
                "text-xs font-medium",
                isItemActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
              <AnimatePresence>
                {isItemActive && (
                  <motion.div
                    layoutId="bottom-nav-underline"
                    className="h-0.5 w-6 bg-primary mt-1 rounded"
                    initial={{ opacity: 0, scaleX: 0.6 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0, scaleX: 0.6 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
