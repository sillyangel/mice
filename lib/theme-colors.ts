// Theme color utilities for dynamic viewport theme color

export const themeColors = {
  default: {
    background: 'hsl(240, 10%, 8%)',
    hex: '#141517'
  },
  blue: {
    background: 'hsl(240, 10%, 3.9%)',
    hex: '#09090b'
  },
  violet: {
    background: 'hsl(224, 71.4%, 4.1%)',
    hex: '#030712'
  },
  red: {
    background: 'hsl(0, 0%, 3.9%)',
    hex: '#0a0a0a'
  },
  rose: {
    background: 'hsl(20, 14.3%, 4.1%)',
    hex: '#0c0a09'
  },
  orange: {
    background: 'hsl(20, 14.3%, 4.1%)',
    hex: '#0c0a09'
  },
  green: {
    background: 'hsl(20, 14.3%, 4.1%)',
    hex: '#0c0a09'
  },
  yellow: {
    background: 'hsl(20, 14.3%, 4.1%)',
    hex: '#0c0a09'
  },
} as const;

export type Theme = keyof typeof themeColors;

export function getThemeBackgroundColor(theme?: string): string {
  if (theme && theme in themeColors) {
    return themeColors[theme as Theme].hex;
  }
  return '#141517';
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
