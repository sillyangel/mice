/**
 * Utilities for encoding/decoding sensitive values stored in client-side storage
 * to avoid plaintext exposure.
 */

export function protectSensitiveData(value: unknown): string {
  try {
    const raw = typeof value === 'string' ? value : JSON.stringify(value);
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      return window.btoa(encodeURIComponent(raw));
    }
    return Buffer.from(encodeURIComponent(raw)).toString('base64');
  } catch {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
}

export function unprotectSensitiveData<T = unknown>(stored: string | null): T | null {
  if (!stored) return null;
  // Try decoding protected base64 string
  try {
    const decoded = typeof window !== 'undefined' && typeof window.atob === 'function'
      ? decodeURIComponent(window.atob(stored))
      : decodeURIComponent(Buffer.from(stored, 'base64').toString('utf-8'));
    return JSON.parse(decoded) as T;
  } catch {
    // Fallback for legacy plaintext JSON
    try {
      return JSON.parse(stored) as T;
    } catch {
      return null;
    }
  }
}
