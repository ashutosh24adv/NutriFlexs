import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  MapPin,
  Clock,
  ShieldCheck,
  RefreshCw,
  WifiOff,
  Tag,
  Wallet,
  ChevronRight,
  CreditCard,
} from 'lucide-react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { useCartStore } from '../../src/store/cartStore';
import { useAuthStore } from '../../src/store/authStore';
import { colors } from '../../src/theme/colors';
import { getAuthToken } from '../../src/services/apiClient';
import { sendLocalOrderNotification } from '../../src/services/notifications';
import {
  validateCoupon,
  checkoutWithWallet,
} from '../../src/services/walletService';
import {
  API_BASE_URL,
  LOCAL_USB_URL,
  LOCAL_LAN_URL,
  CONFIG,
  parseNetworkDiagnostic,
  showDiagnosticAlert,
  type NetworkDiagnostic,
} from '../../src/constants/config';

export default function CheckoutScreen() {
  const router = useRouter();
  const {
    itemsList,
    totalCount,
    itemTotal,
    totalProtein,
    totalCalories,
    autoLogToDiary,
    kioskLocation,
    clearCart,
    placeOrder,
  } = useCartStore();

  const { user, isAuthenticated, passBalance, updateProfile } = useAuthStore();
  const isAuthed = Boolean(isAuthenticated && user && !user.isGuest);
  const walletBalance = isAuthed ? (passBalance || 0) : 0;

  // Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Wallet Toggle State (defaults to true if wallet has positive balance)
  const [useWallet, setUseWallet] = useState<boolean>(true);

  // Payment & Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [lastDiagnostic, setLastDiagnostic] = useState<NetworkDiagnostic | null>(null);
  const [showSimulatedSheet, setShowSimulatedSheet] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<{
    orderId: string;
    razorpayOrderId: string;
    amount: number;
  } | null>(null);
  const [selectedUpi, setSelectedUpi] = useState('Google Pay');

  // Detect whether real native Razorpay module is linked or running in standard Expo Go
  const isNativeRazorpayAvailable =
    typeof RazorpayCheckout !== 'undefined' &&
    typeof (RazorpayCheckout as any)?.open === 'function';

  // Bill Calculations (No automatic 35% pass discount; discounts strictly from coupons)
  const subtotal = itemTotal;
  const discount = Math.min(subtotal, couponDiscount);
  const netFood = Math.max(0, subtotal - discount);
  const taxesAndPackaging = netFood > 0 ? Math.round(netFood * 0.05) + 15 : 0;
  const netAmount = netFood + taxesAndPackaging;
  const totalBill = netAmount;

  // Wallet deduction: can cover up to 100% of netAmount
  const walletUsed = (useWallet && walletBalance > 0)
    ? Math.min(walletBalance, netAmount)
    : 0;
  const finalPayable = Math.max(0, netAmount - walletUsed);

  /**
   * Applies coupon via POST /api/mobile/coupons/validate
   */
  const handleApplyCoupon = async () => {
    const codeToTest = couponInput.trim().toUpperCase();
    if (!codeToTest) {
      setCouponMessage({ text: 'Please enter a coupon code', isError: true });
      return;
    }

    setIsValidatingCoupon(true);
    setCouponMessage(null);

    try {
      const res = await validateCoupon(codeToTest, itemTotal);
      if (res.valid) {
        setAppliedCoupon(res.code);
        setCouponDiscount(res.discount);
        setCouponMessage({
          text: res.message || `Coupon ${res.code} applied! Saved ₹${res.discount}`,
          isError: false,
        });
        setCouponInput('');
      } else {
        setCouponMessage({
          text: res.error || res.message || 'Invalid coupon code. Try WELCOME10 or FIT50',
          isError: true,
        });
      }
    } catch (err: any) {
      setCouponMessage({
        text: err?.message || 'Could not validate coupon. Try WELCOME10 or FIT50',
        isError: true,
      });
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponInput('');
    setCouponMessage(null);
  };

  /**
   * Completes post-payment verification, wallet deduction, and diary logging
   */
  const handlePaymentVerificationSuccess = async (
    paymentResult: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    },
    orderId: string
  ) => {
    setProcessingStatus('Verifying payment with bank...');
    const API_BASE = (process.env.EXPO_PUBLIC_API_URL || API_BASE_URL || 'https://nutri-flexs.vercel.app').replace(/\/$/, '');
    const token = await getAuthToken();

    try {
      try {
        await fetch(`${API_BASE}/api/payments/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            orderId,
            razorpayOrderId: paymentResult.razorpay_order_id,
            razorpayPaymentId: paymentResult.razorpay_payment_id,
            razorpaySignature: paymentResult.razorpay_signature,
          }),
        });
      } catch (verifyErr) {
        console.warn('Backend payment verification fetch warning:', verifyErr);
      }

      // If wallet balance was used for part of payment, deduct from authStore
      if (walletUsed > 0) {
        const remaining = Math.max(0, walletBalance - walletUsed);
        updateProfile({ passBalance: remaining });
      }

      // Auto-log to health diary if toggled
      if (autoLogToDiary) {
        setProcessingStatus('Logging meal to Health Diary...');
        try {
          await fetch(`${API_BASE}/api/nutrition/logs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              mealType: 'LUNCH',
              notes: `NutriFlexs Express Order (${orderId}) at ${kioskLocation}`,
              calories: totalCalories,
              protein: totalProtein,
              items: itemsList.map((i) => ({
                name: i.name,
                calories: i.calories,
                protein: i.proteinGrams,
                quantity: i.quantity,
              })),
            }),
          }).catch(() => null);
        } catch (diaryErr) {
          console.warn('Auto-log to health diary warning:', diaryErr);
        }
      }

      // Clear cart & update store order status
      clearCart();
      placeOrder(orderId);
      setIsProcessing(false);
      setShowSimulatedSheet(false);

      // Trigger local notification on order placement
      const kioskDisplayName = kioskLocation || (user as any)?.homeKiosk || 'Cult.fit Express Kiosk';
      sendLocalOrderNotification(
        'Order Confirmed! 🥗',
        `Order Confirmed! Preparing your meal at ${kioskDisplayName}`,
        { orderId, kioskLocation: kioskDisplayName }
      ).catch((notifErr) => console.warn('[Checkout] Order notification warning:', notifErr));

      // Navigate to order screen
      router.push(`/orders/${orderId}`);
    } catch (err: any) {
      console.error('Post-verification handling error:', err);
      clearCart();
      placeOrder(orderId);
      setIsProcessing(false);
      setShowSimulatedSheet(false);
      router.push(`/orders/${orderId}`);
    }
  };

  /**
   * Main checkout handler:
   * - Case A (finalPayable === 0): 100% Wallet checkout via POST /api/mobile/orders/wallet-checkout
   * - Case B (finalPayable > 0): Online / Partial payment via Razorpay SDK
   */
  const handleInitiateCheckout = async () => {
    if (itemsList.length === 0) {
      Alert.alert('Cart is Empty', 'Please add items to your cart before proceeding to checkout.');
      return;
    }

    setLastDiagnostic(null);
    setIsProcessing(true);

    // CASE A: 100% Covered by Wallet (finalPayable === 0)
    if (finalPayable === 0 && (walletUsed > 0 || totalBill === 0)) {
      setProcessingStatus('Processing 100% Wallet Payment...');
      try {
        const walletResult = await checkoutWithWallet({
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
          totalAmount: totalBill,
          discount,
          couponCode: appliedCoupon || undefined,
          user: isAuthed && user
            ? { name: user.name, email: user.email, phone: user.phone || '' }
            : undefined,
        });

        if (walletResult.success) {
          // Deduct from wallet balance in authStore
          const remaining = typeof walletResult.passBalance === 'number'
            ? walletResult.passBalance
            : Math.max(0, walletBalance - walletUsed);
          updateProfile({ passBalance: remaining });

          const orderId = walletResult.orderId || walletResult.order?.id || `NF-${Math.floor(1000 + Math.random() * 9000)}`;

          // Auto-log to health diary if toggled
          if (autoLogToDiary) {
            const API_BASE = (process.env.EXPO_PUBLIC_API_URL || API_BASE_URL || 'https://nutri-flexs.vercel.app').replace(/\/$/, '');
            const token = await getAuthToken();
            fetch(`${API_BASE}/api/nutrition/logs`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                mealType: 'LUNCH',
                notes: `NutriFlexs Express Order (${orderId}) at ${kioskLocation}`,
                calories: totalCalories,
                protein: totalProtein,
                items: itemsList.map((i) => ({
                  name: i.name,
                  calories: i.calories,
                  protein: i.proteinGrams,
                  quantity: i.quantity,
                })),
              }),
            }).catch(() => null);
          }

          clearCart();
          placeOrder(orderId);
          setIsProcessing(false);

          // Trigger local notification on order placement
          const kioskDisplayName = kioskLocation || (user as any)?.homeKiosk || 'Cult.fit Express Kiosk';
          sendLocalOrderNotification(
            'Order Confirmed! 🥗',
            `Order Confirmed! Preparing your meal at ${kioskDisplayName}`,
            { orderId, kioskLocation: kioskDisplayName }
          ).catch((notifErr) => console.warn('[Checkout] Order notification warning:', notifErr));

          router.push(`/orders/${orderId}`);
          return;
        } else {
          throw new Error(walletResult.error || 'Wallet payment was not accepted');
        }
      } catch (walletErr: any) {
        setIsProcessing(false);
        Alert.alert(
          'Wallet Checkout Failed',
          walletErr?.message || 'Wallet checkout could not be completed. You can pay with Razorpay or retry.'
        );
        return;
      }
    }

    // CASE B: Partial / Online Checkout via Razorpay (finalPayable > 0)
    setProcessingStatus('Creating order on NutriFlexs server...');
    const candidateUrls = [API_BASE_URL, LOCAL_USB_URL, LOCAL_LAN_URL];
    const totalAmountInPaise = Math.round(finalPayable * 100);
    const token = await getAuthToken();

    let res: Response | null = null;
    let lastError: any = null;

    for (const baseUrl of candidateUrls) {
      if (!baseUrl) continue;
      try {
        const targetUrl = `${baseUrl.replace(/\/$/, '')}/api/mobile/orders`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
          body: JSON.stringify({
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
            totalAmount: finalPayable,
            discount,
            couponCode: appliedCoupon || undefined,
            walletAmountUsed: walletUsed,
            user: isAuthed && user
              ? { name: user.name, email: user.email, phone: user.phone || '' }
              : { name: 'Guest', email: 'guest@nutriflexs.com', phone: '9999999999' },
          }),
        });

        clearTimeout(timeoutId);
        res = response;
        break;
      } catch (fetchErr: any) {
        lastError = fetchErr;
        console.warn(`[Checkout] Failed connecting to ${baseUrl}:`, fetchErr?.message || fetchErr);
      }
    }

    if (!res) {
      setIsProcessing(false);
      const diagnostic = parseNetworkDiagnostic(lastError, API_BASE_URL);
      setLastDiagnostic(diagnostic);
      showDiagnosticAlert(diagnostic, API_BASE_URL, () => {
        handleInitiateCheckout();
      });
      return;
    }

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok || !data?.razorpayOrderId) {
      setIsProcessing(false);
      const errorMessage =
        data?.error ||
        data?.message ||
        `HTTP ${res.status}: Failed to create order or generate Razorpay order ID.`;
      Alert.alert('Order Creation Failed', errorMessage);
      return;
    }

    const razorpayOrderId = String(data.razorpayOrderId).trim();
    if (!razorpayOrderId.startsWith('order_')) {
      setIsProcessing(false);
      Alert.alert(
        'Order Creation Failed',
        `Invalid Razorpay order ID (${razorpayOrderId}). Expected identifier to start with 'order_'.`
      );
      return;
    }

    const orderId = data.orderId || data.order?.id || `NF-${Math.floor(1000 + Math.random() * 9000)}`;
    const amountInPaise = Math.round(data.amountInPaise || (data.amount > 1000 ? data.amount : totalAmountInPaise));

    const orderPayload = {
      orderId,
      razorpayOrderId,
      amount: amountInPaise,
    };
    setPendingOrderData(orderPayload);

    // Fallback if Razorpay native module is not linked (Expo Go preview)
    if (!isNativeRazorpayAvailable) {
      setIsProcessing(false);
      Alert.alert(
        'Native Razorpay Notice',
        `Razorpay order created successfully (${razorpayOrderId}). Native SDK requires a Development Build (npx expo run:android). Proceed with simulated completion?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Simulate Payment',
            onPress: () => setShowSimulatedSheet(true),
          },
        ]
      );
      return;
    }

    // Launch Real Native Razorpay Checkout
    setProcessingStatus('Launching Razorpay SDK...');
    const options = {
      key: data.keyId || CONFIG.razorpayKeyId || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_nutriflexs_demo',
      order_id: razorpayOrderId,
      amount: amountInPaise,
      currency: 'INR',
      name: 'NutriFlexs Real Food Fuel',
      description: `NutriFlexs Express Order (${orderId})`,
      image: 'https://nutri-flexs.vercel.app/logo.png',
      prefill: {
        email: isAuthed && user?.email ? user.email : '',
        contact: isAuthed && user?.phone ? user.phone : '',
        name: isAuthed && user?.name ? user.name : '',
      },
      theme: { color: '#1D4D3E' },
    };

    try {
      const paymentResult = await RazorpayCheckout.open(options);
      await handlePaymentVerificationSuccess(paymentResult, orderId);
    } catch (err: any) {
      setIsProcessing(false);
      setProcessingStatus('');
      console.warn('Razorpay checkout cancelled or failed:', err);
      const errorDescription =
        err?.error?.description ||
        err?.description ||
        err?.message ||
        'Payment cancelled';
      const isCancellation =
        err?.code === 0 ||
        err?.code === 2 ||
        errorDescription.toLowerCase().includes('cancel') ||
        errorDescription.toLowerCase().includes('dismiss') ||
        errorDescription.toLowerCase().includes('closed');

      Alert.alert(
        isCancellation ? 'Payment Cancelled' : 'Payment Failed',
        isCancellation
          ? 'No amount was deducted. You can retry anytime.'
          : errorDescription
      );
    }
  };

  /**
   * Simulated payment confirmation handler for Expo Go preview mode
   */
  const handleConfirmSimulatedPayment = async () => {
    if (!pendingOrderData) return;
    setIsProcessing(true);
    setProcessingStatus('Verifying simulated payment...');

    setTimeout(async () => {
      await handlePaymentVerificationSuccess(
        {
          razorpay_payment_id: `pay_sim_${Date.now()}`,
          razorpay_order_id: pendingOrderData.razorpayOrderId,
          razorpay_signature: 'demo_sig_valid',
        },
        pendingOrderData.orderId
      );
    }, 1000);
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

        {/* NutriFlexs Wallet & Coupon Offers Section */}
        <View style={styles.card}>
          <View style={styles.benefitsHeader}>
            <Tag size={18} color={colors.brandGreen} />
            <Text style={styles.sectionTitle}>Wallet & Offers</Text>
          </View>

          {/* NutriFlexs Wallet Balance Toggle */}
          <View style={styles.walletRow}>
            <View style={styles.walletIconBox}>
              <Wallet size={18} color={colors.brandGreen} />
            </View>
            <View style={styles.walletDetails}>
              <Text style={styles.walletName}>
                Use Wallet Balance (₹{walletBalance.toLocaleString('en-IN')} available)
              </Text>
              <Text style={styles.walletSub}>
                {walletBalance > 0
                  ? walletUsed >= totalBill
                    ? '100% of order covered by your wallet'
                    : `₹${walletUsed} deducted from wallet`
                  : 'No wallet balance • Top-up in Profile to enable 1-tap checkout'}
              </Text>
            </View>
            <Switch
              value={walletBalance > 0 ? useWallet : false}
              onValueChange={walletBalance > 0 ? setUseWallet : undefined}
              disabled={walletBalance <= 0}
              trackColor={{ false: '#D1D5DB', true: colors.brandGreen }}
              thumbColor={useWallet && walletBalance > 0 ? '#FFFFFF' : '#F9FAFB'}
            />
          </View>

          {/* Sub Divider */}
          <View style={styles.subDivider} />

          {/* Coupon Code Input */}
          <View style={styles.couponSection}>
            <Text style={styles.couponLabel}>Coupon Code</Text>
            {appliedCoupon ? (
              <View style={styles.appliedCodeRow}>
                <View style={styles.appliedCodeChip}>
                  <Text style={styles.appliedCodeText}>
                    ✓ {appliedCoupon} (−₹{couponDiscount} applied)
                  </Text>
                </View>
                <TouchableOpacity onPress={handleRemoveCoupon}>
                  <Text style={styles.removeCodeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.codeInputRow}>
                <TextInput
                  value={couponInput}
                  onChangeText={(text) => {
                    setCouponInput(text);
                    setCouponMessage(null);
                  }}
                  placeholder="e.g. WELCOME10 or FIT50"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                  style={styles.codeInput}
                />
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleApplyCoupon}
                  disabled={isValidatingCoupon}
                  style={styles.applyBtn}
                >
                  {isValidatingCoupon ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.applyBtnText}>Apply</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {couponMessage && (
              <Text
                style={[
                  styles.codeMsgText,
                  couponMessage.isError ? styles.codeMsgError : styles.codeMsgSuccess,
                ]}
              >
                {couponMessage.text}
              </Text>
            )}
          </View>
        </View>

        {/* Price Breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bill Details</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Item Total</Text>
            <Text style={styles.priceValue}>₹{subtotal}</Text>
          </View>

          {discount > 0 && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.brandGreen }]}>
                Coupon Discount ({appliedCoupon})
              </Text>
              <Text style={[styles.priceValue, { color: colors.brandGreen }]}>-₹{discount}</Text>
            </View>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>GST & Eco-Friendly Packaging (5% F&B + ₹15)</Text>
            <Text style={styles.priceValue}>₹{taxesAndPackaging}</Text>
          </View>

          {walletUsed > 0 && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.brandGreen, fontWeight: '700' }]}>
                NutriFlexs Wallet Used
              </Text>
              <Text style={[styles.priceValue, { color: colors.brandGreen, fontWeight: '700' }]}>
                -₹{walletUsed}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.totalLabel}>To Pay</Text>
              <Text style={styles.totalSub}>Includes all taxes & packaging</Text>
            </View>
            <Text style={styles.totalValue}>₹{finalPayable}</Text>
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
          <Text style={styles.bottomBarAmount}>₹{finalPayable}</Text>
          <Text style={styles.bottomBarItems}>
            {totalCount} {totalCount === 1 ? 'item' : 'items'}
            {walletUsed > 0 ? ` • ₹${walletUsed} from wallet` : ' to express pickup'}
          </Text>
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
            <View style={styles.payBtnRow}>
              <Text style={styles.payButtonText}>
                {finalPayable === 0
                  ? 'Pay with NutriFlexs Wallet'
                  : `Pay ₹${finalPayable} via Razorpay`}
              </Text>
              <ChevronRight size={16} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Fallback Simulated Verification Sheet for Expo Go UI Review */}
      {showSimulatedSheet && pendingOrderData && (
        <View style={styles.modalOverlay}>
          <View style={styles.paymentSheet}>
            <View style={styles.paymentSheetHeader}>
              <View style={styles.razorpayBrand}>
                <CreditCard size={20} color={colors.brandGreen} />
                <Text style={styles.razorpayBrandText}>100% Secure Payment (Expo Go Preview)</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSimulatedSheet(false)}
                disabled={isProcessing}
              >
                <Text style={styles.cancelPaymentText}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sheetBody}>
              <Text style={styles.sheetOrderLabel}>NutriFlexs Order • {pendingOrderData.orderId}</Text>
              <Text style={styles.sheetPayAmount}>₹{finalPayable}</Text>
              <Text style={styles.sheetSub}>Select Test Payment Method</Text>

              {['Google Pay', 'PhonePe', 'Paytm UPI', 'Gym Wallet / Card'].map((method) => (
                <TouchableOpacity
                  key={method}
                  activeOpacity={0.7}
                  onPress={() => setSelectedUpi(method)}
                  style={[
                    styles.upiOptionRow,
                    selectedUpi === method && styles.upiOptionRowActive,
                  ]}
                >
                  <View style={styles.radioOuter}>
                    {selectedUpi === method && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.upiMethodText}>{method}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleConfirmSimulatedPayment}
                disabled={isProcessing}
                style={styles.confirmPayBtn}
              >
                <Text style={styles.confirmPayText}>
                  {isProcessing ? 'Processing...' : `Confirm ₹${finalPayable} Test Payment`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    paddingTop: 54,
    paddingBottom: 14,
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
    paddingBottom: 110,
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
  benefitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  walletIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.brandGreenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  walletDetails: {
    flex: 1,
    paddingRight: 10,
  },
  walletName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.brandGreen,
  },
  walletSub: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  subDivider: {
    height: 1,
    backgroundColor: colors.surfaceMuted,
    marginVertical: 12,
  },
  couponSection: {},
  couponLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.text.secondary,
    marginBottom: 6,
  },
  codeInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  codeInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDark,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.text.primary,
  },
  applyBtn: {
    backgroundColor: colors.brandGreen,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  appliedCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  appliedCodeChip: {
    flex: 1,
  },
  appliedCodeText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#065F46',
  },
  removeCodeText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
  },
  codeMsgText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  codeMsgSuccess: {
    color: '#059669',
  },
  codeMsgError: {
    color: '#DC2626',
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
  totalSub: {
    fontSize: 10.5,
    color: colors.text.muted,
    marginTop: 1,
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
    paddingHorizontal: 20,
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
  payBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  payButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  paymentSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  paymentSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  razorpayBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  razorpayBrandText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.brandGreen,
  },
  cancelPaymentText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  sheetBody: {},
  sheetOrderLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  sheetPayAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
    marginVertical: 4,
  },
  sheetSub: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#374151',
    marginTop: 10,
    marginBottom: 8,
  },
  upiOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    gap: 10,
  },
  upiOptionRowActive: {
    borderColor: colors.brandGreen,
    backgroundColor: '#E8F1ED',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brandGreen,
  },
  upiMethodText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
  },
  confirmPayBtn: {
    backgroundColor: colors.brandGreen,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  confirmPayText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
});
