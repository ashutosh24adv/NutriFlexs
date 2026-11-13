import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radii } from '../theme/radii';
import { diaryActions } from '../store/diaryStore';
import { DiarySlot } from './MealDiarySection';

import { API_BASE_URL, LOCAL_USB_URL, LOCAL_LAN_URL } from '../config/api';

export interface ScanItem {
  name: string;
  portionLabel: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface ScanTotals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface MealScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onMealLogged?: (meal: {
    title: string;
    category: DiarySlot;
    calories: number;
    macros: { protein: number; carbs: number; fat: number };
  }) => void;
}

const MEAL_SLOTS: DiarySlot[] = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];

function getDefaultSlot(): DiarySlot {
  const currentHour = new Date().getHours();
  if (currentHour < 11) return 'Breakfast';
  if (currentHour < 16) return 'Lunch';
  if (currentHour < 19) return 'Snacks';
  return 'Dinner';
}

export const MealScannerModal: React.FC<MealScannerModalProps> = ({
  visible,
  onClose,
  onMealLogged,
}) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<DiarySlot>(getDefaultSlot());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [scanResult, setScanResult] = useState<{
    mealTitle: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    items: ScanItem[];
    totals: ScanTotals;
    source?: string;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      setSelectedSlot(getDefaultSlot());
      setErrorMessage(null);
    } else {
      // Reset state on close
      setImageUri(null);
      setIsScanning(false);
      setScanResult(null);
      setErrorMessage(null);
    }
  }, [visible]);

  const handlePickImage = async (useCamera: boolean) => {
    setErrorMessage(null);
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Camera Permission Required',
            'NutriFlexs needs camera permission to snap photos of your meals for AI calorie estimation.'
          );
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Gallery Permission Required',
            'NutriFlexs needs photo library access to choose meal photos from your gallery.'
          );
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        base64: true,
        quality: 0.7,
        allowsEditing: true,
        aspect: [4, 3],
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);

        if (asset.base64) {
          analyzeMeal(asset.base64, asset.mimeType || 'image/jpeg');
        } else {
          setErrorMessage('Could not extract image data. Please try again.');
        }
      }
    } catch (err: any) {
      console.error('[MealScannerModal] Image pick error:', err);
      setErrorMessage(err?.message || 'Failed to open camera or gallery.');
    }
  };

  const analyzeMeal = async (imageBase64: string, mimeType: string) => {
    setIsScanning(true);
    setErrorMessage(null);
    setScanResult(null);

    try {
      const urlsToTry = [API_BASE_URL, LOCAL_USB_URL, LOCAL_LAN_URL];
      let response: any = null;
      let lastErr: any = null;

      for (const targetUrl of urlsToTry) {
        try {
          const endpoint = `${targetUrl.replace(/\/$/, '')}/api/mobile/scan-meal`;
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageBase64,
              mimeType,
            }),
          });
          if (res.ok) {
            response = res;
            break;
          }
        } catch (err: any) {
          lastErr = err;
        }
      }

      if (!response) {
        throw lastErr || new Error('Backend server is unreachable. Please verify network connection.');
      }

      const json = await response.json();

      if (json && json.success) {
        const mealTitle = json.mealTitle || json.data?.mealTitle || 'Analyzed Meal';
        const confidence = (json.confidence || json.data?.confidence || 'HIGH') as 'HIGH' | 'MEDIUM' | 'LOW';
        const items = json.items || json.data?.items || [];
        const totals = json.totals || json.data?.totals || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
        };

        setScanResult({
          mealTitle,
          confidence,
          items,
          totals,
          source: json.source,
        });
      } else {
        setErrorMessage(json?.error || 'Could not analyze meal image. Please try another angle.');
      }
    } catch (err: any) {
      console.error('[MealScannerModal] Analysis API error:', err);
      setErrorMessage(`Network error connecting to backend: ${err?.message || 'Server unreachable'}. Ensure dev server is running and ADB reverse is active.`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmLog = () => {
    if (!scanResult) return;

    diaryActions.addMeal({
      title: scanResult.mealTitle,
      category: selectedSlot,
      calories: Math.round(scanResult.totals.calories),
      macros: {
        protein: Math.round(scanResult.totals.protein),
        carbs: Math.round(scanResult.totals.carbs),
        fat: Math.round(scanResult.totals.fats),
      },
    });

    if (onMealLogged) {
      onMealLogged({
        title: scanResult.mealTitle,
        category: selectedSlot,
        calories: Math.round(scanResult.totals.calories),
        macros: {
          protein: Math.round(scanResult.totals.protein),
          carbs: Math.round(scanResult.totals.carbs),
          fat: Math.round(scanResult.totals.fats),
        },
      });
    }

    onClose();
  };

  const getConfidenceBadge = (confidence: 'HIGH' | 'MEDIUM' | 'LOW') => {
    if (confidence === 'HIGH') {
      return (
        <View style={[styles.confidenceBadge, styles.confidenceHigh]}>
          <Ionicons name="checkmark-circle" size={13} color="#15803D" style={{ marginRight: 4 }} />
          <Text style={styles.confidenceHighText}>HIGH CONFIDENCE (94%)</Text>
        </View>
      );
    }
    if (confidence === 'MEDIUM') {
      return (
        <View style={[styles.confidenceBadge, styles.confidenceMedium]}>
          <Ionicons name="information-circle" size={13} color="#B45309" style={{ marginRight: 4 }} />
          <Text style={styles.confidenceMediumText}>ESTIMATED PORTIONS</Text>
        </View>
      );
    }
    return (
      <View style={[styles.confidenceBadge, styles.confidenceLow]}>
        <Ionicons name="help-circle" size={13} color="#4B5563" style={{ marginRight: 4 }} />
        <Text style={styles.confidenceLowText}>ROUGH ESTIMATE</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="camera" size={20} color="#1D4D3E" />
            </View>
            <View>
              <Text style={styles.headerTitle}>AI Snap-to-Calorie</Text>
              <Text style={styles.headerSubtitle}>Indian Nutrition & Gym Macro Vision</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={22} color="#4B5563" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Instruction or Error Alert */}
          {errorMessage && (
            <View style={styles.errorAlert}>
              <Ionicons name="alert-circle" size={16} color="#B91C1C" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Section 1: Capture or View Image */}
          {!imageUri ? (
            <View style={styles.pickerHeroCard}>
              <View style={styles.heroCameraCircle}>
                <Ionicons name="scan-outline" size={40} color="#1D4D3E" />
              </View>
              <Text style={styles.pickerHeroTitle}>Scan Any Meal or Snack</Text>
              <Text style={styles.pickerHeroSubtitle}>
                Take a quick snap or select from your gallery. NutriFlex AI identifies
                Indian rotis, dal, sabzi, paneer, chicken breast, and estimates macro totals.
              </Text>

              <View style={styles.buttonStack}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.primaryCaptureBtn}
                  onPress={() => handlePickImage(true)}
                >
                  <Ionicons name="camera" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryCaptureText}>Take a Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.secondaryGalleryBtn}
                  onPress={() => handlePickImage(false)}
                >
                  <Ionicons name="images-outline" size={18} color="#1D4D3E" style={{ marginRight: 8 }} />
                  <Text style={styles.secondaryGalleryText}>Choose from Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.previewContainer}>
              <View style={styles.imageWrapper}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />

                {/* Retake / Change Button */}
                <TouchableOpacity
                  style={styles.retakeFloatingBtn}
                  onPress={() => handlePickImage(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="camera-reverse" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.retakeText}>Retake</Text>
                </TouchableOpacity>

                {/* Scanning Overlay Animation */}
                {isScanning && (
                  <View style={styles.scanningOverlay}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.scanningText}>NutriFlex AI analyzing meal...</Text>
                    <Text style={styles.scanningSubtext}>
                      Detecting dishes, portion sizes & gym fitness macros
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Section 2: Analysis Results Card */}
          {scanResult && !isScanning && (
            <View style={styles.resultsCard}>
              {/* Card Header: Title + Confidence */}
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.detectedMealTitle}>{scanResult.mealTitle}</Text>
                  <Text style={styles.detectedMealSubtitle}>AI Detected Meal</Text>
                </View>
                {getConfidenceBadge(scanResult.confidence)}
              </View>

              {/* Total Fuel Macro Strip */}
              <View style={styles.totalsBanner}>
                <View style={styles.totalStatBox}>
                  <Text style={styles.totalStatVal}>{Math.round(scanResult.totals.calories)}</Text>
                  <Text style={styles.totalStatLabel}>Calories (kcal)</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.totalStatBox}>
                  <Text style={[styles.totalStatVal, { color: '#1D4D3E' }]}>
                    {Math.round(scanResult.totals.protein)}g
                  </Text>
                  <Text style={styles.totalStatLabel}>Protein</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.totalStatBox}>
                  <Text style={[styles.totalStatVal, { color: '#F59E0B' }]}>
                    {Math.round(scanResult.totals.carbs)}g
                  </Text>
                  <Text style={styles.totalStatLabel}>Carbs</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.totalStatBox}>
                  <Text style={[styles.totalStatVal, { color: '#EA580C' }]}>
                    {Math.round(scanResult.totals.fats)}g
                  </Text>
                  <Text style={styles.totalStatLabel}>Fats</Text>
                </View>
              </View>

              {/* Itemized Breakdown List */}
              <View style={styles.breakdownHeader}>
                <Ionicons name="list" size={15} color="#1D4D3E" style={{ marginRight: 6 }} />
                <Text style={styles.breakdownTitle}>Itemized Dish Breakdown</Text>
              </View>

              <View style={styles.itemsList}>
                {scanResult.items.map((item, idx) => (
                  <View key={`item-${idx}`} style={styles.itemRow}>
                    <View style={styles.itemBullet} />
                    <View style={styles.itemInfo}>
                      <View style={styles.itemMainRow}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemCalories}>{Math.round(item.calories)} kcal</Text>
                      </View>
                      <View style={styles.itemSubRow}>
                        <Text style={styles.itemPortion}>
                          {item.portionLabel || `${item.grams}g`}
                        </Text>
                        <Text style={styles.itemMacros}>
                          P: {Math.round(item.protein)}g • C: {Math.round(item.carbs)}g • F: {Math.round(item.fats)}g
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Meal Slot Picker (4 capsules) */}
              <View style={styles.slotPickerSection}>
                <Text style={styles.slotPickerLabel}>Log to Meal Slot</Text>
                <View style={styles.slotsRow}>
                  {MEAL_SLOTS.map((slot) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <TouchableOpacity
                        key={slot}
                        activeOpacity={0.8}
                        style={[styles.slotCapsule, isSelected && styles.slotCapsuleActive]}
                        onPress={() => setSelectedSlot(slot)}
                      >
                        <Text
                          style={[styles.slotCapsuleText, isSelected && styles.slotCapsuleTextActive]}
                        >
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Primary Action Button: Log to Diary */}
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.confirmButton}
                onPress={handleConfirmLog}
              >
                <Ionicons name="checkmark-done" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.confirmButtonText}>+ Log Meal to Today's Diary</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F6', // Off-white canvas
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EBECE8',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: '#E8F2EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: '#F3F4F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 48,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    padding: 12,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    flex: 1,
    fontWeight: '500',
  },
  pickerHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
  },
  heroCameraCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F2EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  pickerHeroTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  pickerHeroSubtitle: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.xl,
    paddingHorizontal: 12,
  },
  buttonStack: {
    width: '100%',
    gap: 12,
  },
  primaryCaptureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D4D3E',
    height: 48,
    borderRadius: radii.pill,
  },
  primaryCaptureText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryGalleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1D4D3E',
    height: 48,
    borderRadius: radii.pill,
  },
  secondaryGalleryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1D4D3E',
  },
  previewContainer: {
    marginBottom: spacing.lg,
  },
  imageWrapper: {
    width: '100%',
    height: 220,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  retakeFloatingBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 77, 62, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  retakeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scanningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(29, 77, 62, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  scanningText: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  scanningSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#E8F2EC',
    textAlign: 'center',
  },
  resultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  detectedMealTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  detectedMealSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  confidenceHigh: {
    backgroundColor: '#DCFCE7',
  },
  confidenceHighText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  confidenceMedium: {
    backgroundColor: '#FEF3C7',
  },
  confidenceMediumText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  confidenceLow: {
    backgroundColor: '#F3F4F6',
  },
  confidenceLowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  totalsBanner: {
    flexDirection: 'row',
    backgroundColor: '#F7F8F6',
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#EBECE8',
  },
  totalStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  totalStatVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  totalStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4D3E',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  itemsList: {
    backgroundColor: '#FAFBF9',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#EBECE8',
    padding: 10,
    marginBottom: spacing.lg,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0EE',
  },
  itemBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1D4D3E',
    marginTop: 6,
    marginRight: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  itemCalories: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EA580C',
    marginLeft: 8,
  },
  itemSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  itemPortion: {
    fontSize: 12,
    color: '#6B7280',
  },
  itemMacros: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
  },
  slotPickerSection: {
    marginBottom: spacing.lg,
  },
  slotPickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  slotCapsule: {
    flex: 1,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: '#F3F4F1',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotCapsuleActive: {
    backgroundColor: '#1D4D3E',
    borderColor: '#1D4D3E',
  },
  slotCapsuleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  slotCapsuleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D4D3E',
    height: 50,
    borderRadius: radii.pill,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
