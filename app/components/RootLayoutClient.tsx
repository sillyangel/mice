"use client";

import React from "react";
import { AudioPlayerProvider } from "../components/AudioPlayerContext";
import { NavidromeProvider, useNavidrome } from "../components/NavidromeContext";
import { NavidromeConfigProvider } from "../components/NavidromeConfigContext";
import { ThemeProvider } from "../components/ThemeProvider";
import { PostHogProvider } from "../components/PostHogProvider";
import { WhatsNewPopup } from "../components/WhatsNewPopup";
import Ihateserverside from "./ihateserverside";
import DynamicViewportTheme from "./DynamicViewportTheme";
import { LoginForm } from "./start-screen";
import Image from "next/image";

function NavidromeErrorBoundary({ children }: { children: React.ReactNode }) {
  const { error } = useNavidrome();
  
  // Check if this is a first-time user
  const hasCompletedOnboarding = typeof window !== 'undefined' 
    ? localStorage.getItem('onboarding-completed') 
    : false;

  // Simple check: has config in localStorage or environment
  const hasAnyConfig = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    
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
  }, []);
  
  // Show start screen ONLY if:
  // 1. First-time user (no onboarding completed), OR
  // 2. User has completed onboarding BUT there's an error AND no config exists
  const shouldShowStartScreen = !hasCompletedOnboarding || (hasCompletedOnboarding && error && !hasAnyConfig);
  
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
        <NavidromeConfigProvider>
          <NavidromeProvider>
            <NavidromeErrorBoundary>
              <AudioPlayerProvider>
                <Ihateserverside>
                  {children}
                </Ihateserverside>
                <WhatsNewPopup />
              </AudioPlayerProvider>
            </NavidromeErrorBoundary>
          </NavidromeProvider>
        </NavidromeConfigProvider>
      </ThemeProvider>
    </PostHogProvider>
  );
}
