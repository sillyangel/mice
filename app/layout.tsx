import { SpeedInsights } from "@vercel/speed-insights/next";
import React from 'react';
import { Analytics }  from "@vercel/analytics/react";
import localFont from "next/font/local";
import "./globals.css";
import { AudioPlayerProvider } from "./components/AudioPlayerContext";
import { NavidromeProvider } from "./components/NavidromeContext";
import { Metadata } from "next";
import type { Viewport } from 'next';
import Ihateserverside from './components/ihateserverside';

export const viewport: Viewport = {
  themeColor: 'black',
};

export const metadata: Metadata = {
  title: {
    template: 'offbrand spotify | %s',
    default: 'offbrand spotify',
  },
  description: 'a very awesome music streaming service',
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiase dark bg-background`}>
        <NavidromeProvider>
          <AudioPlayerProvider>
            <SpeedInsights />
            <Analytics />
            <Ihateserverside>
              {children}
            </Ihateserverside>
          </AudioPlayerProvider>
        </NavidromeProvider>
      </body>
    </html>
  );
}