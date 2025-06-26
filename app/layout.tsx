import React from 'react';
import localFont from "next/font/local";
import "./globals.css";
import RootLayoutClient from "./components/RootLayoutClient";

export const metadata = {
  title: {
    template: 'mice | %s',
    default: 'mice',
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const savedTheme = localStorage.getItem('theme');
                const theme = (savedTheme === 'blue' || savedTheme === 'violet' || savedTheme === 'red' || savedTheme === 'rose' || savedTheme === 'orange' || savedTheme === 'green' || savedTheme === 'yellow') ? savedTheme : 'blue';
                document.documentElement.classList.add('theme-' + theme);
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  document.documentElement.classList.add('dark');
                }
                const themeColors = {
                  blue: '#09090b',
                  violet: '#030712',
                  red: '#0a0a0a',
                  rose: '#0c0a09',
                  orange: '#0c0a09',
                  green: '#0c0a09',
                  yellow: '#0c0a09'
                };
                const metaThemeColor = document.createElement('meta');
                metaThemeColor.name = 'theme-color';
                metaThemeColor.content = themeColors[theme];
                document.head.appendChild(metaThemeColor);
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