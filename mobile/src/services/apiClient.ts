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
import { API_BASE_URL, normalizeApiUrl } from '../config/api';
import { authActions } from '../store/authStore';

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
 * Reads stored JWT token from expo-secure-store or in-memory backup
 */
export async function getAuthToken(): Promise<string | null> {
  if (inMemoryToken) return inMemoryToken;
  try {
    const store = getSecureStore();
    if (store && typeof store.getItemAsync === 'function') {
      for (const key of TOKEN_KEYS) {
        const val = await store.getItemAsync(key);
        if (val && typeof val === 'string' && val.trim().length > 0) {
          inMemoryToken = val.trim();
          return inMemoryToken;
        }
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return inMemoryToken;
}

/**
 * Saves JWT token into expo-secure-store and in-memory backup
 */
export async function setAuthToken(token: string): Promise<void> {
  inMemoryToken = token;
  try {
    const store = getSecureStore();
    if (store && typeof store.setItemAsync === 'function') {
      await store.setItemAsync('jwt_token', token);
    }
  } catch {
    // Ignore storage write errors
  }
}

/**
 * Clears all authentication tokens from expo-secure-store and in-memory backup
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

  // Automatically attach Authorization Bearer token from expo-secure-store
  if (!options.skipAuth && !headers['Authorization']) {
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
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
      authActions.resetAuth();
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

