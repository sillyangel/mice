"use client";

import React from "react";
import { AudioPlayerProvider } from "../components/AudioPlayerContext";
import { NavidromeProvider, useNavidrome } from "../components/NavidromeContext";
import { NavidromeConfigProvider } from "../components/NavidromeConfigContext";
import { ThemeProvider } from "../components/ThemeProvider";
import { PostHogProvider } from "../components/PostHogProvider";
import Ihateserverside from "./ihateserverside";
import DynamicViewportTheme from "./DynamicViewportTheme";
import { LoginForm } from "./start-screen";
import Image from "next/image";

function NavidromeErrorBoundary({ children }: { children: React.ReactNode }) {
  const { error } = useNavidrome();
  if (error) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        {/* top right add the logo located in /icon-192.png here and the word mice */}
        <div className="absolute top-4 left-4 flex items-center space-x-2">
          <Image src="/icon-192.png" alt="Logo" className="h-8 w-8" />
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
              </AudioPlayerProvider>
            </NavidromeErrorBoundary>
          </NavidromeProvider>
        </NavidromeConfigProvider>
      </ThemeProvider>
    </PostHogProvider>
  );
}
