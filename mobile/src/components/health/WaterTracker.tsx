import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radii } from '../../theme/radii';
import { getAuthToken } from '../../services/apiClient';
import { getLocalDateString } from '../../utils/date';
import { API_BASE_URL, LOCAL_USB_URL, LOCAL_LAN_URL } from '../../config/api';

export interface WaterTrackerProps {
  currentMl?: number;
  goalMl?: number;
  onLogWater?: (amountMl: number) => void;
  onAddWater?: (amountMl: number) => void;
}

/**
 * WaterTracker - Daily Hydration Tracker Component.
 * Specification:
 * - Accept real currentMl (default 0) and goalMl (default 3000).
 * - Display real percentage, glass markers (250ml per glass).
 * - Supports portion multipliers (0.5x, 1x, 1.5x, 2x) & 1-tap logging.
 * - Flat geometric design conforming to NutriFlex Forest Green theme.
 */
export const WaterTracker: React.FC<WaterTrackerProps> = ({
  currentMl = 0,
  goalMl = 3000,
  onLogWater,
  onAddWater,
}) => {
  const [consumedMl, setConsumedMl] = useState(currentMl);
  const [portionMultiplier, setPortionMultiplier] = useState<number>(1);

  useEffect(() => {
    setConsumedMl(currentMl);
  }, [currentMl]);

  const handleAdd = async (amount: number) => {
    const nextVal = consumedMl + amount;
    setConsumedMl(nextVal);
    if (onAddWater) {
      onAddWater(amount);
    } else if (onLogWater) {
      onLogWater(amount);
    }

    // Direct server persistence with Bearer token
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const todayStr = getLocalDateString();
      const urls = [
        `${API_BASE_URL}/api/mobile/nutrition/water`,
        `${LOCAL_USB_URL}/api/mobile/nutrition/water`,
        `${LOCAL_LAN_URL}/api/mobile/nutrition/water`,
        'http://localhost:3000/api/mobile/nutrition/water',
      ];
      for (const u of urls) {
        try {
          const res = await fetch(u, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              date: todayStr,
              amountMl: amount,
              waterMl: nextVal,
            }),
          });
          if (res.ok) break;
        } catch {}
      }
    } catch (e) {
      console.warn('[WaterTracker] Backend water sync error:', e);
    }
  };

  const percentage = goalMl > 0 ? Math.min(100, Math.round((consumedMl / goalMl) * 100)) : 0;
  const glassCapacity = 250;
  const totalGlasses = Math.max(1, Math.min(12, Math.round(goalMl / glassCapacity)));
  const filledGlasses = Math.min(totalGlasses, Math.floor(consumedMl / glassCapacity));
  const remainingMl = Math.max(0, goalMl - consumedMl);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="water" size={16} color="#0284C7" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Hydration</Text>
            <Text style={styles.cardSubtitle}>Daily Water Intake</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.percentBadge}>
            <Text style={styles.percentText}>{percentage}%</Text>
          </View>
        </View>
      </View>

      {/* Main Intake Readout */}
      <View style={styles.readoutRow}>
        <View style={styles.readoutLeft}>
          <Text style={styles.currentText}>{consumedMl.toLocaleString()}</Text>
          <Text style={styles.goalText}> / {goalMl.toLocaleString()} ml</Text>
        </View>
        <Text style={styles.remainingText}>
          {remainingMl > 0
            ? `${remainingMl.toLocaleString()} ml remaining`
            : 'Daily Goal Achieved! 🎉'}
        </Text>
      </View>

      {/* Continuous Progress Bar */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
      </View>

      {/* Glass Markers Strip */}
      <View style={styles.glassMarkersContainer}>
        <Text style={styles.glassMarkersTitle}>Glasses ({filledGlasses}/{totalGlasses})</Text>
        <View style={styles.glassesGrid}>
          {Array.from({ length: totalGlasses }).map((_, index) => {
            const isFilled = index < filledGlasses;
            return (
              <View
                key={index}
                style={[
                  styles.glassSlot,
                  isFilled ? styles.glassSlotFilled : styles.glassSlotEmpty,
                ]}
              >
                <Ionicons
                  name={isFilled ? 'water' : 'water-outline'}
                  size={14}
                  color={isFilled ? '#0284C7' : '#9CA3AF'}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* Portion Multiplier Capsules */}
      <View style={styles.multiplierContainer}>
        <Text style={styles.glassMarkersTitle}>PORTION MULTIPLIER</Text>
        <View style={styles.multiplierRow}>
          {[0.5, 1, 1.5, 2].map((mult) => {
            const isSelected = portionMultiplier === mult;
            return (
              <TouchableOpacity
                key={mult}
                activeOpacity={0.75}
                onPress={() => setPortionMultiplier(mult)}
                style={[
                  styles.multiplierPill,
                  isSelected && styles.multiplierPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.multiplierPillText,
                    isSelected && styles.multiplierPillTextActive,
                  ]}
                >
                  {mult}x
                </Text>
                <Text
                  style={[
                    styles.multiplierSubtext,
                    isSelected && styles.multiplierSubtextActive,
                  ]}
                >
                  {Math.round(250 * mult)}ml
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 1-Tap Quick Log Action Buttons */}
      <View style={styles.quickAddRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleAdd(Math.round(250 * portionMultiplier))}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={14} color="#0284C7" />
          <Ionicons name="water-outline" size={14} color="#0284C7" style={{ marginHorizontal: 2 }} />
          <Text style={styles.addBtnText}>+{Math.round(250 * portionMultiplier)} ml</Text>
          <Text style={styles.addBtnSubtext}>
            {portionMultiplier === 1
              ? 'Glass'
              : portionMultiplier === 0.5
              ? 'Half Glass'
              : portionMultiplier === 1.5
              ? 'Large Glass'
              : 'Bottle'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleAdd(500)}
          style={[styles.addBtn, styles.addBtnPrimary]}
        >
          <Ionicons name="add" size={14} color="#1D4D3E" />
          <Ionicons name="water" size={14} color="#1D4D3E" style={{ marginHorizontal: 2 }} />
          <Text style={[styles.addBtnText, styles.addBtnPrimaryText]}>+500 ml</Text>
          <Text style={[styles.addBtnSubtext, styles.addBtnPrimarySubtext]}>Bottle</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EBECE8',
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.round,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#111111',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: typography.weights.medium,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  percentText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#0284C7',
  },
  readoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  readoutLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentText: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
    color: '#111111',
    letterSpacing: -0.3,
  },
  goalText: {
    fontSize: 14,
    fontWeight: typography.weights.medium,
    color: '#6B7280',
  },
  remainingText: {
    fontSize: 11,
    fontWeight: typography.weights.semiBold,
    color: '#0284C7',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: radii.pill,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0284C7',
    borderRadius: radii.pill,
  },
  glassMarkersContainer: {
    marginBottom: spacing.md,
  },
  glassMarkersTitle: {
    fontSize: 11,
    fontWeight: typography.weights.semiBold,
    color: '#6B7280',
    marginBottom: 6,
  },
  glassesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  glassSlot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  glassSlotFilled: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  glassSlotEmpty: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  multiplierContainer: {
    marginBottom: spacing.md,
  },
  multiplierRow: {
    flexDirection: 'row',
    gap: 6,
  },
  multiplierPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  multiplierPillActive: {
    backgroundColor: '#1D4D3E',
    borderColor: '#1D4D3E',
  },
  multiplierPillText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#475569',
  },
  multiplierPillTextActive: {
    color: '#FFFFFF',
  },
  multiplierSubtext: {
    fontSize: 9,
    fontWeight: typography.weights.medium,
    color: '#94A3B8',
    marginTop: 1,
  },
  multiplierSubtextActive: {
    color: '#C6DED4',
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    paddingVertical: 10,
    gap: 4,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: '#0284C7',
  },
  addBtnSubtext: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: '#0369A1',
    marginLeft: 2,
  },
  addBtnPrimary: {
    backgroundColor: '#E8F1ED',
    borderColor: '#C6DED4',
  },
  addBtnPrimaryText: {
    color: '#1D4D3E',
  },
  addBtnPrimarySubtext: {
    color: '#1D4D3E',
  },
});
