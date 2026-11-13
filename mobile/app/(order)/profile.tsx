import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ShieldCheck,
  MapPin,
  Flame,
  CreditCard,
  UserCheck,
  Receipt,
  HeartPulse,
  LogOut,
  ChevronRight,
  PlusCircle,
  Settings,
} from 'lucide-react-native';

export default function OrderProfileScreen() {
  const router = useRouter();
  const [passBalance, setPassBalance] = useState(1500);

  const handleTopUp = () => {
    setPassBalance((prev) => prev + 500);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Screen Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Fuel Profile</Text>
          <Text style={styles.subtitle}>
            Athlete membership, kiosk pass & preferences
          </Text>
        </View>

        {/* Athlete Identity Card */}
        <View style={styles.athleteCard}>
          <View style={styles.athleteTopRow}>
            {/* NM Initials Circle */}
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>NM</Text>
            </View>

            <View style={styles.athleteInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.athleteName}>Nutri Member</Text>
                <View style={styles.verifiedBadge}>
                  <ShieldCheck size={13} color="#059669" />
                  <Text style={styles.verifiedText}>PRO</Text>
                </View>
              </View>
              <Text style={styles.phoneText}>+91 98765 43210</Text>

              {/* Streak Badge */}
              <View style={styles.streakBadge}>
                <Flame size={12} color="#D97706" />
                <Text style={styles.streakText}>14-Day Fuel Streak</Text>
              </View>
            </View>
          </View>

          <View style={styles.athleteDivider} />

          {/* Home Gym */}
          <View style={styles.gymRow}>
            <MapPin size={16} color="#1D4D3E" />
            <Text style={styles.gymText}>
              Home Kiosk:{' '}
              <Text style={styles.gymName}>Cult.fit HSR Layout, Bengaluru</Text>
            </Text>
          </View>
        </View>

        {/* NutriFlexs Pass Wallet Card */}
        <View style={styles.passCard}>
          <View style={styles.passHeader}>
            <View style={styles.passTitleRow}>
              <CreditCard size={18} color="#1D4D3E" />
              <Text style={styles.passTitle}>NUTRIFLEXS PASS</Text>
            </View>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>ACTIVE</Text>
            </View>
          </View>

          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Available Credits</Text>
            <Text style={styles.balanceAmount}>₹{passBalance.toLocaleString('en-IN')}</Text>
          </View>

          <Text style={styles.passPerks}>
            ⚡ 35% OFF every post-workout order • Priority Express pickup line
          </Text>

          <View style={styles.passActionsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleTopUp}
              style={styles.topUpBtn}
            >
              <PlusCircle size={15} color="#FFFFFF" />
              <Text style={styles.topUpBtnText}>+ Top-Up Pass</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {}}
              style={styles.managePassBtn}
            >
              <Settings size={15} color="#1D4D3E" />
              <Text style={styles.managePassBtnText}>Manage</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Saved Trainer Referral Card */}
        <View style={styles.trainerCard}>
          <View style={styles.trainerHeader}>
            <UserCheck size={18} color="#1D4D3E" />
            <Text style={styles.trainerCardTitle}>Gym Trainer & Goal</Text>
          </View>

          <View style={styles.trainerBody}>
            <View style={styles.trainerInfoRow}>
              <Text style={styles.trainerInfoLabel}>Assigned Trainer</Text>
              <Text style={styles.trainerInfoValue}>Coach Amit Sharma (Cult.fit)</Text>
            </View>

            <View style={styles.trainerInfoRow}>
              <Text style={styles.trainerInfoLabel}>Referral Code</Text>
              <View style={styles.trainerCodeChip}>
                <Text style={styles.trainerCodeText}>COACHAMIT (10% OFF)</Text>
              </View>
            </View>

            <View style={styles.trainerInfoRow}>
              <Text style={styles.trainerInfoLabel}>Daily Target</Text>
              <Text style={styles.trainerInfoValue}>
                140g Protein • 2,000 kcal
              </Text>
            </View>
          </View>
        </View>

        {/* Preferences & Shortcuts */}
        <View style={styles.menuCard}>
          {/* Order History */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(order)/orders')}
            style={styles.menuRow}
          >
            <View style={styles.menuIconContainer}>
              <Receipt size={18} color="#1D4D3E" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Past Orders & Receipts</Text>
              <Text style={styles.menuSub}>View pickup tickets and history</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* Health Diary Integration */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(track)')}
            style={styles.menuRow}
          >
            <View style={styles.menuIconContainer}>
              <HeartPulse size={18} color="#1D4D3E" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Health Diary Sync</Text>
              <Text style={styles.menuSub}>Auto-log enabled for Cult.fit kiosk</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {}}
          style={styles.signOutButton}
        >
          <LogOut size={16} color="#DC2626" />
          <Text style={styles.signOutText}>Sign Out of NutriFlexs</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F6', // Off-white canvas
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  athleteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EBECE8',
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  athleteTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#1D4D3E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  athleteInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  athleteName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#065F46',
  },
  phoneText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  streakText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B45309',
  },
  athleteDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  gymRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gymText: {
    fontSize: 12,
    color: '#4B5563',
  },
  gymName: {
    fontWeight: '700',
    color: '#111827',
  },
  passCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#1D4D3E',
    marginBottom: 14,
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  passTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  passTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4D3E',
    letterSpacing: 0.5,
  },
  activePill: {
    backgroundColor: '#E8F1ED',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4D3E',
  },
  balanceSection: {
    marginVertical: 4,
  },
  balanceLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    marginTop: 2,
  },
  passPerks: {
    fontSize: 11.5,
    color: '#4B5563',
    marginVertical: 8,
    lineHeight: 16,
  },
  passActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  topUpBtn: {
    flex: 1,
    backgroundColor: '#1D4D3E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  topUpBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  managePassBtn: {
    backgroundColor: '#E8F1ED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  managePassBtnText: {
    color: '#1D4D3E',
    fontSize: 12.5,
    fontWeight: '700',
  },
  trainerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EBECE8',
    marginBottom: 14,
  },
  trainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  trainerCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  trainerBody: {},
  trainerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  trainerInfoLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  trainerInfoValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#111827',
  },
  trainerCodeChip: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trainerCodeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: '#EBECE8',
    marginBottom: 16,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E8F1ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
  },
  menuSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  signOutText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
});
