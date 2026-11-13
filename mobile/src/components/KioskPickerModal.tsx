import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radii } from '../theme/radii';

export interface KioskLocation {
  id: string;
  name: string;
  distance: string;
  status: string;
  prepTime: string;
  isPopular?: boolean;
}

export const PARTNER_KIOSKS: KioskLocation[] = [
  {
    id: 'hsr',
    name: 'Cult.fit HSR Layout',
    distance: '50m',
    status: 'OPEN',
    prepTime: '~5 MIN PREP',
    isPopular: true,
  },
  {
    id: 'indiranagar',
    name: 'Cult.fit Indiranagar',
    distance: '1.2km',
    status: 'OPEN',
    prepTime: '~5 MIN PREP',
  },
  {
    id: 'koramangala',
    name: "Gold's Gym Koramangala",
    distance: '2.4km',
    status: 'OPEN',
    prepTime: '~5 MIN PREP',
  },
  {
    id: 'bandra',
    name: 'Nitrro Wellness Bandra',
    distance: '4.1km',
    status: 'OPEN',
    prepTime: '~5 MIN PREP',
  },
];

interface KioskPickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedKiosk: string;
  onSelectKiosk: (kioskName: string) => void;
}

export const KioskPickerModal: React.FC<KioskPickerModalProps> = ({
  visible,
  onClose,
  selectedKiosk,
  onSelectKiosk,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop dismiss */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Bottom Sheet Card */}
        <View style={styles.sheetContainer}>
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sheetTitle}>Select Express Kiosk</Text>
              <Text style={styles.sheetSubtitle}>
                Choose your nearby gym kiosk for instant pickup
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* List of Kiosks */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {PARTNER_KIOSKS.map((kiosk) => {
              const isSelected = selectedKiosk.includes(kiosk.name) || kiosk.name.includes(selectedKiosk);

              return (
                <TouchableOpacity
                  key={kiosk.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    onSelectKiosk(kiosk.name);
                    onClose();
                  }}
                  style={[
                    styles.kioskCard,
                    isSelected && styles.kioskCardActive,
                  ]}
                >
                  <View style={styles.kioskLeft}>
                    <View
                      style={[
                        styles.pinCircle,
                        isSelected && styles.pinCircleActive,
                      ]}
                    >
                      <Ionicons
                        name="location"
                        size={18}
                        color={isSelected ? colors.surface : colors.brandGreen}
                      />
                    </View>

                    <View style={styles.kioskInfo}>
                      <View style={styles.nameRow}>
                        <Text
                          style={[
                            styles.kioskName,
                            isSelected && styles.kioskNameActive,
                          ]}
                        >
                          {kiosk.name}
                        </Text>
                        {kiosk.isPopular && (
                          <View style={styles.popularBadge}>
                            <Text style={styles.popularBadgeText}>Nearest</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.metaRow}>
                        <View style={styles.openDot} />
                        <Text style={styles.statusText}>
                          {kiosk.status} • {kiosk.prepTime}
                        </Text>
                        <Text style={styles.dotDivider}>•</Text>
                        <Text style={styles.distanceText}>{kiosk.distance}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Selection Checkmark */}
                  {isSelected ? (
                    <View style={styles.checkIcon}>
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.brandGreen}
                      />
                    </View>
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.text.muted}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
    maxHeight: '75%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.borderDark,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  sheetTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  sheetSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radii.round,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  kioskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kioskCardActive: {
    borderColor: colors.brandGreen,
    backgroundColor: colors.brandGreenSoft,
  },
  kioskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  pinCircle: {
    width: 38,
    height: 38,
    borderRadius: radii.round,
    backgroundColor: colors.brandGreenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCircleActive: {
    backgroundColor: colors.brandGreen,
  },
  kioskInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  kioskName: {
    fontSize: typography.sizes.sm + 1,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  kioskNameActive: {
    color: colors.brandGreen,
  },
  popularBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.xs,
  },
  popularBadgeText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.brandGreen,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: radii.round,
    backgroundColor: colors.status.success,
  },
  statusText: {
    fontSize: typography.sizes.xs - 2,
    fontWeight: typography.weights.semiBold,
    color: colors.brandGreen,
  },
  dotDivider: {
    fontSize: typography.sizes.xs - 2,
    color: colors.text.muted,
  },
  distanceText: {
    fontSize: typography.sizes.xs - 2,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  checkIcon: {
    marginLeft: spacing.xs,
  },
});
