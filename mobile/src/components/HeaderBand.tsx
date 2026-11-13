import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radii } from '../theme/radii';
import { KioskPickerModal } from './KioskPickerModal';

interface HeaderBandProps {
  kioskLocation?: string;
  onKioskPress?: () => void;
  onSelectKiosk?: (kioskName: string) => void;
  onAvatarPress?: () => void;
  userName?: string;
}

/**
 * Solid brand-colored header band (#1D4D3E) with interactive Express Kiosk picker.
 * Tapping the kiosk location opens the partner gyms bottom sheet selector.
 */
export const HeaderBand: React.FC<HeaderBandProps> = ({
  kioskLocation = 'Cult.fit HSR Layout',
  onKioskPress,
  onSelectKiosk,
  onAvatarPress,
  userName = 'Member',
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handleKioskPress = () => {
    if (onKioskPress) {
      onKioskPress();
    } else {
      setModalVisible(true);
    }
  };

  const handleSelect = (name: string) => {
    if (onSelectKiosk) {
      onSelectKiosk(name);
    }
    setModalVisible(false);
  };

  return (
    <>
      <View style={styles.header}>
        {/* Kiosk / Location Picker */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handleKioskPress}
          style={styles.locationSelector}
        >
          <View style={styles.labelRow}>
            <Ionicons name="location-sharp" size={12} color="rgba(255, 255, 255, 0.85)" />
            <Text style={styles.locationLabel}>PICKUP KIOSK</Text>
          </View>
          <View style={styles.locationRow}>
            <Text style={styles.locationName} numberOfLines={1}>
              {kioskLocation}
            </Text>
            <Text style={styles.dropdownArrow}> ▾</Text>
          </View>
        </TouchableOpacity>

        {/* User Avatar */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onAvatarPress}
          style={styles.avatarButton}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Interactive Kiosk Selection Bottom Sheet */}
      <KioskPickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        selectedKiosk={kioskLocation}
        onSelectKiosk={handleSelect}
      />
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#1D4D3E', // Primary Forest Green
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationSelector: {
    flex: 1,
    marginRight: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: typography.sizes.xs - 2,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationName: {
    color: colors.text.inverse,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  dropdownArrow: {
    color: colors.text.inverse,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  avatarButton: {
    minWidth: spacing.touchTargetMin,
    minHeight: spacing.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radii.round,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  avatarText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});
