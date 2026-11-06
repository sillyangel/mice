import React from 'react';
import localFont from "next/font/local";
import "./globals.css";
import RootLayoutClient from "./components/RootLayoutClient";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});


// Get the short commit hash from env (set in dev via .env or prebuild script)
const isDev = process.env.NODE_ENV === 'development';
const shortCommit = isDev ? process.env.NEXT_PUBLIC_COMMIT_SHA || '' : '';

export const metadata = {
  title: {
    template: isDev && shortCommit ? `mice (dev: ${shortCommit}) | %s` : 'mice | %s',
    default: isDev && shortCommit ? `mice (dev: ${shortCommit})` : 'mice',
  },
  description: 'mice is a modern, Apple Music-grade web client for Navidrome and Subsonic music servers with fluid mesh gradients, synced lyrics, and gapless playback.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://mice.sillyangel.dev'),
  openGraph: {
    title: 'mice — Apple Music-grade client for Navidrome & Subsonic',
    description: 'Stream your personal music library with fluid mesh gradients, time-synced lyrics, and instant virtualized queues.',
    siteName: 'mice',
    url: 'https://mice.sillyangel.dev',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'mice — Apple Music-grade client for Navidrome & Subsonic',
    description: 'Stream your personal music library with fluid mesh gradients, time-synced lyrics, and instant virtualized queues.',
  },
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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: isDev && shortCommit ? `mice (dev: ${shortCommit})` : 'mice',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'format-detection': 'telephone=no',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon-precomposed.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#141517',
  colorScheme: 'dark',
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
    <html lang="en" suppressHydrationWarning className={cn("font-sans", inter.variable)}>
      <head>
        <meta name="theme-color" content="#141517" />
        <meta name="color-scheme" content="dark" />
        <link rel="manifest" href="/manifest.json" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const savedTheme = localStorage.getItem('theme');
                const theme = (savedTheme === 'blue' || savedTheme === 'violet' || savedTheme === 'red' || savedTheme === 'rose' || savedTheme === 'orange' || savedTheme === 'green' || savedTheme === 'yellow') ? savedTheme : 'default';
                document.documentElement.classList.add('theme-' + (theme === 'default' ? 'blue' : theme));
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  document.documentElement.classList.add('dark');
                }
                const themeColors = {
                  default: '#141517',
                  blue: '#09090b',
                  violet: '#030712',
                  red: '#0a0a0a',
                  rose: '#0c0a09',
                  orange: '#0c0a09',
                  green: '#0c0a09',
                  yellow: '#0c0a09'
                };
                let metaThemeColor = document.querySelector('meta[name="theme-color"]');
                if (!metaThemeColor) {
                  metaThemeColor = document.createElement('meta');
                  metaThemeColor.name = 'theme-color';
                  document.head.appendChild(metaThemeColor);
                }
                metaThemeColor.content = themeColors[theme] || '#141517';
              })();
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background`}>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}