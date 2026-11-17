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
  Wallet,
} from 'lucide-react-native';
import { useAuthStore, computeAvatarInitials } from '../../src/store/authStore';
import { cartActions } from '../../src/store/cartStore';

export default function OrderProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, passBalance, signOut } = useAuthStore();
  const isGuest = !isAuthenticated || !user || Boolean(user.isGuest);

  const handleOpenWallet = () => {
    if (isGuest) {
      router.push('/auth/login');
      return;
    }
    router.push('/wallet');
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your NutriFlexs profile?',
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
          <Text style={styles.title}>My Profile</Text>
          <Text style={styles.subtitle}>
            Account details, wallet & preferences
          </Text>
        </View>

        {/* Identity Card OR Sign In Card */}
        {isGuest ? (
          <View style={styles.guestCard}>
            <View style={styles.guestTopRow}>
              <View style={styles.guestAvatarCircle}>
                <Lock size={22} color="#FFFFFF" />
              </View>
              <View style={styles.guestInfo}>
                <Text style={styles.guestTitle}>Sign In / Create Account</Text>
                <Text style={styles.guestSubtitle}>
                  Access your profile, orders, and kiosk express perks.
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
          <View style={styles.userCard}>
            <View style={styles.userTopRow}>
              {/* Avatar Initials Circle */}
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {computeAvatarInitials(user?.name)}
                </Text>
              </View>

              <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{user?.name || 'Member'}</Text>
                  <View style={styles.verifiedBadge}>
                    <ShieldCheck size={13} color="#059669" />
                    <Text style={styles.verifiedText}>{user?.membershipTier || 'MEMBER'}</Text>
                  </View>
                </View>
                {user?.phone ? <Text style={styles.phoneText}>{user.phone}</Text> : null}
                {user?.email ? <Text style={styles.emailText}>{user.email}</Text> : null}
              </View>
            </View>

            <View style={styles.userDivider} />

            {/* Home Kiosk */}
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

        {/* NutriFlexs Wallet Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <View style={styles.walletTitleRow}>
              <Wallet size={18} color="#1D4D3E" />
              <Text style={styles.walletTitle}>NUTRIFLEXS WALLET</Text>
            </View>
            <View style={isGuest ? styles.inactivePill : styles.activePill}>
              <Text style={isGuest ? styles.inactivePillText : styles.activePillText}>
                {isGuest ? 'INACTIVE' : 'ACTIVE'}
              </Text>
            </View>
          </View>

          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Wallet Balance</Text>
            <Text style={styles.balanceAmount}>
              ₹{(isGuest ? 0 : passBalance).toLocaleString('en-IN')}
            </Text>
          </View>

          <Text style={styles.walletPerks}>
            {isGuest
              ? '⚡ Sign in to top-up wallet, 1-tap checkout, and fast kiosk pickup.'
              : '⚡ 1-Tap checkout at gym kiosks • Fast pickup'}
          </Text>

          <View style={styles.walletActionsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenWallet}
              style={styles.topUpBtn}
            >
              <PlusCircle size={15} color="#FFFFFF" />
              <Text style={styles.topUpBtnText}>
                {isGuest ? 'Sign In to Top-Up' : '+ Top-Up Wallet'}
              </Text>
            </TouchableOpacity>

            {!isGuest && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/wallet')}
                style={styles.manageWalletBtn}
              >
                <Settings size={15} color="#1D4D3E" />
                <Text style={styles.manageWalletBtnText}>Manage</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Nutrition Goals & Kiosk Card */}
        {!isGuest && (
          <View style={styles.nutritionCard}>
            <View style={styles.nutritionHeader}>
              <UserCheck size={18} color="#1D4D3E" />
              <Text style={styles.nutritionCardTitle}>Nutrition Goals & Kiosk</Text>
            </View>

            <View style={styles.nutritionBody}>
              <View style={styles.nutritionInfoRow}>
                <Text style={styles.nutritionInfoLabel}>Primary Goal</Text>
                <Text style={styles.nutritionInfoValue}>
                  {(user as any)?.nutritionGoal?.primaryGoal || (user as any)?.primaryGoal || 'Strength & Recovery'}
                </Text>
              </View>

              <View style={styles.nutritionInfoRow}>
                <Text style={styles.nutritionInfoLabel}>Daily Target</Text>
                <Text style={styles.nutritionInfoValue}>
                  {((user as any)?.nutritionGoal?.proteinTarget || (user as any)?.proteinTarget || 140)}g Protein • {((user as any)?.nutritionGoal?.calorieTarget || (user as any)?.calorieTarget || (user as any)?.dailyCalorieGoal || 2000).toLocaleString('en-IN')} kcal
                </Text>
              </View>

              {(user as any)?.trainerCode || (user as any)?.couponCode ? (
                <View style={styles.nutritionInfoRow}>
                  <Text style={styles.nutritionInfoLabel}>Coupon Code</Text>
                  <View style={styles.couponCodeChip}>
                    <Text style={styles.couponCodeText}>{(user as any).couponCode || (user as any).trainerCode}</Text>
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
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F6',
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
  userCard: {
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
  userTopRow: {
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
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
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
  userDivider: {
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
  walletCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#1D4D3E',
    marginBottom: 14,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  walletTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walletTitle: {
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
  walletPerks: {
    fontSize: 11.5,
    color: '#4B5563',
    marginVertical: 8,
    lineHeight: 16,
  },
  walletActionsRow: {
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
  manageWalletBtn: {
    backgroundColor: '#E8F1ED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  manageWalletBtnText: {
    color: '#1D4D3E',
    fontSize: 12.5,
    fontWeight: '700',
  },
  nutritionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EBECE8',
    marginBottom: 14,
  },
  nutritionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  nutritionCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  nutritionBody: {},
  nutritionInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  nutritionInfoLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  nutritionInfoValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#111827',
  },
  couponCodeChip: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  couponCodeText: {
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
