'use client';

import { useEffect } from 'react';
import { useTheme } from '@/app/components/ThemeProvider';
import { getThemeBackgroundColor } from '@/lib/theme-colors';

export function useViewportThemeColor() {
  const { theme } = useTheme();

  useEffect(() => {
    // Update the theme-color meta tag dynamically
    const updateThemeColor = () => {
      const themeColor = getThemeBackgroundColor(theme);
      
      // Find existing theme-color meta tag or create one
      let metaThemeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
      
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.name = 'theme-color';
        document.head.appendChild(metaThemeColor);
      }
      
      metaThemeColor.content = themeColor;
    };

    updateThemeColor();
  }, [theme]);
}
