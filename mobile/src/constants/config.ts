/**
 * NutriFlexs Mobile App Constants & Configuration
 *
 * Central configuration registry for mobile client:
 * - Production Vercel domain: https://nutri-flexs.vercel.app (with https:// and no trailing slash)
 * - Clean support for process.env.EXPO_PUBLIC_API_URL
 * - DNS / UnknownHostException diagnostics and connection utilities
 */

import { Alert } from 'react-native';
import { normalizeApiUrl, PROD_API_URL, LOCAL_LAN_URL, LOCAL_USB_URL, API_BASE_URL } from '../config/api';

export { normalizeApiUrl, PROD_API_URL, LOCAL_LAN_URL, LOCAL_USB_URL, API_BASE_URL };

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

  let title = 'Connection Issue';
  let message = 'Unable to connect to NutriFlexs server. Please check your network connection.';
  const hints: string[] = [];

  if (isUnknownHost) {
    title = 'Connection Issue';
    message = 'Unable to connect to the server. Please check your internet connection and try again.';
    hints.push('Check device internet connection (Wi-Fi or mobile data).');
    hints.push('Ensure airplane mode is disabled.');
    hints.push('Please try again in a few moments.');
  } else if (isTimeout) {
    title = 'Connection Timed Out';
    message = 'The server took longer than expected to respond. Please check your connection and retry.';
    hints.push('Check your internet connection speed.');
    hints.push('Please tap Retry to attempt reconnecting.');
  } else {
    hints.push('Ensure your device has an active internet connection.');
    hints.push('Please try again in a moment.');
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
 * Displays a clean user-facing Alert when host resolution or connection fails,
 * suppressing technical raw popup alerts and developer troubleshooting hints.
 */
export function showDiagnosticAlert(
  error: any,
  targetUrl: string = API_BASE_URL,
  onRetry?: () => void
): void {
  const diag = parseNetworkDiagnostic(error, targetUrl);
  // Log technical details for debugging without exposing raw internal hints to the user
  console.warn('[Network Diagnostic Alert]:', { ...diag, targetUrl });

  const userTitle = diag.title || 'Connection Issue';
  const userMessage = diag.isTimeout
    ? 'The server took longer than expected to respond. Please check your connection and retry.'
    : 'Unable to connect to the server. Please check your internet connection and try again.';

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

  Alert.alert(userTitle, userMessage, buttons);
}
