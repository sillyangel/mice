// Theme color utilities for dynamic viewport theme color

export const themeColors = {
  default: {
    background: 'hsl(0, 0%, 100%)', // White background for light mode
    hex: '#ffffff' // Hex equivalent for theme-color
  },
  blue: {
    background: 'hsl(240, 10%, 3.9%)', // Dark blue background
    hex: '#09090b' // Hex equivalent for theme-color
  },
  violet: {
    background: 'hsl(224, 71.4%, 4.1%)', // Dark violet background  
    hex: '#030712' // Hex equivalent for theme-color
  },
  red: {
    background: 'hsl(0, 0%, 3.9%)', // Dark red background
    hex: '#0a0a0a' // Hex equivalent for theme-color
  },
  rose: {
    background: 'hsl(20, 14.3%, 4.1%)', // Dark rose background
    hex: '#0c0a09' // Hex equivalent for theme-color
  },
  orange: {
    background: 'hsl(20, 14.3%, 4.1%)', // Dark orange background
    hex: '#0c0a09' // Hex equivalent for theme-color
  },
  green: {
    background: 'hsl(20, 14.3%, 4.1%)', // Dark green background
    hex: '#0c0a09' // Hex equivalent for theme-color
  },
  yellow: {
    background: 'hsl(20, 14.3%, 4.1%)', // Dark yellow background
    hex: '#0c0a09' // Hex equivalent for theme-color
  },
} as const;

export type Theme = keyof typeof themeColors;

export function getThemeBackgroundColor(theme: Theme): string {
  return themeColors[theme]?.hex || themeColors.default.hex;
}

export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
