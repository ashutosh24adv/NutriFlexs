import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { radii } from '../../src/theme/radii';
import { useAuthStore } from '../../src/store/authStore';
import { useHealthSync } from '../../src/services/useHealthSync';
import {
  ShieldCheck,
  MapPin,
  Flame,
  CreditCard,
  LogOut,
  ChevronRight,
  PlusCircle,
  SlidersHorizontal,
  Check,
  Edit3,
  Mail,
  Phone,
  Sparkles,
} from 'lucide-react-native';

export default function TrackProfileScreen() {
  const router = useRouter();
  const { user, passBalance, topUpPass, signOut, fetchMe, isLoading } = useAuthStore();
  const { targets, updateTargets } = useHealthSync();

  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [editCalories, setEditCalories] = useState(String(targets.calories || 2000));
  const [editProtein, setEditProtein] = useState(String(targets.proteinGrams || 120));
  const [editCarbs, setEditCarbs] = useState(String(targets.carbsGrams || 250));
  const [editFat, setEditFat] = useState(String(targets.fatGrams || 65));
  const [editWater, setEditWater] = useState(String(targets.waterMl || 3000));
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchMe();
  }, []);

  useEffect(() => {
    setEditCalories(String(targets.calories || 2000));
    setEditProtein(String(targets.proteinGrams || 120));
    setEditCarbs(String(targets.carbsGrams || 250));
    setEditFat(String(targets.fatGrams || 65));
    setEditWater(String(targets.waterMl || 3000));
  }, [targets]);

  const handleSaveGoals = () => {
    const newCalories = parseInt(editCalories, 10) || 2000;
    const newProtein = parseInt(editProtein, 10) || 120;
    const newCarbs = parseInt(editCarbs, 10) || 250;
    const newFat = parseInt(editFat, 10) || 65;
    const newWater = parseInt(editWater, 10) || 3000;

    updateTargets({
      calories: newCalories,
      proteinGrams: newProtein,
      carbsGrams: newCarbs,
      fatGrams: newFat,
      waterMl: newWater,
    });
    setIsEditingGoals(false);
    setFeedbackNotice('Nutrition & macro targets updated successfully!');
  };

  const handlePresetSelect = (preset: 'hypertrophy' | 'fatloss' | 'maintenance') => {
    if (preset === 'hypertrophy') {
      setEditCalories('2400');
      setEditProtein('150');
      setEditCarbs('270');
      setEditFat('68');
      setEditWater('3500');
    } else if (preset === 'fatloss') {
      setEditCalories('1800');
      setEditProtein('135');
      setEditCarbs('180');
      setEditFat('50');
      setEditWater('3200');
    } else {
      setEditCalories('2000');
      setEditProtein('120');
      setEditCarbs('250');
      setEditFat('65');
      setEditWater('3000');
    }
  };

  const handleTopUp = (amount: number) => {
    topUpPass(amount);
    setFeedbackNotice(`Added ₹${amount} to NutriFlexs Pass. New balance: ₹${(user.passBalance + amount).toLocaleString('en-IN')}`);
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
            setFeedbackNotice('Signed out successfully.');
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Athlete Profile</Text>
          <Text style={styles.subtitle}>
            Account identity, daily macro targets & pass wallet
          </Text>
        </View>

        {/* Feedback / Notification Banner */}
        {feedbackNotice && (
          <View style={styles.toastBanner}>
            <Text style={styles.toastText}>{feedbackNotice}</Text>
            <TouchableOpacity onPress={() => setFeedbackNotice(null)}>
              <Text style={styles.toastDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 1. Athlete Identity Card */}
        <View style={styles.athleteCard}>
          <View style={styles.athleteTopRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{user.avatarInitials || 'NM'}</Text>
            </View>

            <View style={styles.athleteInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.athleteName}>{user.name || 'Nutri Member'}</Text>
                <View style={styles.verifiedBadge}>
                  <ShieldCheck size={12} color="#059669" />
                  <Text style={styles.verifiedText}>{user.membershipTier || 'PRO'}</Text>
                </View>
              </View>
              <View style={styles.contactRow}>
                <Phone size={11} color="#6B7280" style={{ marginRight: 4 }} />
                <Text style={styles.phoneText}>{user.phone || '+91 98765 43210'}</Text>
              </View>
              {user.email ? (
                <View style={styles.contactRow}>
                  <Mail size={11} color="#6B7280" style={{ marginRight: 4 }} />
                  <Text style={styles.phoneText}>{user.email}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.athleteDivider} />

          <View style={styles.gymRow}>
            <MapPin size={15} color="#1D4D3E" />
            <Text style={styles.gymText}>
              Home Kiosk:{' '}
              <Text style={styles.gymName}>{user.homeKiosk || 'Cult.fit HSR Layout, Bengaluru'}</Text>
            </Text>
          </View>

          <View style={styles.memberIdRow}>
            <Text style={styles.memberIdLabel}>Member ID:</Text>
            <Text style={styles.memberIdValue}>{user.memberCode || 'NF-PRO'}</Text>
          </View>
        </View>

        {/* 2. NutriFlexs Pass Wallet Card */}
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
            <Text style={styles.balanceAmount}>
              ₹{(user.passBalance || 0).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.topUpRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleTopUp(500)}
              style={styles.topUpPill}
            >
              <PlusCircle size={14} color="#1D4D3E" style={{ marginRight: 4 }} />
              <Text style={styles.topUpText}>+₹500</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleTopUp(1000)}
              style={styles.topUpPill}
            >
              <PlusCircle size={14} color="#1D4D3E" style={{ marginRight: 4 }} />
              <Text style={styles.topUpText}>+₹1,000</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.passDisclaimer}>
            Instant 1-tap checkout & auto-debit enabled at all Cult.fit gym kiosks.
          </Text>
        </View>

        {/* 3. Daily Calorie & Macro Targets Editor */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleWithIcon}>
              <SlidersHorizontal size={18} color="#1D4D3E" style={{ marginRight: 6 }} />
              <Text style={styles.cardTitle}>Daily Macro Targets</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (isEditingGoals) {
                  handleSaveGoals();
                } else {
                  setIsEditingGoals(true);
                }
              }}
              style={styles.editBtn}
            >
              {isEditingGoals ? (
                <>
                  <Check size={14} color="#1D4D3E" style={{ marginRight: 4 }} />
                  <Text style={styles.editBtnText}>Save</Text>
                </>
              ) : (
                <>
                  <Edit3 size={14} color="#1D4D3E" style={{ marginRight: 4 }} />
                  <Text style={styles.editBtnText}>Edit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.cardSubtitle}>
            Calibrated for metabolic burn & strength recovery at Cult.fit
          </Text>

          {isEditingGoals && (
            <View style={styles.presetRow}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => handlePresetSelect('hypertrophy')}
                style={styles.presetBtn}
              >
                <Text style={styles.presetText}>Hypertrophy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => handlePresetSelect('fatloss')}
                style={styles.presetBtn}
              >
                <Text style={styles.presetText}>Fat Loss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => handlePresetSelect('maintenance')}
                style={styles.presetBtn}
              >
                <Text style={styles.presetText}>Maintenance</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Target Fields Grid */}
          <View style={styles.goalsGrid}>
            {/* Calories */}
            <View style={styles.goalTile}>
              <Text style={styles.goalTileLabel}>Calories</Text>
              {isEditingGoals ? (
                <TextInput
                  style={styles.goalInput}
                  value={editCalories}
                  onChangeText={(val) => setEditCalories(val.slice(0, 5))}
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.goalTileValue}>{targets.calories || 2000}</Text>
              )}
              <Text style={styles.goalTileUnit}>kcal / day</Text>
            </View>

            {/* Protein */}
            <View style={styles.goalTile}>
              <Text style={styles.goalTileLabel}>Protein</Text>
              {isEditingGoals ? (
                <TextInput
                  style={styles.goalInput}
                  value={editProtein}
                  onChangeText={(val) => setEditProtein(val.slice(0, 4))}
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.goalTileValue}>{targets.proteinGrams || 120}</Text>
              )}
              <Text style={styles.goalTileUnit}>grams</Text>
            </View>

            {/* Carbs */}
            <View style={styles.goalTile}>
              <Text style={styles.goalTileLabel}>Carbs</Text>
              {isEditingGoals ? (
                <TextInput
                  style={styles.goalInput}
                  value={editCarbs}
                  onChangeText={(val) => setEditCarbs(val.slice(0, 4))}
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.goalTileValue}>{targets.carbsGrams || 250}</Text>
              )}
              <Text style={styles.goalTileUnit}>grams</Text>
            </View>

            {/* Fat */}
            <View style={styles.goalTile}>
              <Text style={styles.goalTileLabel}>Fat</Text>
              {isEditingGoals ? (
                <TextInput
                  style={styles.goalInput}
                  value={editFat}
                  onChangeText={(val) => setEditFat(val.slice(0, 4))}
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.goalTileValue}>{targets.fatGrams || 65}</Text>
              )}
              <Text style={styles.goalTileUnit}>grams</Text>
            </View>

            {/* Water */}
            <View style={styles.goalTile}>
              <Text style={styles.goalTileLabel}>Water Goal</Text>
              {isEditingGoals ? (
                <TextInput
                  style={styles.goalInput}
                  value={editWater}
                  onChangeText={(val) => setEditWater(val.slice(0, 5))}
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.goalTileValue}>{targets.waterMl || 3000}</Text>
              )}
              <Text style={styles.goalTileUnit}>ml / day</Text>
            </View>
          </View>

          {isEditingGoals && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSaveGoals}
              style={styles.saveGoalsBtn}
            >
              <Text style={styles.saveGoalsBtnText}>Save Targets</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 4. Quick Link to Dedicated Activity Tab */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(track)/activity')}
          style={styles.linkCard}
        >
          <View style={styles.linkCardLeft}>
            <View style={styles.linkIconCircle}>
              <Sparkles size={18} color="#1D4D3E" />
            </View>
            <View>
              <Text style={styles.linkCardTitle}>Wearable & Activity Hub</Text>
              <Text style={styles.linkCardSubtitle}>
                Manage Apple Health, Samsung Health, sensors & sync logs
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>

        {/* 5. Sign Out Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSignOut}
          style={styles.signOutButton}
        >
          <LogOut size={16} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.signOutText}>Sign Out of Athlete Account</Text>
        </TouchableOpacity>
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
    paddingBottom: 80,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamilies.bold,
    color: '#111827',
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C6DED4',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  toastText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: '#1D4D3E',
  },
  toastDismiss: {
    fontSize: typography.sizes.sm,
    color: '#1D4D3E',
    paddingLeft: spacing.sm,
  },
  athleteCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#EBECE8',
  },
  athleteTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1D4D3E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamilies.bold,
    color: '#FFFFFF',
  },
  athleteInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  athleteName: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamilies.bold,
    color: '#111827',
    marginRight: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#C6DED4',
  },
  verifiedText: {
    fontSize: 9,
    fontFamily: typography.fontFamilies.bold,
    color: '#059669',
    marginLeft: 2,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  phoneText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: '#6B7280',
  },
  athleteDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: spacing.sm,
  },
  gymRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  gymText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: '#4B5563',
    marginLeft: 6,
  },
  gymName: {
    fontFamily: typography.fontFamilies.bold,
    color: '#111827',
  },
  memberIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  memberIdLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.medium,
    color: '#9CA3AF',
  },
  memberIdValue: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: '#1D4D3E',
    marginLeft: 4,
  },
  passCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#EBECE8',
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  passTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passTitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: '#1D4D3E',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  activePill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  activePillText: {
    fontSize: 9,
    fontFamily: typography.fontFamilies.bold,
    color: '#059669',
  },
  balanceSection: {
    marginVertical: 4,
  },
  balanceLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: '#6B7280',
  },
  balanceAmount: {
    fontSize: 26,
    fontFamily: typography.fontFamilies.bold,
    color: '#111827',
  },
  topUpRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.sm,
    marginBottom: 6,
  },
  topUpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#C6DED4',
  },
  topUpText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: '#1D4D3E',
  },
  passDisclaimer: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.regular,
    color: '#9CA3AF',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#EBECE8',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C6DED4',
  },
  editBtnText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: '#1D4D3E',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.sm,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 6,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  presetText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.medium,
    color: '#374151',
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalTile: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#F7F8F6',
    borderRadius: radii.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#EFEFEA',
  },
  goalTileLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.medium,
    color: '#6B7280',
  },
  goalTileValue: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamilies.bold,
    color: '#111827',
    marginVertical: 2,
  },
  goalTileUnit: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.regular,
    color: '#9CA3AF',
  },
  goalInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1D4D3E',
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: '#111827',
    marginVertical: 2,
  },
  saveGoalsBtn: {
    backgroundColor: '#1D4D3E',
    borderRadius: radii.pill,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveGoalsBtnText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#EBECE8',
  },
  linkCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  linkIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  linkCardTitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: '#111827',
  },
  linkCardSubtitle: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.regular,
    color: '#6B7280',
    marginTop: 1,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    paddingVertical: 12,
    borderRadius: radii.pill,
  },
  signOutText: {
    color: '#DC2626',
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
  },
});
