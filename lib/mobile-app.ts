/**
 * NutriFlexs Mobile App Integration Architecture
 *
 * This module configures and handles the "OPEN APP" deep-linking and store fallback flow.
 *
 * WHEN THE MOBILE APP IS RELEASED:
 * Configure these values either:
 * 1. Directly in this file under MOBILE_APP_CONFIG, or
 * 2. Via environment variables (e.g. NEXT_PUBLIC_APP_DEEP_LINK, NEXT_PUBLIC_PLAY_STORE_URL, etc.)
 *
 * Configuration Reference:
 * - androidPackageName: e.g. "com.nutriflexs.app"
 * - deepLinkScheme: e.g. "nutriflexs://"
 * - playStoreUrl: e.g. "https://play.google.com/store/apps/details?id=com.nutriflexs.app"
 * - appStoreUrl: e.g. "https://apps.apple.com/app/nutriflexs/id..."
 */

export interface MobileAppConfiguration {
  /** Custom URI scheme registered by the mobile app (e.g., 'nutriflexs://') */
  deepLinkScheme: string;
  /** Official Google Play Store listing URL once published */
  playStoreUrl: string;
  /** Official Apple App Store listing URL once published */
  appStoreUrl: string;
  /** Android application package identifier */
  androidPackageName: string;
  /** Web application domain for universal/app links */
  webDomain: string;
  /** Timeout in ms before executing fallback when app is not installed */
  fallbackTimeoutMs: number;
}

export const MOBILE_APP_CONFIG: MobileAppConfiguration = {
  // Read from public configuration if available, otherwise blank placeholders
  deepLinkScheme: process.env.NEXT_PUBLIC_APP_DEEP_LINK || "",
  playStoreUrl: process.env.NEXT_PUBLIC_PLAY_STORE_URL || "",
  appStoreUrl: process.env.NEXT_PUBLIC_APP_STORE_URL || "",
  androidPackageName: process.env.NEXT_PUBLIC_ANDROID_PACKAGE_NAME || "",
  webDomain: process.env.NEXT_PUBLIC_APP_URL || "https://nutri-flexs.vercel.app",
  fallbackTimeoutMs: 1800,
};

/**
 * Helper to check if production mobile app endpoints are configured.
 */
export function isMobileAppConfigured(): boolean {
  return Boolean(MOBILE_APP_CONFIG.deepLinkScheme || MOBILE_APP_CONFIG.playStoreUrl);
}

/**
 * Safe client platform detection
 */
export function getClientPlatform(): "android" | "ios" | "desktop" {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "desktop";
  }
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
  if (/android/i.test(ua)) {
    return "android";
  }
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
    return "ios";
  }
  return "desktop";
}

export interface OpenAppOptions {
  /** Optional in-app target route, e.g. "home", "menu", "orders" */
  path?: string;
  /** Callback fired if the mobile app is not yet published/configured */
  onUnconfigured?: () => void;
}

/**
 * Executes the mobile app open flow:
 * 1. If mobile app is installed: opens the native app via deep link.
 * 2. If mobile app is NOT installed: falls back to Google Play Store (or App Store on iOS).
 * 3. If pre-release (app not built/configured yet): triggers safe unconfigured callback without fake URLs.
 *
 * Routing and State Safety:
 * - Does NOT clear session or auth cookies.
 * - Does NOT clear guest cart or localStorage.
 * - Does NOT clear sessionStorage.
 * - Does NOT trigger unintended redirects.
 */
export function openNutriFlexsApp(options: OpenAppOptions = {}) {
  if (typeof window === "undefined") return;

  const platform = getClientPlatform();
  const { deepLinkScheme, playStoreUrl, appStoreUrl, fallbackTimeoutMs } = MOBILE_APP_CONFIG;
  const targetPath = options.path ? options.path.replace(/^\//, "") : "";

  // 1. Pre-release / unconfigured state: Do not invent fake URLs
  if (!deepLinkScheme && !playStoreUrl) {
    if (options.onUnconfigured) {
      options.onUnconfigured();
    }
    return;
  }

  // 2. Desktop browser flow
  if (platform === "desktop") {
    if (playStoreUrl) {
      window.open(playStoreUrl, "_blank", "noopener,noreferrer");
    } else if (options.onUnconfigured) {
      options.onUnconfigured();
    }
    return;
  }

  // 3. Mobile browser flow (Android / iOS)
  const storeUrl = platform === "ios" && appStoreUrl ? appStoreUrl : playStoreUrl;

  if (deepLinkScheme) {
    const deepLinkUrl = `${deepLinkScheme}${targetPath}`;
    const startTime = Date.now();
    let hasLeftBrowser = false;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hasLeftBrowser = true;
      }
    };

    const handlePageHide = () => {
      hasLeftBrowser = true;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange, { once: true });
    window.addEventListener("pagehide", handlePageHide, { once: true });

    // Trigger deep link
    window.location.href = deepLinkUrl;

    // Timeout fallback for when the native app is not installed
    setTimeout(() => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);

      // If user remained on page (browser stayed active), redirect to store
      if (!hasLeftBrowser && Date.now() - startTime < fallbackTimeoutMs + 600) {
        if (storeUrl) {
          window.location.href = storeUrl;
        } else if (options.onUnconfigured) {
          options.onUnconfigured();
        }
      }
    }, fallbackTimeoutMs);
  } else if (storeUrl) {
    // If only store URL is configured without custom scheme
    window.location.href = storeUrl;
  }
}
