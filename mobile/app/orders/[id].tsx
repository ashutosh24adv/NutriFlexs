import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  MapPin,
  Utensils,
  Dumbbell,
  Sparkles,
  ChevronRight,
} from 'lucide-react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

export default function OrderTrackerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const orderId = params?.id || 'NF-Latest';

  // 5-minute countdown (300 seconds initial, starting at 252s for realistic ~4m12s)
  const [secondsRemaining, setSecondsRemaining] = useState(252);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // SVG Ring calculations
  const totalDuration = 300;
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, (totalDuration - secondsRemaining) / totalDuration));
  const strokeDashoffset = circumference * (1 - progress);

  // Status mapping based on remaining time
  let statusKey: 'ORDER_PLACED' | 'PREPARING' | 'READY_FOR_PICKUP' = 'ORDER_PLACED';
  let statusText = 'ORDER PLACED';
  let statusDesc = 'Kitchen display confirmed at Cult.fit HSR';
  let activeStep = 1;

  if (secondsRemaining <= 45) {
    statusKey = 'READY_FOR_PICKUP';
    statusText = 'READY FOR PICKUP';
    statusDesc = 'Your fresh order is at the Express Counter!';
    activeStep = 3;
  } else if (secondsRemaining <= 260) {
    statusKey = 'PREPARING';
    statusText = 'PREPARING FRESH';
    statusDesc = 'Chef is grilling paneer & cold-pressing shakes';
    activeStep = 2;
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.replace('/(order)/orders')}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color="#111827" />
          <Text style={styles.backText}>Orders</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Express Tracker</Text>
        <View style={styles.kioskPill}>
          <Text style={styles.kioskPillText}>Cult.fit HSR</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Countdown Hero Card with Circular SVG Ring */}
        <View style={styles.heroCard}>
          <View style={styles.statusBadgeRow}>
            <View
              style={[
                styles.statusBadge,
                statusKey === 'READY_FOR_PICKUP'
                  ? styles.statusReady
                  : statusKey === 'PREPARING'
                  ? styles.statusPreparing
                  : styles.statusPlaced,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  statusKey === 'READY_FOR_PICKUP'
                    ? styles.statusReadyText
                    : statusKey === 'PREPARING'
                    ? styles.statusPreparingText
                    : styles.statusPlacedText,
                ]}
              >
                ● {statusText}
              </Text>
            </View>
            <Text style={styles.kioskCounterText}>Express Counter #1</Text>
          </View>

          {/* SVG Circular Countdown Ring */}
          <View style={styles.ringWrapper}>
            <Svg width={160} height={160} viewBox="0 0 160 160">
              {/* Background Track */}
              <Circle
                cx={80}
                cy={80}
                r={radius}
                stroke="#E5E7EB"
                strokeWidth={10}
                fill="none"
              />
              {/* Dynamic Progress Circle */}
              <Circle
                cx={80}
                cy={80}
                r={radius}
                stroke="#1D4D3E"
                strokeWidth={10}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                transform="rotate(-90 80 80)"
              />
            </Svg>

            {/* Centered Countdown Readout */}
            <View style={styles.centerReadout}>
              <Text style={styles.timeText}>{timeFormatted}</Text>
              <Text style={styles.timeSubtext}>remaining</Text>
            </View>
          </View>

          <Text style={styles.statusDescription}>{statusDesc}</Text>
          <Text style={styles.pickupLocationSub}>
            📍 Outside Cult.fit Gym Exit Gate • Ready in ~5 mins
          </Text>
        </View>

        {/* Counter Pickup Ticket Card */}
        <View style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <View>
              <Text style={styles.ticketLabel}>COUNTER PICKUP TICKET</Text>
              <Text style={styles.kioskTitle}>Cult.fit HSR Express Kiosk</Text>
            </View>
            <View style={styles.ticketPinPill}>
              <Text style={styles.pinLabel}>PIN</Text>
            </View>
          </View>

          {/* Huge Prominent PIN */}
          <View style={styles.pinSection}>
            <Text style={styles.pinNumber}>#{orderId}</Text>
            <Text style={styles.pinInstruction}>
              Show this PIN or scan QR code at pickup counter
            </Text>
          </View>

          {/* Scannable SVG QR Code */}
          <View style={styles.qrContainer}>
            <Svg width={130} height={130} viewBox="0 0 130 130">
              {/* White background */}
              <Rect x={0} y={0} width={130} height={130} fill="#FFFFFF" />

              {/* Top-Left Finder */}
              <Rect x={10} y={10} width={34} height={34} fill="#1D4D3E" rx={6} />
              <Rect x={15} y={15} width={24} height={24} fill="#FFFFFF" rx={4} />
              <Rect x={20} y={20} width={14} height={14} fill="#1D4D3E" rx={2} />

              {/* Top-Right Finder */}
              <Rect x={86} y={10} width={34} height={34} fill="#1D4D3E" rx={6} />
              <Rect x={91} y={15} width={24} height={24} fill="#FFFFFF" rx={4} />
              <Rect x={96} y={20} width={14} height={14} fill="#1D4D3E" rx={2} />

              {/* Bottom-Left Finder */}
              <Rect x={10} y={86} width={34} height={34} fill="#1D4D3E" rx={6} />
              <Rect x={15} y={91} width={24} height={24} fill="#FFFFFF" rx={4} />
              <Rect x={20} y={96} width={14} height={14} fill="#1D4D3E" rx={2} />

              {/* Central / Data Matrix Blocks */}
              <Rect x={52} y={14} width={8} height={8} fill="#1D4D3E" />
              <Rect x={66} y={14} width={8} height={8} fill="#1D4D3E" />
              <Rect x={52} y={28} width={8} height={8} fill="#1D4D3E" />
              <Rect x={66} y={28} width={8} height={8} fill="#1D4D3E" />
              <Rect x={52} y={42} width={22} height={8} fill="#1D4D3E" />

              <Rect x={14} y={54} width={8} height={8} fill="#1D4D3E" />
              <Rect x={28} y={54} width={8} height={8} fill="#1D4D3E" />
              <Rect x={42} y={54} width={8} height={8} fill="#1D4D3E" />
              <Rect x={56} y={54} width={8} height={8} fill="#1D4D3E" />
              <Rect x={70} y={54} width={8} height={8} fill="#1D4D3E" />
              <Rect x={84} y={54} width={8} height={8} fill="#1D4D3E" />
              <Rect x={98} y={54} width={8} height={8} fill="#1D4D3E" />
              <Rect x={112} y={54} width={8} height={8} fill="#1D4D3E" />

              <Rect x={14} y={68} width={14} height={8} fill="#1D4D3E" />
              <Rect x={38} y={68} width={8} height={8} fill="#1D4D3E" />
              <Rect x={54} y={68} width={22} height={8} fill="#1D4D3E" />
              <Rect x={86} y={68} width={14} height={8} fill="#1D4D3E" />
              <Rect x={108} y={68} width={12} height={8} fill="#1D4D3E" />

              <Rect x={52} y={86} width={8} height={8} fill="#1D4D3E" />
              <Rect x={66} y={86} width={8} height={8} fill="#1D4D3E" />
              <Rect x={80} y={86} width={8} height={8} fill="#1D4D3E" />
              <Rect x={100} y={86} width={16} height={8} fill="#1D4D3E" />

              <Rect x={52} y={100} width={22} height={8} fill="#1D4D3E" />
              <Rect x={82} y={100} width={8} height={8} fill="#1D4D3E" />
              <Rect x={100} y={100} width={16} height={8} fill="#1D4D3E" />

              <Rect x={52} y={114} width={8} height={8} fill="#1D4D3E" />
              <Rect x={68} y={114} width={16} height={8} fill="#1D4D3E" />
              <Rect x={92} y={114} width={24} height={8} fill="#1D4D3E" />
            </Svg>
          </View>

          {/* Confirmed Auto-Logged to Health Diary Green Badge */}
          <View style={styles.autoLogBadge}>
            <CheckCircle2 size={16} color="#1D4D3E" />
            <Text style={styles.autoLogBadgeText}>
              Confirmed Auto-Logged to Health Diary
            </Text>
          </View>
        </View>

        {/* 3-Step Kitchen Progress Stepper */}
        <View style={styles.stepperCard}>
          <Text style={styles.stepperCardTitle}>Kitchen Live Status</Text>

          {/* Step 1 */}
          <View style={styles.stepItem}>
            <View style={styles.stepLeft}>
              <View
                style={[
                  styles.stepDot,
                  activeStep >= 1 ? styles.stepDotDone : styles.stepDotPending,
                ]}
              >
                <Check size={14} color="#FFFFFF" />
              </View>
              <View
                style={[
                  styles.stepLine,
                  activeStep >= 2 ? styles.stepLineDone : styles.stepLinePending,
                ]}
              />
            </View>
            <View style={styles.stepContent}>
              <Text
                style={[
                  styles.stepTitle,
                  activeStep >= 1 && styles.stepTitleActive,
                ]}
              >
                1. Order Received
              </Text>
              <Text style={styles.stepSub}>
                Kiosk kitchen display confirmed • Order #{orderId}
              </Text>
            </View>
          </View>

          {/* Step 2 */}
          <View style={styles.stepItem}>
            <View style={styles.stepLeft}>
              <View
                style={[
                  styles.stepDot,
                  activeStep >= 2
                    ? activeStep === 2
                      ? styles.stepDotActive
                      : styles.stepDotDone
                    : styles.stepDotPending,
                ]}
              >
                {activeStep > 2 ? (
                  <Check size={14} color="#FFFFFF" />
                ) : (
                  <Utensils size={13} color="#FFFFFF" />
                )}
              </View>
              <View
                style={[
                  styles.stepLine,
                  activeStep >= 3 ? styles.stepLineDone : styles.stepLinePending,
                ]}
              />
            </View>
            <View style={styles.stepContent}>
              <Text
                style={[
                  styles.stepTitle,
                  activeStep >= 2 && styles.stepTitleActive,
                ]}
              >
                2. Grilling / Cold-Pressing Fresh
              </Text>
              <Text style={styles.stepSub}>
                Chef assembling paneer bowl & blending protein shake
              </Text>
            </View>
          </View>

          {/* Step 3 */}
          <View style={styles.stepItemLast}>
            <View style={styles.stepLeft}>
              <View
                style={[
                  styles.stepDot,
                  activeStep >= 3 ? styles.stepDotDone : styles.stepDotPending,
                ]}
              >
                <Check size={14} color={activeStep >= 3 ? '#FFFFFF' : '#9CA3AF'} />
              </View>
            </View>
            <View style={styles.stepContent}>
              <Text
                style={[
                  styles.stepTitle,
                  activeStep >= 3 && styles.stepTitleActive,
                ]}
              >
                3. Ready at Express Counter
              </Text>
              <Text style={styles.stepSub}>
                Collect immediately outside Cult.fit exit gate
              </Text>
            </View>
          </View>
        </View>

        {/* Order Details & Health Integration Summary */}
        <View style={styles.orderSummaryCard}>
          <Text style={styles.summaryTitle}>Meal Nutrition Breakdown</Text>

          <View style={styles.summaryItemRow}>
            <Text style={styles.summaryItemName}>
              1x High Protein Peanut Butter Banana Shake
            </Text>
            <Text style={styles.summaryItemMacro}>32g P • 420 kcal</Text>
          </View>

          <View style={styles.summaryItemRow}>
            <Text style={styles.summaryItemName}>
              1x Low-Fat Paneer Quinoa Power Bowl
            </Text>
            <Text style={styles.summaryItemMacro}>28g P • 380 kcal</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Total Nutrients Logged</Text>
            <Text style={styles.summaryTotalValue}>60g Protein • 800 kcal</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(track)')}
            style={styles.diaryLinkBtn}
          >
            <Sparkles size={16} color="#1D4D3E" />
            <Text style={styles.diaryLinkText}>View in Health Diary</Text>
            <ChevronRight size={16} color="#1D4D3E" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.replace('/(order)')}
          style={styles.doneButton}
        >
          <Text style={styles.doneButtonText}>Back to Fuel Menu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F6', // Off-white canvas
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontWeight: '600',
    color: '#111827',
  },
  headerTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#111827',
  },
  kioskPill: {
    backgroundColor: '#E8F1ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  kioskPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4D3E',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBECE8',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusPlaced: {
    backgroundColor: '#EBF4FF',
  },
  statusPlacedText: {
    color: '#1E40AF',
    fontSize: 11,
    fontWeight: '800',
  },
  statusPreparing: {
    backgroundColor: '#FEF3C7',
  },
  statusPreparingText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '800',
  },
  statusReady: {
    backgroundColor: '#ECFDF5',
  },
  statusReadyText: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: '800',
  },
  kioskCounterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  ringWrapper: {
    position: 'relative',
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  centerReadout: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 0.5,
  },
  timeSubtext: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },
  statusDescription: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginTop: 8,
  },
  pickupLocationSub: {
    fontSize: 11.5,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 4,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#1D4D3E',
    marginBottom: 16,
    alignItems: 'center',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 10,
  },
  ticketLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1D4D3E',
    letterSpacing: 0.5,
  },
  kioskTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  ticketPinPill: {
    backgroundColor: '#1D4D3E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pinLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  pinSection: {
    alignItems: 'center',
    marginVertical: 14,
  },
  pinNumber: {
    fontSize: 34,
    fontWeight: '900',
    color: '#1D4D3E',
    letterSpacing: 2,
  },
  pinInstruction: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  qrContainer: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  autoLogBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F1ED',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  autoLogBadgeText: {
    color: '#1D4D3E',
    fontSize: 12,
    fontWeight: '700',
  },
  stepperCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EBECE8',
    marginBottom: 16,
  },
  stepperCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 14,
  },
  stepItem: {
    flexDirection: 'row',
    minHeight: 52,
  },
  stepItemLast: {
    flexDirection: 'row',
  },
  stepLeft: {
    alignItems: 'center',
    width: 28,
    marginRight: 12,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: '#1D4D3E',
  },
  stepDotActive: {
    backgroundColor: '#F59E0B',
  },
  stepDotPending: {
    backgroundColor: '#E5E7EB',
  },
  stepLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  stepLineDone: {
    backgroundColor: '#1D4D3E',
  },
  stepLinePending: {
    backgroundColor: '#E5E7EB',
  },
  stepContent: {
    flex: 1,
    paddingTop: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  stepTitleActive: {
    color: '#111827',
    fontWeight: '800',
  },
  stepSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  orderSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EBECE8',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryItemName: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
    paddingRight: 8,
  },
  summaryItemMacro: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4D3E',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  summaryTotalLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#111827',
  },
  summaryTotalValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1D4D3E',
  },
  diaryLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F1ED',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 12,
    gap: 6,
  },
  diaryLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4D3E',
    flex: 1,
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EBECE8',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  doneButton: {
    backgroundColor: '#1D4D3E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
