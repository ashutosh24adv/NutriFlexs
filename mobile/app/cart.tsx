import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  Tag,
  CreditCard,
  ChevronRight,
  Info,
  Wallet,
} from 'lucide-react-native';
import Svg, { Polygon } from 'react-native-svg';
import RazorpayCheckout from 'react-native-razorpay';
import { useCartStore } from '../src/store/cartStore';
import { useAuthStore } from '../src/store/authStore';
import { getAuthToken } from '../src/services/apiClient';
import {
  validateCoupon,
  checkoutWithWallet,
} from '../src/services/walletService';
import {
  API_BASE_URL,
  LOCAL_USB_URL,
  LOCAL_LAN_URL,
  showDiagnosticAlert,
} from '../src/constants/config';

export default function CartScreen() {
  const router = useRouter();
  const { user, isAuthenticated, passBalance, updateProfile } = useAuthStore();
  const isAuthed = Boolean(isAuthenticated && user && !user.isGuest);
  const walletBalance = isAuthed ? (passBalance || 0) : 0;

  const {
    itemsList,
    totalCount,
    itemTotal,
    totalProtein,
    totalCalories,
    autoLogToDiary,
    kioskLocation,
    increment,
    decrement,
    clearCart,
    setAutoLogToDiary,
    placeOrder,
  } = useCartStore();

  // Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Wallet Toggle State (defaults to true if wallet has positive balance)
  const [useWallet, setUseWallet] = useState<boolean>(true);

  // Payment State
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [showSimulatedSheet, setShowSimulatedSheet] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<{
    orderId: string;
    razorpayOrderId: string;
    amount: number;
  } | null>(null);
  const [selectedUpi, setSelectedUpi] = useState('Google Pay');

  // Detect whether native Razorpay module is linked or running in standard Expo Go
  const isNativeRazorpayAvailable =
    typeof RazorpayCheckout !== 'undefined' &&
    typeof (RazorpayCheckout as any)?.open === 'function';

  // Bill Calculations
  const subtotal = itemTotal;
  const discount = Math.min(subtotal, couponDiscount);
  const netFood = Math.max(0, subtotal - discount);
  const taxesAndPackaging = netFood > 0 ? Math.round(netFood * 0.05) + 15 : 0;
  const totalBill = netFood + taxesAndPackaging;

  // Wallet deduction: can cover up to 100% of totalBill
  const maxWalletDeduction = (useWallet && walletBalance > 0)
    ? Math.min(walletBalance, totalBill)
    : 0;
  const finalPayable = Math.max(0, totalBill - maxWalletDeduction);

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
   * Completes post-payment verification and diary logging
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
      if (maxWalletDeduction > 0) {
        const remaining = Math.max(0, walletBalance - maxWalletDeduction);
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
      placeOrder(orderId);
      setIsProcessingPayment(false);
      setShowSimulatedSheet(false);

      // Navigate to order screen
      router.push(`/orders/${orderId}`);
    } catch (err: any) {
      console.error('Post-verification handling error:', err);
      placeOrder(orderId);
      setIsProcessingPayment(false);
      setShowSimulatedSheet(false);
      router.push(`/orders/${orderId}`);
    }
  };

  /**
   * Main checkout entry point:
   * - If wallet covers 100% (finalPayable === 0), checkout directly via POST /api/mobile/orders/wallet-checkout
   * - If partial or no wallet, pay remainder via Razorpay
   */
  const handleInitiateCheckout = async () => {
    if (itemsList.length === 0) return;

    setIsProcessingPayment(true);

    // CASE 1: 100% Covered by Wallet
    if (finalPayable === 0 && maxWalletDeduction > 0) {
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
            : Math.max(0, walletBalance - maxWalletDeduction);
          updateProfile({ passBalance: remaining });

          const orderId = walletResult.orderId || walletResult.order?.id || `NF-${Math.floor(1000 + Math.random() * 9000)}`;

          // Auto-log to diary if toggled
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

          placeOrder(orderId);
          setIsProcessingPayment(false);
          router.push(`/orders/${orderId}`);
          return;
        } else {
          throw new Error(walletResult.error || 'Wallet payment was not accepted');
        }
      } catch (walletErr: any) {
        setIsProcessingPayment(false);
        Alert.alert(
          'Wallet Checkout',
          walletErr?.message || 'Wallet checkout could not be completed. You can pay with Razorpay or retry.'
        );
        return;
      }
    }

    // CASE 2: Pay via Razorpay (either full or remainder)
    setProcessingStatus('Creating your order...');

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
            walletAmountUsed: maxWalletDeduction,
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
        console.warn(`[CartCheckout] Failed connecting to ${baseUrl}:`, fetchErr?.message || fetchErr);
      }
    }

    if (!res) {
      setIsProcessingPayment(false);
      showDiagnosticAlert(lastError, API_BASE_URL, () => {
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
      setIsProcessingPayment(false);
      const errorMessage =
        data?.error ||
        data?.message ||
        `HTTP ${res.status}: Failed to create order or generate Razorpay order ID.`;
      Alert.alert('Order Creation Failed', errorMessage);
      return;
    }

    const razorpayOrderId = String(data.razorpayOrderId).trim();
    if (!razorpayOrderId.startsWith('order_')) {
      setIsProcessingPayment(false);
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

    // If native Razorpay is unavailable (Expo Go without dev build)
    if (!isNativeRazorpayAvailable) {
      setIsProcessingPayment(false);
      Alert.alert(
        'Native Razorpay Notice',
        'Native Razorpay module requires a Development Build. In Expo Go, simulated verification can be enabled for testing.',
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

    // Real Native Razorpay Checkout
    setProcessingStatus('Launching 100% Secure Payment...');
    const options = {
      key: data.keyId || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_nutriflexs_demo',
      order_id: razorpayOrderId,
      amount: amountInPaise,
      currency: 'INR',
      name: 'NutriFlexs',
      description: 'NutriFlexs Fresh Meal Order',
      image: 'https://nutriflexs.com/logo.png',
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
    } catch (error: any) {
      setIsProcessingPayment(false);
      const errorDescription =
        error?.error?.description ||
        error?.description ||
        error?.message ||
        'Payment cancelled';
      const isCancellation =
        errorDescription.toLowerCase().includes('cancel') ||
        errorDescription.toLowerCase().includes('dismiss') ||
        errorDescription.toLowerCase().includes('closed') ||
        error?.code === 0;

      Alert.alert(
        isCancellation ? 'Payment Cancelled' : 'Payment Status',
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
    setIsProcessingPayment(true);
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
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color="#111827" />
          <Text style={styles.backText}>Menu</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Cart & Checkout</Text>

        {itemsList.length > 0 ? (
          <TouchableOpacity onPress={clearCart} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Pickup Kiosk Banner */}
        <View style={styles.kioskBanner}>
          <View style={styles.kioskIconContainer}>
            <MapPin size={20} color="#1D4D3E" />
          </View>
          <View style={styles.kioskInfo}>
            <View style={styles.kioskTitleRow}>
              <Text style={styles.kioskName}>{kioskLocation}</Text>
              <View style={styles.readyPill}>
                <Clock size={11} color="#1D4D3E" />
                <Text style={styles.readyPillText}>Ready in ~5 mins</Text>
              </View>
            </View>
            <Text style={styles.kioskSubtext}>
              Express Counter outside Gym Exit • Fast Pickup
            </Text>
          </View>
        </View>

        {/* Empty Cart State */}
        {itemsList.length === 0 ? (
          <View style={styles.emptyCartCard}>
            <Text style={styles.emptyTitle}>Your cart is currently empty</Text>
            <Text style={styles.emptySubtitle}>
              Select your post-workout shake or high-protein meal to fuel up!
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(order)')}
              style={styles.browseMenuBtn}
            >
              <Text style={styles.browseMenuBtnText}>Browse Fuel Menu</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Cart Items List */}
            <View style={styles.itemsCard}>
              <Text style={styles.cardHeaderTitle}>Order Items ({totalCount})</Text>

              {itemsList.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.itemRow,
                    index === itemsList.length - 1 && styles.itemRowLast,
                  ]}
                >
                  {/* Veg / Non-Veg Icon */}
                  <View
                    style={[
                      styles.fssaiIconBox,
                      item.isVeg ? styles.fssaiVegBox : styles.fssaiNonVegBox,
                    ]}
                  >
                    {item.isVeg ? (
                      <View style={styles.fssaiVegDot} />
                    ) : (
                      <Svg width={7} height={7} viewBox="0 0 10 10">
                        <Polygon points="5,1 9,9 1,9" fill="#8B4513" />
                      </Svg>
                    )}
                  </View>

                  {/* Name and Macros */}
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemMacros}>
                      {item.proteinGrams}g Protein • {item.calories} kcal
                    </Text>
                    <Text style={styles.itemUnitPrice}>₹{item.price}</Text>
                  </View>

                  {/* Stepper - 1 + */}
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => decrement(item.id)}
                      style={styles.stepperBtn}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 4 }}
                    >
                      <Text style={styles.stepperSymbol}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperNumber}>{item.quantity}</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => increment(item.id)}
                      style={styles.stepperBtn}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
                    >
                      <Text style={styles.stepperSymbol}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Total Meal Fuel Macro Summary Bar */}
              <View style={styles.macroSummaryBar}>
                <Sparkles size={16} color="#1D4D3E" />
                <Text style={styles.macroSummaryText}>
                  Total Meal Fuel:{' '}
                  <Text style={styles.macroSummaryHighlight}>
                    {totalProtein}g Protein • {totalCalories} kcal
                  </Text>
                </Text>
              </View>
            </View>

            {/* Auto-Log to Health Diary Toggle */}
            <View style={styles.optionCard}>
              <View style={styles.optionLeft}>
                <View style={styles.optionIconPill}>
                  <CheckCircle size={18} color="#1D4D3E" />
                </View>
                <View style={styles.optionTexts}>
                  <Text style={styles.optionTitle}>
                    Auto-log this meal to Health Diary
                  </Text>
                  <Text style={styles.optionSub}>
                    Directly updates today's Calorie Budget & Macro Rings upon counter scan
                  </Text>
                </View>
              </View>
              <Switch
                value={autoLogToDiary}
                onValueChange={setAutoLogToDiary}
                trackColor={{ false: '#D1D5DB', true: '#1D4D3E' }}
                thumbColor={autoLogToDiary ? '#FFFFFF' : '#F9FAFB'}
              />
            </View>

            {/* NutriFlexs Wallet & Coupon Section */}
            <View style={styles.benefitsCard}>
              <View style={styles.benefitsHeader}>
                <Tag size={18} color="#1D4D3E" />
                <Text style={styles.benefitsTitle}>Wallet & Offers</Text>
              </View>

              {/* NutriFlexs Wallet Balance Toggle */}
              <View style={styles.walletRow}>
                <View style={styles.walletIconBox}>
                  <Wallet size={18} color="#1D4D3E" />
                </View>
                <View style={styles.walletDetails}>
                  <Text style={styles.walletName}>
                    Use Wallet Balance (₹{walletBalance.toLocaleString('en-IN')} available)
                  </Text>
                  <Text style={styles.walletSub}>
                    {walletBalance > 0
                      ? maxWalletDeduction >= totalBill
                        ? '100% of order covered by your wallet'
                        : `₹${maxWalletDeduction} deducted from wallet`
                      : 'No wallet balance • Top-up in Profile to enable 1-tap checkout'}
                  </Text>
                </View>
                <Switch
                  value={walletBalance > 0 ? useWallet : false}
                  onValueChange={walletBalance > 0 ? setUseWallet : undefined}
                  disabled={walletBalance <= 0}
                  trackColor={{ false: '#D1D5DB', true: '#1D4D3E' }}
                  thumbColor={useWallet && walletBalance > 0 ? '#FFFFFF' : '#F9FAFB'}
                />
              </View>

              {/* Divider */}
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
                      couponMessage.isError
                        ? styles.codeMsgError
                        : styles.codeMsgSuccess,
                    ]}
                  >
                    {couponMessage.text}
                  </Text>
                )}
              </View>
            </View>

            {/* Itemized Bill Details */}
            <View style={styles.billCard}>
              <Text style={styles.cardHeaderTitle}>Bill Details</Text>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item Total</Text>
                <Text style={styles.billValue}>₹{subtotal}</Text>
              </View>

              {discount > 0 && (
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, styles.discountText]}>
                    Coupon Discount ({appliedCoupon})
                  </Text>
                  <Text style={[styles.billValue, styles.discountText]}>
                    −₹{discount}
                  </Text>
                </View>
              )}

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>
                  Taxes & Eco Packaging (5% F&B GST + ₹15)
                </Text>
                <Text style={styles.billValue}>₹{taxesAndPackaging}</Text>
              </View>

              {maxWalletDeduction > 0 && (
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, styles.walletUsedText]}>
                    NutriFlexs Wallet Used
                  </Text>
                  <Text style={[styles.billValue, styles.walletUsedText]}>
                    −₹{maxWalletDeduction}
                  </Text>
                </View>
              )}

              <View style={styles.billDivider} />

              <View style={styles.toPayRow}>
                <View>
                  <Text style={styles.toPayTitle}>To Pay</Text>
                  <Text style={styles.toPaySub}>Includes all taxes & packaging</Text>
                </View>
                <Text style={styles.toPayAmount}>₹{finalPayable}</Text>
              </View>
            </View>

            {/* 100% Secure Payment Trust Badge */}
            <View style={styles.trustBadge}>
              <ShieldCheck size={16} color="#059669" />
              <Text style={styles.trustBadgeText}>
                100% Secure Payment • Bank Grade Protection
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Primary Bottom CTA */}
      {itemsList.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleInitiateCheckout}
            disabled={isProcessingPayment}
            style={[styles.payButton, isProcessingPayment && styles.payButtonDisabled]}
          >
            {isProcessingPayment ? (
              <View style={styles.processingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.payBtnProcessingText}>
                  {processingStatus || 'Connecting to Secure Checkout...'}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.payBtnLeft}>
                  <Text style={styles.payBtnAmount}>₹{finalPayable}</Text>
                  <Text style={styles.payBtnItems}>
                    {totalCount} {totalCount === 1 ? 'Item' : 'Items'}
                    {maxWalletDeduction > 0 ? ` • ₹${maxWalletDeduction} from wallet` : ' • Cult.fit HSR'}
                  </Text>
                </View>
                <View style={styles.payBtnRight}>
                  <Text style={styles.payBtnText}>
                    {finalPayable === 0
                      ? 'Pay with NutriFlexs Wallet'
                      : `Pay ₹${finalPayable} via Razorpay / UPI`}
                  </Text>
                  <ChevronRight size={18} color="#FFFFFF" />
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Fallback Simulated Verification Sheet for Expo Go UI Review */}
      {showSimulatedSheet && pendingOrderData && (
        <View style={styles.modalOverlay}>
          <View style={styles.paymentSheet}>
            <View style={styles.paymentSheetHeader}>
              <View style={styles.razorpayBrand}>
                <CreditCard size={20} color="#1D4D3E" />
                <Text style={styles.razorpayBrandText}>100% Secure Payment (Expo Go Preview)</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSimulatedSheet(false)}
                disabled={isProcessingPayment}
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
                disabled={isProcessingPayment}
                style={styles.confirmPayBtn}
              >
                <Text style={styles.confirmPayText}>
                  {isProcessingPayment ? 'Processing...' : `Confirm ₹${finalPayable} Test Payment`}
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
    backgroundColor: '#F7F8F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EBECE8',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  kioskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EBECE8',
    marginBottom: 14,
  },
  kioskIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E8F1ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  kioskInfo: {
    flex: 1,
  },
  kioskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  kioskName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#111827',
  },
  readyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F1ED',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  readyPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1D4D3E',
  },
  kioskSubtext: {
    fontSize: 11.5,
    color: '#6B7280',
  },
  emptyCartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#EBECE8',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 18,
  },
  browseMenuBtn: {
    backgroundColor: '#1D4D3E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  browseMenuBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  itemsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EBECE8',
    marginBottom: 14,
  },
  cardHeaderTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemRowLast: {
    borderBottomWidth: 0,
  },
  fssaiIconBox: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fssaiVegBox: {
    borderColor: '#16A34A',
  },
  fssaiVegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  fssaiNonVegBox: {
    borderColor: '#8B4513',
  },
  itemDetails: {
    flex: 1,
    paddingRight: 8,
  },
  itemName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
  },
  itemMacros: {
    fontSize: 11,
    color: '#1D4D3E',
    fontWeight: '600',
    marginTop: 2,
  },
  itemUnitPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 2,
  },
  stepperContainer: {
    width: 80,
    height: 32,
    backgroundColor: '#1D4D3E',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  stepperBtn: {
    paddingHorizontal: 4,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperSymbol: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  stepperNumber: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  macroSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F1ED',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 12,
    gap: 8,
  },
  macroSummaryText: {
    fontSize: 12,
    color: '#1D4D3E',
    fontWeight: '600',
    flex: 1,
  },
  macroSummaryHighlight: {
    fontWeight: '800',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EBECE8',
    marginBottom: 14,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  optionIconPill: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#E8F1ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  optionTexts: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
  },
  optionSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  benefitsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EBECE8',
    marginBottom: 14,
  },
  benefitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  benefitsTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#111827',
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
    backgroundColor: '#E8F1ED',
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
    color: '#1D4D3E',
  },
  walletSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  subDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  couponSection: {},
  couponLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#374151',
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
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#111827',
  },
  applyBtn: {
    backgroundColor: '#1D4D3E',
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
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EBECE8',
    marginBottom: 14,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  billLabel: {
    fontSize: 12.5,
    color: '#4B5563',
  },
  billValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  discountText: {
    color: '#059669',
    fontWeight: '700',
  },
  walletUsedText: {
    color: '#1D4D3E',
    fontWeight: '700',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#EBECE8',
    marginVertical: 10,
  },
  toPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  toPayTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  toPaySub: {
    fontSize: 10.5,
    color: '#6B7280',
    marginTop: 1,
  },
  toPayAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  trustBadgeText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EBECE8',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
  },
  payButton: {
    backgroundColor: '#1D4D3E',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payButtonDisabled: {
    opacity: 0.85,
  },
  payBtnLeft: {
    justifyContent: 'center',
  },
  payBtnAmount: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  payBtnItems: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  payBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  payBtnProcessingText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
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
    color: '#1D4D3E',
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
    borderColor: '#1D4D3E',
    backgroundColor: '#E8F1ED',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#1D4D3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1D4D3E',
  },
  upiMethodText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
  },
  confirmPayBtn: {
    backgroundColor: '#1D4D3E',
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
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
  },
});
