import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

export interface ProductCardProps {
  id: string;
  name: string;
  isVeg: boolean;
  rating: number;
  prepTimeMinutes: number;
  proteinGrams: number;
  calories: number;
  price: number;
  description: string;
  imageUrl?: string;
  quantity?: number;
  onAdd?: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  onPress?: () => void;
}

const DEFAULT_FOOD_IMAGE =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80';

export const ProductCard: React.FC<ProductCardProps> = ({
  name,
  isVeg,
  rating,
  prepTimeMinutes,
  proteinGrams,
  calories,
  price,
  description,
  imageUrl = DEFAULT_FOOD_IMAGE,
  quantity = 0,
  onAdd,
  onIncrement,
  onDecrement,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={styles.card}
    >
      {/* Left Column (62%) */}
      <View style={styles.leftColumn}>
        {/* Top Badges Row: Veg/Non-Veg icon, Rating, Ready in 5 mins */}
        <View style={styles.badgesRow}>
          {/* FSSAI Veg / Non-Veg Indicator */}
          <View
            style={[
              styles.fssaiIconBox,
              isVeg ? styles.fssaiVegBox : styles.fssaiNonVegBox,
            ]}
          >
            {isVeg ? (
              <View style={styles.fssaiVegDot} />
            ) : (
              <Svg width={8} height={8} viewBox="0 0 10 10">
                <Polygon points="5,1 9,9 1,9" fill="#8B4513" />
              </Svg>
            )}
          </View>

          {/* Rating Badge */}
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>★ {rating.toFixed(1)}</Text>
          </View>

          {/* ⚡ Ready in X mins pill */}
          <View style={styles.prepTimePill}>
            <Text style={styles.prepTimeText}>
              ⚡ Ready in {prepTimeMinutes} mins
            </Text>
          </View>
        </View>

        {/* Bold Dish Title */}
        <Text style={styles.dishTitle} numberOfLines={2}>
          {name}
        </Text>

        {/* 1-Line Description */}
        <Text style={styles.description} numberOfLines={1} ellipsizeMode="tail">
          {description}
        </Text>

        {/* Macro Pills: Protein in soft green tint, Calories in soft amber tint */}
        <View style={styles.macroRow}>
          <View style={styles.proteinPill}>
            <Text style={styles.proteinText}>{proteinGrams}g Protein</Text>
          </View>
          <View style={styles.caloriePill}>
            <Text style={styles.calorieText}>{calories} kcal</Text>
          </View>
        </View>

        {/* Bold Price */}
        <View style={styles.priceRow}>
          <Text style={styles.priceText}>₹{price}</Text>
        </View>
      </View>

      {/* Right Column (38%) */}
      <View style={styles.rightColumn}>
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.foodPhoto}
            resizeMode="cover"
          />

          {/* Overlapping White ADD Button / Stepper straddling bottom edge */}
          <View style={styles.straddlingButtonContainer}>
            {quantity === 0 ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onAdd}
                style={styles.addButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.addButtonText}>ADD</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onDecrement}
                  style={styles.stepperActionBtn}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 4 }}
                >
                  <Text style={styles.stepperActionSymbol}>−</Text>
                </TouchableOpacity>

                <Text style={styles.stepperValueText}>{quantity}</Text>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onIncrement}
                  style={styles.stepperActionBtn}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
                >
                  <Text style={styles.stepperActionSymbol}>+</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBECE8',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  leftColumn: {
    width: '62%',
    paddingRight: 10,
    justifyContent: 'space-between',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  fssaiIconBox: {
    width: 15,
    height: 15,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fssaiVegBox: {
    borderColor: '#16A34A',
  },
  fssaiVegDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16A34A',
  },
  fssaiNonVegBox: {
    borderColor: '#8B4513',
  },
  ratingBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  prepTimePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  prepTimeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#374151',
  },
  dishTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 20,
    marginBottom: 3,
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  proteinPill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  proteinText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4D3E',
  },
  caloriePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  calorieText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  rightColumn: {
    width: '38%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
  },
  photoContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    alignItems: 'center',
  },
  foodPhoto: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  straddlingButtonContainer: {
    position: 'absolute',
    bottom: -11,
    alignSelf: 'center',
  },
  addButton: {
    width: 86,
    height: 33,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1D4D3E',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1D4D3E',
    letterSpacing: 0.5,
  },
  stepperContainer: {
    width: 86,
    height: 33,
    backgroundColor: '#1D4D3E',
    borderWidth: 1.5,
    borderColor: '#1D4D3E',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  stepperActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    height: '100%',
  },
  stepperActionSymbol: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  stepperValueText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
