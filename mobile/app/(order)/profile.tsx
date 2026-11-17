import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
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
  LogIn,
  Lock,
} from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { cartActions } from '../../src/store/cartStore';

export default function OrderProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, passBalance, topUpPass, signOut } = useAuthStore();
  const isGuest = !isAuthenticated || !user || Boolean(user.isGuest);

  const handleTopUp = () => {
    if (isGuest) {
      router.push('/auth/login');
      return;
    }
    topUpPass(500);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your NutriFlexs athlete profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            try {
              cartActions.clearCart();
              cartActions.setPassApplied(false);
              cartActions.removeTrainerCode();
            } catch {
              // Cart cleanup fallback
            }
            try {
              if (typeof (router as any).dismissAll === 'function') {
                (router as any).dismissAll();
              }
            } catch {
              // Dismiss stack fallback
            }
            router.replace('/welcome');
          },
        },
      ]
    );
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

        {/* Athlete Identity Card OR Sign In Card */}
        {isGuest ? (
          <View style={styles.guestCard}>
            <View style={styles.guestTopRow}>
              <View style={styles.guestAvatarCircle}>
                <Lock size={22} color="#FFFFFF" />
              </View>
              <View style={styles.guestInfo}>
                <Text style={styles.guestTitle}>Sign In / Create Account</Text>
                <Text style={styles.guestSubtitle}>
                  Access your athlete profile, orders, and kiosk express perks.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/auth/login')}
              style={styles.signInBtn}
            >
              <LogIn size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.signInBtnText}>Sign In / Create Account</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.athleteCard}>
            <View style={styles.athleteTopRow}>
              {/* Avatar Initials Circle */}
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {user?.avatarInitials || (user?.name ? user.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase() : 'ME')}
                </Text>
              </View>

              <View style={styles.athleteInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.athleteName}>{user?.name || 'Athlete'}</Text>
                  <View style={styles.verifiedBadge}>
                    <ShieldCheck size={13} color="#059669" />
                    <Text style={styles.verifiedText}>{user?.membershipTier || 'MEMBER'}</Text>
                  </View>
                </View>
                {user?.phone ? <Text style={styles.phoneText}>{user.phone}</Text> : null}
                {user?.email ? <Text style={styles.emailText}>{user.email}</Text> : null}
              </View>
            </View>

            <View style={styles.athleteDivider} />

            {/* Home Gym */}
            <View style={styles.gymRow}>
              <MapPin size={16} color="#1D4D3E" />
              <Text style={styles.gymText}>
                Home Kiosk:{' '}
                <Text style={styles.gymName}>
                  {user?.homeKiosk || 'Cult.fit Express Counter'}
                </Text>
              </Text>
            </View>
          </View>
        )}

        {/* NutriFlexs Pass Wallet Card */}
        <View style={styles.passCard}>
          <View style={styles.passHeader}>
            <View style={styles.passTitleRow}>
              <CreditCard size={18} color="#1D4D3E" />
              <Text style={styles.passTitle}>NUTRIFLEXS PASS</Text>
            </View>
            <View style={isGuest ? styles.inactivePill : styles.activePill}>
              <Text style={isGuest ? styles.inactivePillText : styles.activePillText}>
                {isGuest ? 'INACTIVE' : 'ACTIVE'}
              </Text>
            </View>
          </View>

          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Available Credits</Text>
            <Text style={styles.balanceAmount}>
              ₹{(isGuest ? 0 : passBalance).toLocaleString('en-IN')}
            </Text>
          </View>

          <Text style={styles.passPerks}>
            {isGuest
              ? '⚡ Sign in to activate your pass, get 35% OFF orders, and auto-pay at kiosks.'
              : '⚡ 35% OFF every post-workout order • Priority Express pickup line'}
          </Text>

          <View style={styles.passActionsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={isGuest ? () => router.push('/auth/login') : handleTopUp}
              style={styles.topUpBtn}
            >
              <PlusCircle size={15} color="#FFFFFF" />
              <Text style={styles.topUpBtnText}>
                {isGuest ? 'Sign In to Top-Up' : '+ Top-Up Pass'}
              </Text>
            </TouchableOpacity>

            {!isGuest && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {}}
                style={styles.managePassBtn}
              >
                <Settings size={15} color="#1D4D3E" />
                <Text style={styles.managePassBtnText}>Manage</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Real Nutrition Goals & Kiosk Card */}
        {!isGuest && (
          <View style={styles.trainerCard}>
            <View style={styles.trainerHeader}>
              <UserCheck size={18} color="#1D4D3E" />
              <Text style={styles.trainerCardTitle}>Nutrition Goals & Kiosk</Text>
            </View>

            <View style={styles.trainerBody}>
              <View style={styles.trainerInfoRow}>
                <Text style={styles.trainerInfoLabel}>Primary Goal</Text>
                <Text style={styles.trainerInfoValue}>
                  {(user as any)?.nutritionGoal?.primaryGoal || (user as any)?.primaryGoal || 'Strength & Recovery'}
                </Text>
              </View>

              <View style={styles.trainerInfoRow}>
                <Text style={styles.trainerInfoLabel}>Daily Target</Text>
                <Text style={styles.trainerInfoValue}>
                  {((user as any)?.nutritionGoal?.proteinTarget || (user as any)?.proteinTarget || 140)}g Protein • {((user as any)?.nutritionGoal?.calorieTarget || (user as any)?.calorieTarget || (user as any)?.dailyCalorieGoal || 2000).toLocaleString('en-IN')} kcal
                </Text>
              </View>

              {(user as any)?.trainerCode ? (
                <View style={styles.trainerInfoRow}>
                  <Text style={styles.trainerInfoLabel}>Trainer Code</Text>
                  <View style={styles.trainerCodeChip}>
                    <Text style={styles.trainerCodeText}>{(user as any).trainerCode}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        )}

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

        {/* Auth Action Button */}
        {isGuest ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/auth/login')}
            style={styles.bottomSignInButton}
          >
            <LogIn size={16} color="#1D4D3E" />
            <Text style={styles.bottomSignInText}>Sign In / Create Account</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSignOut}
            style={styles.signOutButton}
          >
            <LogOut size={16} color="#DC2626" />
            <Text style={styles.signOutText}>Sign Out of NutriFlexs</Text>
          </TouchableOpacity>
        )}
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
  guestCard: {
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
  guestTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  guestAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1D4D3E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  guestInfo: {
    flex: 1,
  },
  guestTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  guestSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  signInBtn: {
    backgroundColor: '#1D4D3E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
  emailText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
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
  inactivePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactivePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
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
  bottomSignInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E8F1ED',
    borderWidth: 1,
    borderColor: '#C6DED4',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  bottomSignInText: {
    color: '#1D4D3E',
    fontSize: 13,
    fontWeight: '700',
  },
});
