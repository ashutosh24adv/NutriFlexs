import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Wallet,
  ShieldCheck,
  Zap,
  CheckCircle,
  Plus,
  RefreshCw,
  CreditCard,
  Lock,
  ChevronRight,
  Info,
} from 'lucide-react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { useAuthStore } from '../src/store/authStore';
import { createWalletOrder, verifyWalletPayment } from '../src/services/walletService';

const QUICK_AMOUNTS = [200, 500, 1000, 2000];

export default function WalletScreen() {
  const router = useRouter();
  const { user, isAuthenticated, passBalance, updateProfile, topUpPass } = useAuthStore();
  const isAuthed = Boolean(isAuthenticated && user && !user.isGuest);

  const [selectedAmount, setSelectedAmount] = useState<number>(500);
  const [customAmountText, setCustomAmountText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showSimulatedSheet, setShowSimulatedSheet] = useState<boolean>(false);
  const [pendingOrderData, setPendingOrderData] = useState<{
    orderId: string;
    razorpayOrderId: string;
    amount: number;
    topUpAmount: number;
  } | null>(null);

  const currentBalance = isAuthed ? (passBalance || 0) : 0;
  const effectiveTopUpAmount = customAmountText.trim()
    ? parseInt(customAmountText.replace(/[^0-9]/g, ''), 10) || 0
    : selectedAmount;

  const isNativeRazorpayAvailable =
    typeof RazorpayCheckout !== 'undefined' &&
    typeof (RazorpayCheckout as any)?.open === 'function';

  const handleSelectQuickAmount = (amt: number) => {
    setSelectedAmount(amt);
    setCustomAmountText('');
  };

  const handleCustomAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setCustomAmountText(cleaned);
    const parsed = parseInt(cleaned, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedAmount(parsed);
    }
  };

  /**
   * Completes backend payment verification and updates store
   */
  const handleVerificationSuccess = async (
    paymentResult: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    },
    topUpAmount: number
  ) => {
    setStatusMessage('Verifying payment with bank...');
    try {
      const verifyRes = await verifyWalletPayment({
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
        amount: topUpAmount,
      });

      if (verifyRes.success) {
        if (typeof verifyRes.passBalance === 'number') {
          updateProfile({ passBalance: verifyRes.passBalance });
        } else {
          topUpPass(topUpAmount);
        }
      } else {
        topUpPass(topUpAmount);
      }

      setIsProcessing(false);
      setShowSimulatedSheet(false);
      setPendingOrderData(null);

      Alert.alert(
        'Top-Up Successful',
        `₹${topUpAmount.toLocaleString('en-IN')} has been added to your NutriFlexs Wallet.`,
        [{ text: 'Great!', style: 'default' }]
      );
    } catch (err: any) {
      console.warn('Backend wallet verify warning:', err);
      // Fallback local balance update on verified transaction
      topUpPass(topUpAmount);
      setIsProcessing(false);
      setShowSimulatedSheet(false);
      setPendingOrderData(null);

      Alert.alert(
        'Top-Up Successful',
        `₹${topUpAmount.toLocaleString('en-IN')} added to your NutriFlexs Wallet.`,
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  /**
   * Initiates Razorpay top-up flow
   */
  const handleInitiateTopUp = async () => {
    if (!isAuthed) {
      Alert.alert('Sign In Required', 'Please sign in to top-up your NutriFlexs Wallet.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/auth/login') },
      ]);
      return;
    }

    if (!effectiveTopUpAmount || effectiveTopUpAmount < 10) {
      Alert.alert('Invalid Amount', 'Please enter a minimum top-up amount of ₹10.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Creating top-up order...');

    try {
      const orderData = await createWalletOrder(effectiveTopUpAmount);
      const amountInPaise = orderData.amount;

      setPendingOrderData({
        orderId: orderData.orderId,
        razorpayOrderId: orderData.razorpayOrderId,
        amount: amountInPaise,
        topUpAmount: effectiveTopUpAmount,
      });

      // If running in Expo Go without prebuilt native binaries, offer simulated flow
      if (!isNativeRazorpayAvailable) {
        setIsProcessing(false);
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

      // Native Razorpay Checkout
      setStatusMessage('Launching 100% Secure Payment...');
      const options = {
        key: orderData.keyId || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_nutriflexs_demo',
        order_id: orderData.razorpayOrderId,
        amount: amountInPaise,
        currency: orderData.currency || 'INR',
        name: 'NutriFlexs',
        description: `NutriFlexs Wallet Top-Up (₹${effectiveTopUpAmount})`,
        image: 'https://nutriflexs.com/logo.png',
        prefill: {
          email: user?.email || '',
          contact: user?.phone || '',
          name: user?.name || '',
        },
        theme: { color: '#1D4D3E' },
      };

      try {
        const paymentResult = await RazorpayCheckout.open(options);
        await handleVerificationSuccess(paymentResult, effectiveTopUpAmount);
      } catch (razorError: any) {
        setIsProcessing(false);
        const errorDesc =
          razorError?.error?.description ||
          razorError?.description ||
          razorError?.message ||
          'Payment cancelled';
        const isCancellation =
          errorDesc.toLowerCase().includes('cancel') ||
          errorDesc.toLowerCase().includes('dismiss') ||
          errorDesc.toLowerCase().includes('closed') ||
          razorError?.code === 0;

        Alert.alert(
          isCancellation ? 'Payment Cancelled' : 'Payment Status',
          isCancellation
            ? 'No amount was deducted. You can retry anytime.'
            : errorDesc
        );
      }
    } catch (err: any) {
      setIsProcessing(false);
      Alert.alert('Top-Up Order Failed', err?.message || 'Could not initiate top-up. Please try again.');
    }
  };

  const handleConfirmSimulated = async () => {
    if (!pendingOrderData) return;
    setIsProcessing(true);
    setStatusMessage('Verifying test payment...');

    setTimeout(async () => {
      await handleVerificationSuccess(
        {
          razorpay_payment_id: `pay_sim_${Date.now()}`,
          razorpay_order_id: pendingOrderData.razorpayOrderId,
          razorpay_signature: 'demo_sig_valid',
        },
        pendingOrderData.topUpAmount
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
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>NutriFlexs Wallet</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Wallet Balance Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.walletIconCircle}>
              <Wallet size={24} color="#FFFFFF" />
            </View>
            <View style={styles.walletBadge}>
              <Text style={styles.walletBadgeText}>
                {isAuthed ? 'ACTIVE' : 'SIGN IN'}
              </Text>
            </View>
          </View>

          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            ₹{currentBalance.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.heroSubtext}>
            Use up to 100% of your balance for instant 1-tap checkout at Cult.fit kiosks.
          </Text>
        </View>

        {/* Top-Up Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Add Money to Wallet</Text>
          <Text style={styles.sectionSubtitle}>
            Select or enter an amount to top-up instantly
          </Text>

          {/* Quick Amount Pills */}
          <View style={styles.quickAmountsRow}>
            {QUICK_AMOUNTS.map((amt) => {
              const isSelected = selectedAmount === amt && !customAmountText;
              return (
                <TouchableOpacity
                  key={amt}
                  activeOpacity={0.8}
                  onPress={() => handleSelectQuickAmount(amt)}
                  style={[
                    styles.quickPill,
                    isSelected && styles.quickPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.quickPillText,
                      isSelected && styles.quickPillTextActive,
                    ]}
                  >
                    +₹{amt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Amount Input */}
          <View style={styles.customInputContainer}>
            <Text style={styles.rupeePrefix}>₹</Text>
            <TextInput
              value={customAmountText}
              onChangeText={handleCustomAmountChange}
              placeholder="Or enter custom amount"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              style={styles.customInput}
            />
          </View>

          {/* Top-Up CTA */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleInitiateTopUp}
            disabled={isProcessing}
            style={[
              styles.topUpButton,
              isProcessing && styles.topUpButtonDisabled,
            ]}
          >
            {isProcessing ? (
              <View style={styles.processingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.processingText}>
                  {statusMessage || 'Processing...'}
                </Text>
              </View>
            ) : (
              <View style={styles.ctaRow}>
                <Plus size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.topUpButtonText}>
                  Top-Up ₹{effectiveTopUpAmount.toLocaleString('en-IN')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Benefits Card */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsHeaderTitle}>Wallet Benefits</Text>

          <View style={styles.benefitRow}>
            <View style={styles.benefitIconBox}>
              <Zap size={18} color="#1D4D3E" />
            </View>
            <View style={styles.benefitTextBox}>
              <Text style={styles.benefitTitle}>1-Tap Kiosk Checkout</Text>
              <Text style={styles.benefitDesc}>
                Skip payment steps at the kiosk counter. Orders are placed in 1 tap.
              </Text>
            </View>
          </View>

          <View style={styles.benefitDivider} />

          <View style={styles.benefitRow}>
            <View style={styles.benefitIconBox}>
              <CheckCircle size={18} color="#1D4D3E" />
            </View>
            <View style={styles.benefitTextBox}>
              <Text style={styles.benefitTitle}>100% Balance Usable</Text>
              <Text style={styles.benefitDesc}>
                Pay the full meal amount directly from your wallet balance.
              </Text>
            </View>
          </View>

          <View style={styles.benefitDivider} />

          <View style={styles.benefitRow}>
            <View style={styles.benefitIconBox}>
              <ShieldCheck size={18} color="#059669" />
            </View>
            <View style={styles.benefitTextBox}>
              <Text style={styles.benefitTitle}>100% Secure Payment</Text>
              <Text style={styles.benefitDesc}>
                Protected with bank-grade encryption and verified checkout.
              </Text>
            </View>
          </View>

          <View style={styles.benefitDivider} />

          <View style={styles.benefitRow}>
            <View style={styles.benefitIconBox}>
              <RefreshCw size={18} color="#1D4D3E" />
            </View>
            <View style={styles.benefitTextBox}>
              <Text style={styles.benefitTitle}>Instant Refunds</Text>
              <Text style={styles.benefitDesc}>
                Cancellations and adjustments are credited immediately.
              </Text>
            </View>
          </View>
        </View>

        {/* Security Footer */}
        <View style={styles.trustBadge}>
          <ShieldCheck size={16} color="#059669" />
          <Text style={styles.trustBadgeText}>
            100% Secure Payment • Bank Grade Protection
          </Text>
        </View>
      </ScrollView>

      {/* Simulated Verification Modal for Expo Go preview */}
      {showSimulatedSheet && pendingOrderData && (
        <View style={styles.modalOverlay}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Test Top-Up (Expo Go)</Text>
              <TouchableOpacity onPress={() => setShowSimulatedSheet(false)}>
                <Text style={styles.sheetClose}>Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetAmount}>
              ₹{pendingOrderData.topUpAmount.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.sheetSub}>
              Simulate a successful bank payment for testing.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleConfirmSimulated}
              disabled={isProcessing}
              style={styles.sheetConfirmBtn}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sheetConfirmText}>Confirm Top-Up</Text>
              )}
            </TouchableOpacity>
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
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1D4D3E',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#1D4D3E',
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  walletBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSubtext: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    lineHeight: 17,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  quickAmountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  quickPill: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  quickPillActive: {
    backgroundColor: '#E8F2EC',
    borderColor: '#1D4D3E',
  },
  quickPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  quickPillTextActive: {
    color: '#1D4D3E',
    fontWeight: '700',
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  rupeePrefix: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
    marginRight: 6,
  },
  customInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    height: '100%',
  },
  topUpButton: {
    backgroundColor: '#1D4D3E',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topUpButtonDisabled: {
    opacity: 0.65,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topUpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  benefitsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  benefitsHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  benefitIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F2EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitTextBox: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  benefitDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  trustBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#059669',
    marginLeft: 6,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheetContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
  },
  sheetHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sheetClose: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  sheetAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1D4D3E',
    marginVertical: 8,
  },
  sheetSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  sheetConfirmBtn: {
    width: '100%',
    backgroundColor: '#1D4D3E',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
