/**
 * NutriFlexs Mobile App Constants & Configuration
 *
 * Central configuration registry for mobile client:
 * - Production Vercel domain: https://nutri-flexs.vercel.app (with https:// and no trailing slash)
 * - Clean support for process.env.EXPO_PUBLIC_API_URL
 * - DNS / UnknownHostException diagnostics and connection utilities
 */

import { Alert } from 'react-native';
import { normalizeApiUrl, PROD_API_URL, LOCAL_LAN_URL, LOCAL_USB_URL } from '../config/api';

export { normalizeApiUrl, PROD_API_URL, LOCAL_LAN_URL, LOCAL_USB_URL };

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL.trim().length > 0
    ? normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL)
    : 'https://nutri-flexs.vercel.app';

export const RAZORPAY_KEY_ID =
  process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_nutriflexs_demo';

export const CONFIG = {
  apiBaseUrl: API_BASE_URL || 'https://nutri-flexs.vercel.app',
  prodApiUrl: PROD_API_URL || 'https://nutri-flexs.vercel.app',
  localLanUrl: LOCAL_LAN_URL,
  localUsbUrl: LOCAL_USB_URL,
  razorpayKeyId: RAZORPAY_KEY_ID,
  requestTimeoutMs: 15000,
  appName: 'NutriFlexs',
  brandColor: '#1D4D3E',
} as const;

export interface NetworkDiagnostic {
  isHostResolutionError: boolean;
  isTimeout: boolean;
  title: string;
  message: string;
  hints: string[];
}

/**
 * Diagnostic parser for network / fetch errors.
 * Specifically detects UnknownHostException (DNS resolution failure), connection drops, and timeouts.
 */
export function parseNetworkDiagnostic(error: any, targetUrl: string = API_BASE_URL): NetworkDiagnostic {
  if (error && typeof error === 'object' && 'isHostResolutionError' in error && 'hints' in error) {
    return error as NetworkDiagnostic;
  }

  const rawMsg = String(error?.message || error || '');
  const isUnknownHost =
    rawMsg.includes('UnknownHostException') ||
    rawMsg.includes('Unable to resolve host') ||
    rawMsg.includes('ENOTFOUND') ||
    rawMsg.includes('EAI_AGAIN') ||
    (rawMsg.includes('Network request failed') && !rawMsg.includes('timeout'));

  const isTimeout =
    rawMsg.includes('timeout') ||
    rawMsg.includes('timed out') ||
    rawMsg.includes('ETIMEDOUT') ||
    error?.name === 'AbortError';

  let title = 'Server Connection Error';
  let message = `Could not reach backend service at: ${targetUrl}`;
  const hints: string[] = [];

  if (isUnknownHost) {
    title = 'Host Resolution Error (DNS)';
    message = `Unable to resolve host for "${targetUrl}". The mobile device cannot find this server domain on the network.`;
    hints.push('Check device internet connection (Wi-Fi or cellular data).');
    hints.push('Ensure the production domain is correct: https://nutri-flexs.vercel.app (note the hyphen "nutri-flexs").');
    hints.push('If testing on local network, set EXPO_PUBLIC_API_URL in mobile/.env to your local IP (e.g. http://10.91.111.142:3000).');
  } else if (isTimeout) {
    title = 'Connection Timed Out';
    message = `The request to ${targetUrl} took longer than ${CONFIG.requestTimeoutMs / 1000}s to respond.`;
    hints.push('The server may be starting up (cold start) or the connection is slow.');
    hints.push('Please check your network latency and retry in a moment.');
  } else {
    hints.push('Ensure your device has active internet access.');
    hints.push(`Check that ${targetUrl} is live and reachable in a browser.`);
  }

  return {
    isHostResolutionError: isUnknownHost,
    isTimeout,
    title,
    message,
    hints,
  };
}

/**
 * Displays a user-facing diagnostic Alert with clear hints when host resolution or connection fails.
 */
export function showDiagnosticAlert(
  error: any,
  targetUrl: string = API_BASE_URL,
  onRetry?: () => void
): void {
  const diag = parseNetworkDiagnostic(error, targetUrl);
  const formattedHints = diag.hints.map((h, i) => `${i + 1}. ${h}`).join('\n\n');
  const alertBody = `${diag.message}\n\nTroubleshooting Hints:\n${formattedHints}`;

  const buttons: Array<{ text: string; style?: 'cancel' | 'default' | 'destructive'; onPress?: () => void }> = [
    { text: 'OK', style: 'cancel' },
  ];

  if (onRetry) {
    buttons.push({
      text: 'Retry',
      style: 'default',
      onPress: onRetry,
    });
  }

  Alert.alert(diag.title, alertBody, buttons);
}
