"use client";

import React, { useEffect } from "react";
import { AudioPlayerProvider } from "../components/AudioPlayerContext";
import { OfflineNavidromeProvider, useOfflineNavidrome } from "../components/OfflineNavidromeProvider";
import { NavidromeConfigProvider } from "../components/NavidromeConfigContext";
import { ThemeProvider } from "../components/ThemeProvider";
import { PostHogProvider } from "../components/PostHogProvider";
import { WhatsNewPopup } from "../components/WhatsNewPopup";
import Ihateserverside from "./ihateserverside";
import DynamicViewportTheme from "./DynamicViewportTheme";
import ThemeColorHandler from "./ThemeColorHandler";
import { useViewportThemeColor } from "@/hooks/use-viewport-theme-color";
import { LoginForm } from "./start-screen";
import Image from "next/image";
import PageTransition from "./PageTransition";

// ServiceWorkerRegistration component to handle registration
function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);
  
  return null;
}

function NavidromeErrorBoundary({ children }: { children: React.ReactNode }) {
  // For now, since we're switching to offline-first, we'll handle errors differently
  // The offline provider will handle connectivity issues automatically
  const [isClient, setIsClient] = React.useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = React.useState(true); // Default to true to prevent flash
  
  // Client-side hydration
  React.useEffect(() => {
    setIsClient(true);
    const onboardingStatus = localStorage.getItem('onboarding-completed');
    setHasCompletedOnboarding(!!onboardingStatus);
  }, []);

  // Simple check: has config in localStorage or environment
  const hasAnyConfig = React.useMemo(() => {
    if (!isClient) return true; // Assume config exists during SSR to prevent flash
    
    // Check localStorage config
    const savedConfig = localStorage.getItem('navidrome-config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (config.serverUrl && config.username && config.password) {
          return true;
        }
      } catch (e) {
        // Invalid config, continue to env check
      }
    }
    
    // Check environment variables (visible on client side with NEXT_PUBLIC_)
    if (process.env.NEXT_PUBLIC_NAVIDROME_URL && 
        process.env.NEXT_PUBLIC_NAVIDROME_USERNAME && 
        process.env.NEXT_PUBLIC_NAVIDROME_PASSWORD) {
      return true;
    }
    
    return false;
  }, [isClient]);
  
  // Don't show anything until client-side hydration is complete
  if (!isClient) {
    return <>{children}</>;
  }
  
  // Show start screen ONLY if first-time user (no onboarding completed)
  // In offline-first mode, we don't need to check for errors since the app works offline
  const shouldShowStartScreen = !hasCompletedOnboarding;
  
  if (shouldShowStartScreen) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="absolute top-4 left-4 flex items-center space-x-2">
          <Image src="/icon-192.png" alt="Logo" width={32} height={32} className="h-8 w-8" />
          <span className="text-xl font-semibold">mice | navidrome client</span>
        </div>

        <div className="w-full max-w-sm">
          <LoginForm />
        </div>      
      </div>
    );
  }
  return <>{children}</>;
}

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <ThemeProvider>
        <DynamicViewportTheme />
        <ThemeColorHandler />
        <ServiceWorkerRegistration />
        <NavidromeConfigProvider>
          <OfflineNavidromeProvider>
            <NavidromeErrorBoundary>
              <AudioPlayerProvider>
                <Ihateserverside>
                  <PageTransition>{children}</PageTransition>
                </Ihateserverside>
                <WhatsNewPopup />
              </AudioPlayerProvider>
            </NavidromeErrorBoundary>
          </OfflineNavidromeProvider>
        </NavidromeConfigProvider>
      </ThemeProvider>
    </PostHogProvider>
  );
}
