import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function constrain(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Safely strips HTML tags and decodes entities into plain text.
 * Uses DOMParser in browser environments and an iterative regex loop as fallback.
 */
export function stripHtmlTags(input: string): string {
  if (!input) return '';

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(input, 'text/html');
      return doc.body.textContent || '';
    } catch {
      // Fallback to iterative strip
    }
  }

  let prev = '';
  let curr = input;
  while (curr !== prev) {
    prev = curr;
    curr = curr.replace(/<[^>]*>/g, '');
  }
  return curr;
}