/**
 * NutriFlexs Mobile API Configuration
 * Defaults to live Vercel cloud deployment (https://nutri-flexs.vercel.app)
 * with graceful fallbacks to local LAN Wi-Fi and USB reverse proxy for local testing.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://nutri-flexs.vercel.app';

export const LOCAL_LAN_URL = 'http://10.91.111.142:3000';
export const LOCAL_USB_URL = 'http://localhost:3000';

