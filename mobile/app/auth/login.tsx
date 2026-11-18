import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronLeft,
  ArrowRight,
  AlertCircle,
  Check,
} from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import {
  saveSecureToken,
  triggerHaptic,
  mobileApiRequest,
} from './_authHelpers';

export default function LoginScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ redirect?: string }>();
  const redirectParam = searchParams.redirect || 'track';
  const { fetchMe, updateProfile } = useAuthStore();

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMessage(null);

    if (!emailOrPhone.trim()) {
      setErrorMessage('Please enter your email or phone number');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setLoading(true);
    triggerHaptic('light');

    const isEmail = emailOrPhone.includes('@');
    const loginPayload = {
      email: isEmail ? emailOrPhone.trim().toLowerCase() : undefined,
      phone: !isEmail ? emailOrPhone.trim() : undefined,
      username: emailOrPhone.trim(),
      password,
    };

    try {
      const res = await mobileApiRequest<{
        token?: string;
        jwt?: string;
        accessToken?: string;
        user?: any;
        nutritionGoal?: any;
      }>('/api/mobile/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginPayload),
      });

      if (!res.ok) {
        setErrorMessage(res.error || 'Invalid credentials. Please verify your details.');
        setLoading(false);
        triggerHaptic('warning');
        return;
      }

      // Extract JWT
      const token = res.data?.token || res.data?.jwt || res.data?.accessToken;
      if (!token) {
        setErrorMessage('Authentication response was missing token.');
        setLoading(false);
        triggerHaptic('warning');
        return;
      }

      // Store JWT in SecureStore
      await saveSecureToken(token);

      // Hydrate user profile in store with ALL athlete fields (do not strip them!)
      const rawUser = res.data?.user || {};
      const nutritionGoal = res.data?.nutritionGoal || rawUser.nutritionGoal || rawUser.goals || null;

      const athleteUser = {
        ...rawUser,
        id: rawUser.id || 'usr_athlete_01',
        name: rawUser.name || 'Nutri Member',
        email: rawUser.email || (isEmail ? emailOrPhone.trim().toLowerCase() : `${emailOrPhone.trim()}@nutriflex.fit`),
        phone: rawUser.phone || (!isEmail ? emailOrPhone.trim() : ''),
        membershipTier: rawUser.membershipTier || 'PRO',
        homeKiosk: rawUser.homeKiosk || 'Cult.fit HSR Layout, Bengaluru',
        passBalance: rawUser.passBalance ?? 0,
        memberCode: rawUser.memberCode,
        avatarInitials: rawUser.avatarInitials,
        // ALL athlete fields from res.data.user:
        weightKg: rawUser.weightKg,
        heightCm: rawUser.heightCm,
        sex: rawUser.sex,
        dateOfBirth: rawUser.dateOfBirth,
        workoutFrequency: rawUser.workoutFrequency,
        primaryGoal: rawUser.primaryGoal,
        dietPreference: rawUser.dietPreference,
        goals: rawUser.goals || nutritionGoal,
        nutritionGoal: nutritionGoal,
      };

      // Persist session to SecureStore and AsyncStorage with complete athlete user
      await useAuthStore.login({
        token,
        user: athleteUser,
        nutritionGoal,
      });

      // Background hydration
      if (typeof fetchMe === 'function') {
        fetchMe().catch(() => {});
      }
      await triggerHaptic('success');

      // Navigate to destination (supporting redirect=cart, order, or default track)
      const destination =
        redirectParam === 'order'
          ? '/(order)'
          : redirectParam === 'cart'
          ? '/cart'
          : '/(track)';

      // Dismiss stack so Android Back button never loops back into login/onboarding
      try {
        if (typeof (router as any).dismissAll === 'function') {
          (router as any).dismissAll();
        }
      } catch {}

      router.replace(destination as any);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Login failed. Please check your credentials and network connection.');
      triggerHaptic('warning');
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
            onPress={() => {
              if (typeof (router as any).canGoBack === 'function' && (router as any).canGoBack()) {
                router.back();
              } else {
                router.replace('/welcome');
              }
            }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color="#1D4D3E" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandDot} />
            <Text style={styles.brandWordmark}>NUTRIFLEXS</Text>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to access your daily nutrition targets, active macro diary, and gym kiosk pickups.
          </Text>
        </View>

        {/* Error Notification */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <AlertCircle size={18} color="#EF4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Login Credentials Card */}
        <View style={styles.card}>
          {/* Email or Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email or Phone</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="member@nutriflex.fit or mobile number"
                placeholderTextColor="#9CA3AF"
                value={emailOrPhone}
                onChangeText={setEmailOrPhone}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password with Show/Hide */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { paddingRight: 44 }]}
                placeholder="Enter your password"
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

          {/* Remember me row */}
          <View style={styles.rememberRow}>
            <TouchableOpacity
              style={styles.checkboxTouch}
              onPress={() => {
                triggerHaptic('selection');
                setRememberMe(!rememberMe);
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.checkbox,
                  rememberMe && styles.checkboxActive,
                ]}
              >
                {rememberMe && <Check size={12} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>Remember my device</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                alert('A password reset link has been dispatched to your email.');
              }}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Primary CTA: Sign In */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.submitRow}>
              <Text style={styles.submitButtonText}>Sign In to NutriFlexs</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>

        {/* Footer: Don't have an account? Sign Up */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('selection');
              router.push(`/auth/signup?redirect=${redirectParam}`);
            }}
          >
            <Text style={styles.signupLink}>Sign Up</Text>
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
    marginBottom: 16,
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
  header: {
    marginBottom: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
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
    height: 48,
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
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  checkboxTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#1D4D3E',
    borderColor: '#1D4D3E',
  },
  checkboxLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4D3E',
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
  signupLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4D3E',
  },
});

export { performSignOut } from './_authHelpers';
