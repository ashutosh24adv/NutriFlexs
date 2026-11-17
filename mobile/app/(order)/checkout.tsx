import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  WifiOff,
  CheckCircle,
} from 'lucide-react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { useCartStore } from '../../src/store/cartStore';
import { useAuthStore } from '../../src/store/authStore';
import { colors } from '../../src/theme/colors';
import {
  API_BASE_URL,
  CONFIG,
  parseNetworkDiagnostic,
  showDiagnosticAlert,
  type NetworkDiagnostic,
} from '../../src/constants/config';

export interface OrderCreationResult {
  success: boolean;
  orderId?: string;
  razorpayOrderId?: string;
  amountInPaise?: number;
  error?: string;
  diagnostic?: NetworkDiagnostic;
}

export async function createMobileOrder(
  payload: {
    items: any[];
    kioskLocation: string;
    totalAmount: number;
    trainerCode?: string;
    passApplied: boolean;
    user?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  },
  timeoutMs: number = CONFIG.requestTimeoutMs
): Promise<OrderCreationResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE_URL}/api/mobile/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data: any = null;
    try {
      data = await res.json();
    } catch (_parseErr) {
      data = null;
    }

    if (!res.ok || !data?.razorpayOrderId) {
      const errorMessage =
        data?.error ||
        data?.message ||
        `HTTP ${res.status}: Failed to create order or generate Razorpay order ID.`;
      return {
        success: false,
        error: errorMessage,
      };
    }

    const razorpayOrderId = String(data.razorpayOrderId).trim();
    if (!razorpayOrderId.startsWith('order_')) {
      return {
        success: false,
        error: `Invalid Razorpay order ID (${razorpayOrderId}). Expected identifier to start with 'order_'.`,
      };
    }

    const orderId = data.orderId || data.order?.id || `NF-${Math.floor(1000 + Math.random() * 9000)}`;
    const amountInPaise = data.amountInPaise || data.amount || Math.round(payload.totalAmount * 100);

    return {
      success: true,
      orderId,
      razorpayOrderId,
      amountInPaise,
    };
  } catch (fetchErr: any) {
    clearTimeout(timeoutId);
    const diagnostic = parseNetworkDiagnostic(fetchErr, API_BASE_URL);
    return {
      success: false,
      error: diagnostic.message,
      diagnostic,
    };
  }
}

export default function CheckoutScreen() {
  const router = useRouter();
  const {
    itemsList,
    totalCount,
    itemTotal,
    discount,
    taxesAndPackaging,
    toPay,
    passApplied,
    trainerCode,
    trainerDiscountApplied,
    kioskLocation,
    placeOrder,
  } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const isAuthed = Boolean(isAuthenticated && user && !user.isGuest);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [lastDiagnostic, setLastDiagnostic] = useState<NetworkDiagnostic | null>(null);

  // Detect whether real native Razorpay module is linked or running in standard Expo Go
  const isNativeRazorpayAvailable =
    typeof RazorpayCheckout !== 'undefined' &&
    typeof (RazorpayCheckout as any)?.open === 'function';

  const handleInitiateCheckout = async () => {
    if (itemsList.length === 0) {
      Alert.alert('Cart is Empty', 'Please add items to your cart before proceeding to checkout.');
      return;
    }

    setLastDiagnostic(null);
    setIsProcessing(true);
    setProcessingStatus('Connecting to NutriFlexs server...');

    const orderResult = await createMobileOrder({
      items: itemsList.map((item) => ({
        id: item.id,
        productId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        proteinGrams: item.proteinGrams,
        calories: item.calories,
        imageUrl: item.imageUrl,
      })),
      kioskLocation,
      totalAmount: toPay,
      trainerCode: trainerDiscountApplied ? trainerCode : undefined,
      passApplied,
      user: isAuthed && user
        ? { name: user.name, email: user.email, phone: user.phone || '' }
        : { name: '', email: '', phone: '' },
    });

    if (!orderResult.success) {
      setIsProcessing(false);
      setProcessingStatus('');

      if (orderResult.diagnostic) {
        setLastDiagnostic(orderResult.diagnostic);
        showDiagnosticAlert(orderResult.diagnostic, API_BASE_URL, () => handleInitiateCheckout());
      } else {
        Alert.alert('Order Creation Failed', orderResult.error || 'Unknown error occurred.');
      }
      return;
    }

    const { orderId, razorpayOrderId, amountInPaise } = orderResult;

    // Fallback if Razorpay native module is not linked (Expo Go preview)
    if (!isNativeRazorpayAvailable) {
      setIsProcessing(false);
      setProcessingStatus('');
      Alert.alert(
        'Native Razorpay Notice',
        `Razorpay order created successfully (${razorpayOrderId}). Native SDK requires a Development Build (npx expo run:android). Proceed with simulated completion?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Simulate Payment',
            onPress: () => {
              placeOrder(orderId);
              router.push(`/orders/${orderId}`);
            },
          },
        ]
      );
      return;
    }

    // Launch Real Native Razorpay Checkout
    setProcessingStatus('Launching Razorpay SDK...');
    const options = {
      description: `NutriFlexs Express Order (${orderId})`,
      image: 'https://nutri-flexs.vercel.app/logo.png',
      currency: 'INR',
      key: CONFIG.razorpayKeyId,
      amount: amountInPaise || Math.round(toPay * 100),
      name: 'NutriFlexs Real Food Fuel',
      order_id: razorpayOrderId || '',
      prefill: {
        email: isAuthed && user?.email ? user.email : '',
        contact: isAuthed && user?.phone ? user.phone : '',
        name: isAuthed && user?.name ? user.name : '',
      },
      theme: { color: '#1D4D3E' },
    };

    try {
      const paymentResult = await RazorpayCheckout.open(options);
      setProcessingStatus('Verifying payment signature...');

      // Call verification endpoint
      try {
        await fetch(`${API_BASE_URL}/api/payments/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            razorpayOrderId: paymentResult.razorpay_order_id,
            razorpayPaymentId: paymentResult.razorpay_payment_id,
            razorpaySignature: paymentResult.razorpay_signature,
          }),
        });
      } catch (verifyErr) {
        console.warn('Payment verification fetch error:', verifyErr);
      }

      placeOrder(orderId);
      setIsProcessing(false);
      router.push(`/orders/${orderId}`);
    } catch (err: any) {
      setIsProcessing(false);
      setProcessingStatus('');
      console.warn('Razorpay checkout cancelled or failed:', err);
      const errorDescription =
        err?.error?.description ||
        err?.description ||
        'Payment cancelled';
      const isCancellation =
        err?.code === 0 ||
        err?.code === 2 ||
        errorDescription.toLowerCase().includes('cancel') ||
        errorDescription.toLowerCase().includes('dismiss') ||
        errorDescription.toLowerCase().includes('closed');

      Alert.alert(
        isCancellation ? 'Payment Cancelled' : 'Payment Status',
        isCancellation
          ? 'No amount was deducted. You can retry anytime.'
          : errorDescription
      );
    }
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Checkout</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Kiosk / Pickup Location */}
        <View style={styles.card}>
          <View style={styles.kioskRow}>
            <View style={styles.kioskIconContainer}>
              <MapPin size={18} color={colors.brandGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kioskLabel}>EXPRESS PICKUP KIOSK</Text>
              <Text style={styles.kioskName}>{kioskLocation}</Text>
            </View>
            <View style={styles.badgeRow}>
              <Clock size={12} color={colors.brandGreen} />
              <Text style={styles.badgeText}>Ready in 5m</Text>
            </View>
          </View>
        </View>

        {/* Diagnostic Host Resolution Error Banner */}
        {lastDiagnostic && (
          <View style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <WifiOff size={20} color={colors.status.error} />
              <Text style={styles.errorTitle}>{lastDiagnostic.title}</Text>
            </View>
            <Text style={styles.errorMessage}>{lastDiagnostic.message}</Text>
            <View style={styles.hintsBox}>
              <Text style={styles.hintsTitle}>Troubleshooting Steps:</Text>
              {lastDiagnostic.hints.map((hint, index) => (
                <Text key={index} style={styles.hintItem}>
                  {index + 1}. {hint}
                </Text>
              ))}
            </View>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleInitiateCheckout}
              disabled={isProcessing}
            >
              <RefreshCw size={14} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Server & API Endpoint Diagnostic Card */}
        <View style={styles.diagnosticPill}>
          <View style={styles.dotOnline} />
          <Text style={styles.diagnosticText} numberOfLines={1}>
            API Host: {API_BASE_URL}
          </Text>
        </View>

        {/* Order Items Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Summary ({totalCount} items)</Text>
          {itemsList.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.qtyBadge}>
                <Text style={styles.qtyText}>{item.quantity}×</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.itemSubtext}>
                  {item.proteinGrams}g Protein • {item.calories} kcal
                </Text>
              </View>
              <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
            </View>
          ))}
        </View>

        {/* Price Breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bill Details</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Item Total</Text>
            <Text style={styles.priceValue}>₹{itemTotal}</Text>
          </View>

          {discount > 0 && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.brandGreen }]}>
                {passApplied ? 'NutriFlexs Wallet Discount (35%)' : `Coupon Code (${trainerCode})`}
              </Text>
              <Text style={[styles.priceValue, { color: colors.brandGreen }]}>-₹{discount}</Text>
            </View>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>GST & Eco-Friendly Packaging</Text>
            <Text style={styles.priceValue}>₹{taxesAndPackaging}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>To Pay</Text>
            <Text style={styles.totalValue}>₹{toPay}</Text>
          </View>
        </View>

        {/* Security & Verification Guarantee */}
        <View style={styles.securityBox}>
          <ShieldCheck size={16} color={colors.brandGreen} />
          <Text style={styles.securityText}>
            100% Secure Payment • Bank Grade Protection
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarLeft}>
          <Text style={styles.bottomBarAmount}>₹{toPay}</Text>
          <Text style={styles.bottomBarItems}>{totalCount} items to express pickup</Text>
        </View>
        <TouchableOpacity
          style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
          onPress={handleInitiateCheckout}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.payButtonText}>
                {processingStatus || 'Connecting...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.payButtonText}>Pay ₹{toPay} via Razorpay</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  kioskRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kioskIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.brandGreenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  kioskLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.muted,
    letterSpacing: 0.5,
  },
  kioskName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandGreenSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brandGreen,
  },
  diagnosticPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  dotOnline: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brandGreen,
    marginRight: 8,
  },
  diagnosticText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: 'monospace',
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.status.error,
  },
  errorMessage: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
    marginBottom: 8,
  },
  hintsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  hintsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  hintItem: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 16,
    marginBottom: 2,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.status.error,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  qtyBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  itemSubtext: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  priceLabel: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.brandGreen,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  securityText: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomBarLeft: {
    flex: 1,
  },
  bottomBarAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
  },
  bottomBarItems: {
    fontSize: 11,
    color: colors.text.muted,
  },
  payButton: {
    backgroundColor: colors.brandGreen,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
