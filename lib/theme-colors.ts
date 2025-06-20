// Theme color utilities for dynamic viewport theme color

export const themeColors = {
  blue: {
    background: 'hsl(240, 10%, 3.9%)', // Dark blue background
    hex: '#09090b' // Hex equivalent for theme-color
  },
  violet: {
    background: 'hsl(224, 71.4%, 4.1%)', // Dark violet background  
    hex: '#030712' // Hex equivalent for theme-color
  }
} as const;

export type Theme = keyof typeof themeColors;

export function getThemeBackgroundColor(theme: Theme): string {
  return themeColors[theme].hex;
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
