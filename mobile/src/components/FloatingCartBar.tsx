import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';

export interface FloatingCartBarProps {
  itemCount: number;
  totalAmount: number;
  pickupSlot?: string;
  onViewCart?: () => void;
  bottomOffset?: number;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({
  itemCount,
  totalAmount,
  pickupSlot = '⚡ Pickup in 5 mins',
  onViewCart,
  bottomOffset = 16,
}) => {
  const router = useRouter();

  if (itemCount <= 0) return null;

  const handlePress = () => {
    if (onViewCart) {
      onViewCart();
    } else {
      router.push('/cart');
    }
  };

  return (
    <View
      style={[
        styles.pinnedContainer,
        { bottom: bottomOffset },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={styles.cartBar}
      >
        {/* Left Side: '2 Items | ₹448' */}
        <View style={styles.leftSection}>
          <Text style={styles.itemsPriceText}>
            {itemCount} {itemCount === 1 ? 'Item' : 'Items'} | ₹{totalAmount}
          </Text>
          <Text style={styles.slotSubtext}>
            Cult.fit HSR • {pickupSlot}
          </Text>
        </View>

        {/* Right Side: 'View Cart →' */}
        <View style={styles.rightSection}>
          <Text style={styles.viewCartText}>View Cart →</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  pinnedContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999,
  },
  cartBar: {
    backgroundColor: '#1D4D3E', // Solid Deep Forest Green
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#1D4D3E',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  leftSection: {
    flex: 1,
    justifyContent: 'center',
  },
  itemsPriceText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  slotSubtext: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingLeft: 12,
  },
  viewCartText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
