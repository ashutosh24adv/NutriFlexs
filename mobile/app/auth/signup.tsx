import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronLeft,
  Calendar,
  Check,
  ArrowRight,
  AlertCircle,
  Scale,
} from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import {
  saveSecureToken,
  triggerHaptic,
  calculateAge,
  mobileApiRequest,
} from './_authHelpers';

export default function SignupScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ redirect?: string }>();
  const redirectParam = searchParams.redirect || 'track';
  const { fetchMe, updateProfile } = useAuthStore();

  // --- Section 1: Account Credentials ---
  const [name, setName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // --- Section 2: Compact Body & Diet Baseline ---
  const [sex, setSex] = useState<'Male' | 'Female' | 'Prefer not to say'>('Male');

  // DOB state
  const [dobYear, setDobYear] = useState('1998');
  const [dobMonth, setDobMonth] = useState('06');
  const [dobDay, setDobDay] = useState('15');

  // Height & Weight with unit toggles
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [heightCm, setHeightCm] = useState('175');
  const [heightFt, setHeightFt] = useState('5');
  const [heightIn, setHeightIn] = useState('9');

  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [weightValue, setWeightValue] = useState('74');

  // Workout Frequency
  const [workoutFrequency, setWorkoutFrequency] = useState<
    '0-4 days/wk' | '4-6 days/wk' | '7+ days/wk'
  >('4-6 days/wk');

  // Diet Preference
  const [dietPreference, setDietPreference] = useState<
    'Vegetarian' | 'Eggetarian' | 'Non-vegetarian' | 'Vegan' | 'No specific'
  >('Vegetarian');

  // Primary Goal
  const [primaryGoal, setPrimaryGoal] = useState<
    'Lose weight' | 'Maintain weight' | 'Build muscle' | 'Improve fitness' | 'Healthy habits'
  >('Lose weight');

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Age Calculation
  const formattedDob = `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`;
  const liveAge = useMemo(() => calculateAge(formattedDob), [formattedDob]);

  // Height Unit Toggle Handler
  const toggleHeightUnit = (targetUnit: 'cm' | 'ft') => {
    if (targetUnit === heightUnit) return;
    triggerHaptic('light');
    if (targetUnit === 'ft') {
      const cm = parseFloat(heightCm) || 175;
      const totalInches = cm / 2.54;
      const ft = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      setHeightFt(ft.toString());
      setHeightIn(inches.toString());
      setHeightUnit('ft');
    } else {
      const ft = parseFloat(heightFt) || 5;
      const inches = parseFloat(heightIn) || 9;
      const cm = Math.round((ft * 12 + inches) * 2.54);
      setHeightCm(cm.toString());
      setHeightUnit('cm');
    }
  };

  // Weight Unit Toggle Handler
  const toggleWeightUnit = (targetUnit: 'kg' | 'lbs') => {
    if (targetUnit === weightUnit) return;
    triggerHaptic('light');
    const currentVal = parseFloat(weightValue) || (targetUnit === 'lbs' ? 70 : 154);
    if (targetUnit === 'lbs') {
      const lbs = Math.round(currentVal * 2.20462);
      setWeightValue(lbs.toString());
      setWeightUnit('lbs');
    } else {
      const kg = Math.round(currentVal / 2.20462);
      setWeightValue(kg.toString());
      setWeightUnit('kg');
    }
  };

  // Resolved standard metrics in cm and kg for backend
  const resolvedHeightCm = useMemo(() => {
    if (heightUnit === 'cm') {
      return parseFloat(heightCm) || 175;
    }
    const ft = parseFloat(heightFt) || 5;
    const inches = parseFloat(heightIn) || 9;
    return Math.round((ft * 12 + inches) * 2.54);
  }, [heightUnit, heightCm, heightFt, heightIn]);

  const resolvedWeightKg = useMemo(() => {
    const val = parseFloat(weightValue) || 70;
    if (weightUnit === 'lbs') {
      return Math.round((val / 2.20462) * 10) / 10;
    }
    return val;
  }, [weightUnit, weightValue]);

  // Form Submission
  const handleRegister = async () => {
    setErrorMessage(null);

    // Validation
    if (!name.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    if (!emailOrPhone.trim()) {
      setErrorMessage('Please enter your email or phone number');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    triggerHaptic('light');

    const isEmail = emailOrPhone.includes('@');
    const registerPayload = {
      name: name.trim(),
      email: isEmail ? emailOrPhone.trim().toLowerCase() : `${emailOrPhone.replace(/\D/g, '')}@nutriflex.fit`,
      phone: !isEmail ? emailOrPhone.trim() : '',
      emailOrPhone: emailOrPhone.trim(),
      password,
      sex,
      dateOfBirth: formattedDob,
      heightCm: resolvedHeightCm,
      weightKg: resolvedWeightKg,
      workoutFrequency,
      dietPreference,
      primaryGoal,
    };

    try {
      const res = await mobileApiRequest<{
        token?: string;
        jwt?: string;
        user?: any;
        nutritionGoal?: any;
        error?: string;
        message?: string;
      }>('/api/mobile/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerPayload),
      });

      if (!res.ok) {
        const errorMsg = res.error || 'Registration failed. Please verify your details and try again.';
        setErrorMessage(errorMsg);
        triggerHaptic('warning');
        Alert.alert('Error', errorMsg);
        setLoading(false);
        return;
      }

      const token = res.data?.token || res.data?.jwt;
      const user = res.data?.user;
      const nutritionGoal = res.data?.nutritionGoal || user?.goals || user?.nutritionGoal;

      if (!token) {
        const errorMsg = 'No authentication token received from server.';
        setErrorMessage(errorMsg);
        triggerHaptic('warning');
        Alert.alert('Error', errorMsg);
        setLoading(false);
        return;
      }

      // 1. Immediately persist token into expo-secure-store
      await saveSecureToken(token);

      // 2. Immediately persist { token, user, nutritionGoal } into useAuthStore
      try {
        const authStore = useAuthStore as any;
        if (typeof authStore.getState === 'function') {
          const storeState = authStore.getState();
          if (typeof storeState?.setAuth === 'function') {
            storeState.setAuth({ token, user, nutritionGoal });
          } else {
            if (user && typeof storeState?.updateProfile === 'function') {
              storeState.updateProfile(user);
            }
            if (nutritionGoal && typeof storeState?.setNutritionGoal === 'function') {
              storeState.setNutritionGoal(nutritionGoal);
            }
          }
        }
      } catch (storeErr) {
        console.warn('[Signup] Store persistence warning:', storeErr);
      }

      // Ensure profile and goals are reflected
      if (user) {
        updateProfile({
          id: user.id,
          name: user.name || name.trim(),
          email: user.email || registerPayload.email,
          phone: user.phone || registerPayload.phone,
          passBalance: user.passBalance ?? 0,
        });
      }

      // Background hydration
      if (typeof fetchMe === 'function') {
        fetchMe().catch(() => {});
      }
      await triggerHaptic('success');

      // Construct forward URL query string
      const query = new URLSearchParams({
        name: name.trim(),
        sex,
        age: liveAge.toString(),
        heightCm: resolvedHeightCm.toString(),
        weightKg: resolvedWeightKg.toString(),
        workoutFrequency,
        dietPreference,
        primaryGoal,
        redirect: redirectParam,
      }).toString();

      // Conditional Navigation:
      // If goal is "Lose weight" or "Build muscle" -> route to /auth/goal-target
      // If goal is "Maintain weight", "Improve fitness", or "Healthy habits" -> route straight to /auth/plan-ready
      if (primaryGoal === 'Lose weight' || primaryGoal === 'Build muscle') {
        router.push(`/auth/goal-target?${query}`);
      } else {
        router.push(`/auth/plan-ready?${query}`);
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Unable to connect to server. Please check your network connection.';
      setErrorMessage(errorMsg);
      triggerHaptic('warning');
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color="#1D4D3E" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step 1 of 3</Text>
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandDot} />
            <Text style={styles.brandWordmark}>NUTRIFLEXS ATHLETE</Text>
          </View>
          <Text style={styles.title}>Start Your Transformation</Text>
          <Text style={styles.subtitle}>
            Create your account & baseline your fitness metrics for an AI-tailored nutrition plan.
          </Text>
        </View>

        {/* Error Notification */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <AlertCircle size={18} color="#EF4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* SECTION 1: ACCOUNT CREDENTIALS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <User size={18} color="#1D4D3E" />
            <Text style={styles.sectionTitle}>Account Credentials</Text>
          </View>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <User size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Email or Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email or Phone</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="athlete@nutriflex.fit or mobile number"
                placeholderTextColor="#9CA3AF"
                value={emailOrPhone}
                onChangeText={setEmailOrPhone}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password with Show/Hide Toggle */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { paddingRight: 44 }]}
                placeholder="Min. 6 characters"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={10}
              >
                {showPassword ? (
                  <EyeOff size={18} color="#4B5563" />
                ) : (
                  <Eye size={18} color="#4B5563" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* SECTION 2: COMPACT BODY & DIET BASELINE */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Scale size={18} color="#1D4D3E" />
            <Text style={styles.sectionTitle}>Body & Diet Baseline</Text>
          </View>

          {/* Sex Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Biological Sex</Text>
            <View style={styles.segmentedRow}>
              {(['Male', 'Female', 'Prefer not to say'] as const).map((item) => {
                const isSelected = sex === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
                    onPress={() => {
                      triggerHaptic('selection');
                      setSex(item);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.segmentBtnText,
                        isSelected && styles.segmentBtnTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* DOB / Age: Compact Picker with Live Age Badge */}
          <View style={styles.inputGroup}>
            <View style={styles.dobLabelRow}>
              <View style={styles.dobTitleGroup}>
                <Calendar size={15} color="#1D4D3E" />
                <Text style={styles.labelWithIcon}>Date of Birth</Text>
              </View>
              <View style={styles.liveAgeBadge}>
                <Text style={styles.liveAgeText}>🎂 {liveAge} yrs old</Text>
              </View>
            </View>
            <View style={styles.dobInputsRow}>
              <View style={styles.dobInputCol}>
                <Text style={styles.microLabel}>DAY</Text>
                <TextInput
                  style={styles.dobInput}
                  value={dobDay}
                  onChangeText={(val) => {
                    const clean = val.replace(/\D/g, '').slice(0, 2);
                    setDobDay(clean);
                  }}
                  keyboardType="number-pad"
                  placeholder="DD"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={styles.dobInputCol}>
                <Text style={styles.microLabel}>MONTH</Text>
                <TextInput
                  style={styles.dobInput}
                  value={dobMonth}
                  onChangeText={(val) => {
                    const clean = val.replace(/\D/g, '').slice(0, 2);
                    setDobMonth(clean);
                  }}
                  keyboardType="number-pad"
                  placeholder="MM"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={[styles.dobInputCol, { flex: 1.4 }]}>
                <Text style={styles.microLabel}>YEAR</Text>
                <TextInput
                  style={styles.dobInput}
                  value={dobYear}
                  onChangeText={(val) => {
                    const clean = val.replace(/\D/g, '').slice(0, 4);
                    setDobYear(clean);
                  }}
                  keyboardType="number-pad"
                  placeholder="YYYY"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </View>

          {/* Height & Current Weight: Side-by-side with Unit Toggles */}
          <View style={styles.sideBySideRow}>
            {/* Height Box */}
            <View style={styles.halfCol}>
              <View style={styles.sideHeaderRow}>
                <Text style={styles.labelCompact}>Height</Text>
                <View style={styles.unitToggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.unitPill,
                      heightUnit === 'cm' && styles.unitPillActive,
                    ]}
                    onPress={() => toggleHeightUnit('cm')}
                  >
                    <Text
                      style={[
                        styles.unitPillText,
                        heightUnit === 'cm' && styles.unitPillTextActive,
                      ]}
                    >
                      cm
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.unitPill,
                      heightUnit === 'ft' && styles.unitPillActive,
                    ]}
                    onPress={() => toggleHeightUnit('ft')}
                  >
                    <Text
                      style={[
                        styles.unitPillText,
                        heightUnit === 'ft' && styles.unitPillTextActive,
                      ]}
                    >
                      ft/in
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {heightUnit === 'cm' ? (
                <View style={styles.metricInputWrapper}>
                  <TextInput
                    style={styles.metricInput}
                    value={heightCm}
                    onChangeText={(val) => setHeightCm(val.replace(/\D/g, '').slice(0, 3))}
                    keyboardType="number-pad"
                    placeholder="175"
                    placeholderTextColor="#9CA3AF"
                  />
                  <Text style={styles.metricSuffix}>cm</Text>
                </View>
              ) : (
                <View style={styles.ftInRow}>
                  <View style={styles.ftInWrapper}>
                    <TextInput
                      style={styles.ftInInput}
                      value={heightFt}
                      onChangeText={(val) => setHeightFt(val.replace(/\D/g, '').slice(0, 1))}
                      keyboardType="number-pad"
                      placeholder="5"
                      placeholderTextColor="#9CA3AF"
                    />
                    <Text style={styles.ftInSuffix}>ft</Text>
                  </View>
                  <View style={styles.ftInWrapper}>
                    <TextInput
                      style={styles.ftInInput}
                      value={heightIn}
                      onChangeText={(val) => setHeightIn(val.replace(/\D/g, '').slice(0, 2))}
                      keyboardType="number-pad"
                      placeholder="9"
                      placeholderTextColor="#9CA3AF"
                    />
                    <Text style={styles.ftInSuffix}>in</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Current Weight Box */}
            <View style={styles.halfCol}>
              <View style={styles.sideHeaderRow}>
                <Text style={styles.labelCompact}>Weight</Text>
                <View style={styles.unitToggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.unitPill,
                      weightUnit === 'kg' && styles.unitPillActive,
                    ]}
                    onPress={() => toggleWeightUnit('kg')}
                  >
                    <Text
                      style={[
                        styles.unitPillText,
                        weightUnit === 'kg' && styles.unitPillTextActive,
                      ]}
                    >
                      kg
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.unitPill,
                      weightUnit === 'lbs' && styles.unitPillActive,
                    ]}
                    onPress={() => toggleWeightUnit('lbs')}
                  >
                    <Text
                      style={[
                        styles.unitPillText,
                        weightUnit === 'lbs' && styles.unitPillTextActive,
                      ]}
                    >
                      lbs
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.metricInputWrapper}>
                <TextInput
                  style={styles.metricInput}
                  value={weightValue}
                  onChangeText={(val) => setWeightValue(val.replace(/[^\d.]/g, '').slice(0, 5))}
                  keyboardType="decimal-pad"
                  placeholder="74"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.metricSuffix}>{weightUnit}</Text>
              </View>
            </View>
          </View>

          {/* Workout Frequency */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Workout Frequency</Text>
            <View style={styles.pillGrid}>
              {(['0-4 days/wk', '4-6 days/wk', '7+ days/wk'] as const).map((freq) => {
                const isSelected = workoutFrequency === freq;
                return (
                  <TouchableOpacity
                    key={freq}
                    style={[styles.choicePill, isSelected && styles.choicePillActive]}
                    onPress={() => {
                      triggerHaptic('selection');
                      setWorkoutFrequency(freq);
                    }}
                    activeOpacity={0.8}
                  >
                    {isSelected && <Check size={14} color="#FFFFFF" style={styles.checkIcon} />}
                    <Text
                      style={[
                        styles.choicePillText,
                        isSelected && styles.choicePillTextActive,
                      ]}
                    >
                      {freq}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Diet Preference */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Diet Preference</Text>
            <View style={styles.pillWrap}>
              {(
                [
                  'Vegetarian',
                  'Eggetarian',
                  'Non-vegetarian',
                  'Vegan',
                  'No specific',
                ] as const
              ).map((diet) => {
                const isSelected = dietPreference === diet;
                return (
                  <TouchableOpacity
                    key={diet}
                    style={[styles.dietPill, isSelected && styles.dietPillActive]}
                    onPress={() => {
                      triggerHaptic('selection');
                      setDietPreference(diet);
                    }}
                    activeOpacity={0.8}
                  >
                    {isSelected && <Check size={13} color="#FFFFFF" style={styles.checkIcon} />}
                    <Text
                      style={[
                        styles.dietPillText,
                        isSelected && styles.dietPillTextActive,
                      ]}
                    >
                      {diet}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Primary Goal */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Primary Goal</Text>
            <View style={styles.goalList}>
              {(
                [
                  { key: 'Lose weight', desc: 'Caloric deficit, fat loss & lean tone' },
                  { key: 'Maintain weight', desc: 'Sustained energy & body recomposition' },
                  { key: 'Build muscle', desc: 'Caloric surplus & hypertrophy targeting' },
                  { key: 'Improve fitness', desc: 'Endurance, stamina & peak athletic recovery' },
                  { key: 'Healthy habits', desc: 'Balanced macronutrients & mindful nutrition' },
                ] as const
              ).map((goalItem) => {
                const isSelected = primaryGoal === goalItem.key;
                return (
                  <TouchableOpacity
                    key={goalItem.key}
                    style={[styles.goalRow, isSelected && styles.goalRowActive]}
                    onPress={() => {
                      triggerHaptic('selection');
                      setPrimaryGoal(goalItem.key);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.goalRadioCircle}>
                      {isSelected && <View style={styles.goalRadioInner} />}
                    </View>
                    <View style={styles.goalTextCol}>
                      <Text style={[styles.goalTitle, isSelected && styles.goalTitleActive]}>
                        {goalItem.key}
                      </Text>
                      <Text style={styles.goalDesc}>{goalItem.desc}</Text>
                    </View>
                    {isSelected && <Check size={16} color="#1D4D3E" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Submit Primary CTA */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.submitRow}>
              <Text style={styles.submitButtonText}>
                {primaryGoal === 'Lose weight' || primaryGoal === 'Build muscle'
                  ? 'Continue to Target Calibration'
                  : 'Generate My Nutrition Plan'}
              </Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>

        {/* Footer: Already have an account? Log In */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an athlete account? </Text>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('selection');
              router.push(`/auth/login?redirect=${redirectParam}`);
            }}
          >
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 48,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 10,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D4D3E',
    marginLeft: 2,
  },
  stepBadge: {
    backgroundColor: '#E8F2EC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4D3E',
  },
  header: {
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1D4D3E',
    marginRight: 6,
  },
  brandWordmark: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#1D4D3E',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#4B5563',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    height: '100%',
  },
  eyeButton: {
    padding: 6,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  segmentBtnActive: {
    backgroundColor: '#1D4D3E',
    borderColor: '#1D4D3E',
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dobLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dobTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelWithIcon: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  liveAgeBadge: {
    backgroundColor: '#E8F2EC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveAgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4D3E',
  },
  dobInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dobInputCol: {
    flex: 1,
  },
  microLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  dobInput: {
    height: 42,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  sideBySideRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  halfCol: {
    flex: 1,
  },
  sideHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  labelCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  unitToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    padding: 2,
  },
  unitPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unitPillActive: {
    backgroundColor: '#1D4D3E',
  },
  unitPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  unitPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  metricInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
  },
  metricInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  metricSuffix: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 4,
  },
  ftInRow: {
    flexDirection: 'row',
    gap: 6,
  },
  ftInWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
  },
  ftInInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  ftInSuffix: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  pillGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  choicePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  choicePillActive: {
    backgroundColor: '#1D4D3E',
    borderColor: '#1D4D3E',
  },
  choicePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  choicePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  checkIcon: {
    marginRight: 4,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dietPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dietPillActive: {
    backgroundColor: '#1D4D3E',
    borderColor: '#1D4D3E',
  },
  dietPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  dietPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  goalList: {
    gap: 8,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  goalRowActive: {
    borderColor: '#1D4D3E',
    backgroundColor: '#F0F6F2',
  },
  goalRadioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#1D4D3E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  goalRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1D4D3E',
  },
  goalTextCol: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  goalTitleActive: {
    color: '#1D4D3E',
  },
  goalDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: '#1D4D3E',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1D4D3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#4B5563',
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4D3E',
  },
});
