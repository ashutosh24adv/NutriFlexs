import { API_BASE_URL, LOCAL_USB_URL, LOCAL_LAN_URL } from '../config/api';
import { getAuthToken } from './apiClient';

export interface WalletOrderResult {
  orderId: string;
  razorpayOrderId: string;
  amount: number; // in paise
  currency: string;
  keyId?: string;
}

export interface WalletVerifyResult {
  success: boolean;
  passBalance: number;
  user?: any;
  error?: string;
}

const CANDIDATE_URLS = [API_BASE_URL, LOCAL_USB_URL, LOCAL_LAN_URL];

/**
 * Creates a Razorpay order on the backend for wallet top-up
 */
export async function createWalletOrder(amount: number): Promise<WalletOrderResult> {
  const token = await getAuthToken();
  let lastError: any = null;

  for (const base of CANDIDATE_URLS) {
    if (!base) continue;
    const cleanBase = base.replace(/\/$/, '');
    const url = `${cleanBase}/api/mobile/wallet/create-order`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({ amount }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Server returned ${res.status}`);
      }

      const data = await res.json();
      return {
        orderId: data.orderId || data.id,
        razorpayOrderId: data.razorpayOrderId || data.order_id,
        amount: data.amount || Math.round(amount * 100),
        currency: data.currency || 'INR',
        keyId: data.keyId || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_nutriflexs_demo',
      };
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to connect to wallet top-up service');
}

/**
 * Verifies Razorpay payment signature on the backend and updates user's passBalance
 */
export async function verifyWalletPayment(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  amount: number;
}): Promise<WalletVerifyResult> {
  const token = await getAuthToken();
  let lastError: any = null;

  for (const base of CANDIDATE_URLS) {
    if (!base) continue;
    const cleanBase = base.replace(/\/$/, '');
    const url = `${cleanBase}/api/mobile/wallet/verify`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify(payload),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Verification failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      return {
        success: Boolean(data.success),
        passBalance: typeof data.passBalance === 'number' ? data.passBalance : payload.amount,
        user: data.user,
      };
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to verify wallet payment with server');
}

/**
 * Validates a coupon code on the backend
 */
export async function validateCoupon(code: string, subtotal: number): Promise<{
  valid: boolean;
  code: string;
  discount: number;
  finalSubtotal?: number;
  message?: string;
  error?: string;
}> {
  const cleanCode = code.trim().toUpperCase();
  const token = await getAuthToken();

  for (const base of CANDIDATE_URLS) {
    if (!base) continue;
    const cleanBase = base.replace(/\/$/, '');
    const url = `${cleanBase}/api/mobile/coupons/validate`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({ code: cleanCode, subtotal }),
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return {
          valid: Boolean(data.valid),
          code: data.code || cleanCode,
          discount: Number(data.discountAmount ?? data.discount) || 0,
          finalSubtotal: data.finalTotal ?? data.finalSubtotal,
          message: data.message,
          error: data.error,
        };
      }
    } catch {
      // Continue to next URL candidate or fallback
    }
  }

  // Graceful client-side fallback for offline / test coupons
  if (cleanCode === 'WELCOME10') {
    const discount = Math.min(100, Math.round(subtotal * 0.10));
    return {
      valid: true,
      code: 'WELCOME10',
      discount,
      message: `Coupon WELCOME10 applied! Saved ₹${discount}`,
    };
  }

  if (cleanCode === 'FIT50') {
    if (subtotal >= 200) {
      return {
        valid: true,
        code: 'FIT50',
        discount: 50,
        message: 'Coupon FIT50 applied! Saved ₹50',
      };
    } else {
      return {
        valid: false,
        code: 'FIT50',
        discount: 0,
        error: 'FIT50 requires a minimum order of ₹200',
      };
    }
  }

  return {
    valid: false,
    code: cleanCode,
    discount: 0,
    error: 'Invalid coupon code. Try WELCOME10 or FIT50',
  };
}

/**
 * Checks out using wallet balance when wallet covers 100% of the payable amount
 */
export async function checkoutWithWallet(payload: {
  items: any[];
  kioskLocation: string;
  totalAmount: number;
  discount: number;
  couponCode?: string;
  user?: { name: string; email: string; phone?: string };
}): Promise<{ success: boolean; orderId?: string; order?: any; passBalance?: number; error?: string }> {
  const token = await getAuthToken();
  let lastError: any = null;

  for (const base of CANDIDATE_URLS) {
    if (!base) continue;
    const cleanBase = base.replace(/\/$/, '');
    const url = `${cleanBase}/api/mobile/orders/wallet-checkout`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify(payload),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Wallet checkout failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      return {
        success: true,
        orderId: data.orderId || data.order?.id,
        order: data.order,
        passBalance: typeof data.passBalance === 'number' ? data.passBalance : typeof data.walletBalance === 'number' ? data.walletBalance : undefined,
      };
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to complete wallet checkout');
}
