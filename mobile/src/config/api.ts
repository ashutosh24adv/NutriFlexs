/**
 * NutriFlexs Mobile API Configuration
 *
 * Defaults to live Vercel cloud deployment: https://nutri-flexs.vercel.app
 * Ensures https:// protocol and no trailing slash.
 * Guards against the common typo "nutriflexs.vercel.app" (missing hyphen).
 * With fallbacks to local LAN Wi-Fi and USB reverse proxy for local testing.
 */

export const PROD_API_URL = 'https://nutri-flexs.vercel.app';
export const LOCAL_LAN_URL = 'http://10.91.111.142:3000';
export const LOCAL_USB_URL = 'http://localhost:3000';

/**
 * Normalizes and sanitizes any API URL string:
 * - Trims whitespace
 * - Corrects "nutriflexs.vercel.app" (missing hyphen) -> "nutri-flexs.vercel.app"
 * - Ensures valid protocol (defaults to https:// unless local IP/localhost is specified)
 * - Removes any trailing slashes
 */
export function normalizeApiUrl(rawUrl?: string | null): string {
  let url = (rawUrl || '').trim();
  if (!url) {
    return PROD_API_URL;
  }

  // Auto-correct common typo: nutriflexs.vercel.app -> nutri-flexs.vercel.app
  if (url.includes('nutriflexs.vercel.app')) {
    url = url.replace('nutriflexs.vercel.app', 'nutri-flexs.vercel.app');
  }

  // Prepend protocol if omitted
  if (!/^https?:\/\//i.test(url)) {
    if (url.startsWith('localhost') || url.startsWith('10.') || url.startsWith('192.168.') || url.startsWith('127.0.0.1')) {
      url = `http://${url}`;
    } else {
      url = `https://${url}`;
    }
  }

  // Strip trailing slashes cleanly
  return url.replace(/\/+$/, '');
}

/**
 * Cleanly resolved base API URL for all mobile network requests.
 * Evaluates process.env.EXPO_PUBLIC_API_URL || "https://nutri-flexs.vercel.app" (strictly with zero trailing slash).
 */
const rawBaseUrl = (process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL.trim().length > 0)
  ? process.env.EXPO_PUBLIC_API_URL.trim()
  : 'https://nutri-flexs.vercel.app';

export const API_BASE_URL: string = normalizeApiUrl(rawBaseUrl).replace(/\/+$/, '');

/**
 * Helper to construct full endpoint URLs
 */
export function getApiEndpoint(path: string, baseUrl: string = API_BASE_URL): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizeApiUrl(baseUrl)}${cleanPath}`;
}
