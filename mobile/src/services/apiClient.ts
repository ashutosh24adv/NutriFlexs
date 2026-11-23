/**
 * NutriFlexs Unified Mobile API Client
 *
 * Automatically:
 * - Reads JWT from expo-secure-store and attaches `Authorization: Bearer <token>`
 * - Normalizes endpoints against production / configured API_BASE_URL
 * - Catches network / UnknownHostException errors with human-readable alerts
 * - Automatically routes to /welcome on 401 unauthenticated
 */

import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, normalizeApiUrl } from '../config/api';
import { useAuthStore, authActions } from '../store/useAuthStore';

// In-memory fallback token cache when secure storage is unavailable
let inMemoryToken: string | null = null;

const TOKEN_KEYS = [
  'jwt_token',
  'auth_token',
  'token',
  'refreshToken',
  'user_session',
] as const;

/**
 * Safely resolves expo-secure-store across native and web runtimes without static bundling failures
 */
function getSecureStore() {
  try {
    // @ts-ignore
    if (typeof require !== 'undefined') {
      // @ts-ignore
      const req = (function () {
        try {
          return require('expo-secure-store');
        } catch {
          return null;
        }
      })();
      return req?.default || req;
    }
  } catch {
    // Graceful fallback for non-native environments
  }
  return null;
}

/**
 * Reliably retrieves stored JWT token from:
 * 1. Reactive useAuthStore in-memory state
 * 2. In-memory token cache
 * 3. expo-secure-store (native storage)
 * 4. localStorage (web fallback)
 */
export async function getAuthToken(): Promise<string | null> {
  // 1. Check in-memory reactive state from useAuthStore
  try {
    const storeToken = useAuthStore.getState?.()?.token;
    if (storeToken && typeof storeToken === 'string' && storeToken.trim().length > 0) {
      inMemoryToken = storeToken.trim();
      return inMemoryToken;
    }
  } catch {}

  // 2. Check local in-memory token cache
  if (inMemoryToken) return inMemoryToken;

  // 3. Check expo-secure-store
  try {
    if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
      for (const key of TOKEN_KEYS) {
        const val = await SecureStore.getItemAsync(key);
        if (val && typeof val === 'string' && val.trim().length > 0) {
          inMemoryToken = val.trim();
          return inMemoryToken;
        }
      }
    }
  } catch {
    // Ignore storage read errors
  }

  // 3b. Check AsyncStorage backup
  try {
    if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
      for (const key of [...TOKEN_KEYS, 'nutriflex_token']) {
        const val = await AsyncStorage.getItem(key);
        if (val && typeof val === 'string' && val.trim().length > 0) {
          inMemoryToken = val.trim();
          return inMemoryToken;
        }
      }
    }
  } catch {}

  // 4. Check web localStorage if available
  if (typeof localStorage !== 'undefined') {
    for (const key of TOKEN_KEYS) {
      try {
        const val = localStorage.getItem(key);
        if (val && typeof val === 'string' && val.trim().length > 0) {
          inMemoryToken = val.trim();
          return inMemoryToken;
        }
      } catch {}
    }
  }

  return inMemoryToken;
}

/**
 * Saves JWT token into expo-secure-store and in-memory backup
 */
export async function setAuthToken(token: string): Promise<void> {
  const clean = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
  inMemoryToken = clean;
  try {
    const store = getSecureStore();
    if (store && typeof store.setItemAsync === 'function') {
      await Promise.allSettled([
        store.setItemAsync('jwt_token', clean),
        store.setItemAsync('token', clean),
      ]);
    }
  } catch {
    // Ignore storage write errors
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('jwt_token', clean);
      localStorage.setItem('token', clean);
    } catch {}
  }
}

/**
 * Clears all authentication tokens from expo-secure-store, localStorage, and in-memory backup
 */
export async function clearAuthToken(): Promise<void> {
  inMemoryToken = null;
  try {
    const store = getSecureStore();
    if (store && typeof store.deleteItemAsync === 'function') {
      await Promise.allSettled(
        TOKEN_KEYS.map((k) => store.deleteItemAsync(k))
      );
    }
  } catch {
    // Ignore storage deletion errors
  }
  if (typeof localStorage !== 'undefined') {
    try {
      TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string | number | boolean | undefined>;
  baseUrl?: string;
  skipAuth?: boolean;
  suppressNetworkAlert?: boolean;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  ok: boolean;
  headers?: any;
  [key: string]: any;
}

export class ApiError extends Error {
  status: number;
  data: any;
  isNetworkError: boolean;
  isUnauthorized: boolean;

  constructor(message: string, status: number = 0, data: any = null, isNetworkError: boolean = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.isNetworkError = isNetworkError;
    this.isUnauthorized = status === 401;
  }
}

/**
 * Navigates to /welcome screen safely via expo-router
 */
function navigateToWelcome(): void {
  try {
    // @ts-ignore
    const { router } = require('expo-router');
    if (router && typeof router.replace === 'function') {
      router.replace('/welcome');
    }
  } catch (err) {
    console.warn('[apiClient] Route redirection to /welcome failed:', err);
  }
}

/**
 * Core Request Dispatcher
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const method = options.method || 'GET';
  const base = options.baseUrl ? normalizeApiUrl(options.baseUrl) : API_BASE_URL;

  // Build full URL
  let fullUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  // Attach query parameters if provided
  if (options.params) {
    const queryParts: string[] = [];
    for (const [key, val] of Object.entries(options.params)) {
      if (val !== undefined && val !== null) {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
      }
    }
    if (queryParts.length > 0) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryParts.join('&');
    }
  }

  // Construct request headers
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Automatically attach Authorization Bearer token from secure storage / authStore
  const existingAuthKey = Object.keys(headers).find(
    (k) => k.toLowerCase() === 'authorization'
  );

  if (!options.skipAuth && (!existingAuthKey || !headers[existingAuthKey])) {
    const token = await getAuthToken();
    if (token) {
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
      headers['Authorization'] = `Bearer ${cleanToken}`;
    }
  }

  const requestInit: any = {
    method,
    headers,
  };

  if (options.body) {
    requestInit.body = typeof options.body === 'object' && !(options.body instanceof FormData)
      ? JSON.stringify(options.body)
      : options.body;
  }

  let response: any = null;

  try {
    response = await fetch(fullUrl, requestInit);
  } catch (netErr: any) {
    const errText = String(netErr?.message || netErr || '');
    const isNetwork =
      errText.includes('Network request failed') ||
      errText.includes('UnknownHostException') ||
      errText.includes('Failed to fetch') ||
      errText.includes('ENOTFOUND') ||
      errText.includes('ECONNREFUSED') ||
      errText.includes('NetworkError') ||
      errText.includes('AbortError');

    // Trigger human-readable alert for network / UnknownHostException failures
    if (!options.suppressNetworkAlert) {
      Alert.alert(
        'Connection Error',
        'Unable to connect to NutriFlex servers. Please check your internet connection and try again.'
      );
    }

    throw new ApiError(
      'Network connection failed. Please check your network connection.',
      0,
      null,
      isNetwork
    );
  }

  // Handle 401 Unauthenticated: wipe tokens and route to /welcome
  if (response.status === 401) {
    try {
      await clearAuthToken();
      await authActions.signOut();
    } catch {
      // Safe cleanup
    }
    navigateToWelcome();
    throw new ApiError('Session expired. Please log in again.', 401);
  }

  // Parse JSON response body
  let parsedData: any = null;
  const contentType = response.headers?.get ? response.headers.get('content-type') : '';
  if (!contentType || contentType.includes('application/json')) {
    try {
      parsedData = await response.json();
    } catch {
      parsedData = null;
    }
  } else {
    try {
      parsedData = await response.text();
    } catch {
      parsedData = null;
    }
  }

  if (!response.ok) {
    const serverMessage =
      parsedData?.error ||
      parsedData?.message ||
      `Request failed with status ${response.status}`;
    throw new ApiError(serverMessage, response.status, parsedData);
  }

  const result: ApiResponse<T> = {
    data: parsedData,
    status: response.status,
    ok: response.ok,
    headers: response.headers,
    ...(parsedData && typeof parsedData === 'object' ? parsedData : {}),
  };

  return result;
}

/**
 * apiClient method wrappers
 */
export const apiClient = Object.assign(
  function <T = any>(endpoint: string, options?: RequestOptions) {
    return apiRequest<T>(endpoint, options);
  },
  {
    get: <T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>) =>
      apiRequest<T>(endpoint, { ...options, method: 'GET' }),

    post: <T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
      apiRequest<T>(endpoint, { ...options, method: 'POST', body }),

    put: <T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
      apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),

    delete: <T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>) =>
      apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),

    patch: <T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
      apiRequest<T>(endpoint, { ...options, method: 'PATCH', body }),

    request: <T = any>(endpoint: string, options?: RequestOptions) =>
      apiRequest<T>(endpoint, options),

    getAuthToken,
    setAuthToken,
    clearAuthToken,
  }
);

export default apiClient;

