import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

export interface QuickReorderItem {
  id: string;
  name: string;
  isVeg: boolean;
  price: number;
  prepTimeMinutes: number;
  proteinGrams: number;
  calories: number;
  imageUrl?: string;
  lastOrderedText?: string;
}

export interface QuickReorderStripProps {
  items?: QuickReorderItem[];
  onReorder: (item: QuickReorderItem) => void;
  cartQuantities?: Record<string, number>;
}

const DEFAULT_REORDER_ITEMS: QuickReorderItem[] = [
  {
    id: '1',
    name: 'Peanut Butter Shake',
    isVeg: true,
    price: 199,
    prepTimeMinutes: 5,
    proteinGrams: 32,
    calories: 420,
    imageUrl:
      'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=260&q=80',
    lastOrderedText: 'Yesterday, 6:45 PM',
  },
  {
    id: '2',
    name: 'Herb Paneer Bowl',
    isVeg: true,
    price: 249,
    prepTimeMinutes: 7,
    proteinGrams: 28,
    calories: 380,
    imageUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=260&q=80',
    lastOrderedText: '2 days ago',
  },
  {
    id: '4',
    name: 'Berry Blast Recovery',
    isVeg: true,
    price: 229,
    prepTimeMinutes: 5,
    proteinGrams: 36,
    calories: 280,
    imageUrl:
      'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=260&q=80',
    lastOrderedText: 'Monday, 7:15 PM',
  },
  {
    id: '3',
    name: 'Citrus Booster',
    isVeg: true,
    price: 149,
    prepTimeMinutes: 3,
    proteinGrams: 4,
    calories: 120,
    imageUrl:
      'https://images.unsplash.com/photo-1622597467836-f3285f2131b7?auto=format&fit=crop&w=260&q=80',
    lastOrderedText: 'Last Sunday',
  },
];

export const QuickReorderStrip: React.FC<QuickReorderStripProps> = ({
  items = DEFAULT_REORDER_ITEMS,
  onReorder,
  cartQuantities = {},
}) => {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <Text style={styles.headerIcon}>⚡</Text>
          <Text style={styles.headerTitle}>Order Again in 1 Tap</Text>
        </View>
        <Text style={styles.headerSubtitle}>Cult.fit HSR Express</Text>
      </View>

      {/* Horizontal Mini-Card Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {items.map((item) => {
          const inCart = (cartQuantities[item.id] || 0) > 0;
          return (
            <View key={item.id} style={styles.miniCard}>
              {/* Thumbnail Image */}
              <View style={styles.imageWrapper}>
                <Image
                  source={{
                    uri:
                      item.imageUrl ||
                      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=260&q=80',
                  }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
                <View style={styles.prepTimeBadge}>
                  <Text style={styles.prepTimeBadgeText}>⚡ {item.prepTimeMinutes}m</Text>
                </View>
              </View>

              {/* Card Body */}
              <View style={styles.cardBody}>
                {/* Veg / Non-Veg + Title */}
                <View style={styles.titleRow}>
                  <View
                    style={[
                      styles.fssaiIconBox,
                      item.isVeg ? styles.fssaiVegBox : styles.fssaiNonVegBox,
                    ]}
                  >
                    {item.isVeg ? (
                      <View style={styles.fssaiVegDot} />
                    ) : (
                      <Svg width={6} height={6} viewBox="0 0 10 10">
                        <Polygon points="5,1 9,9 1,9" fill="#8B4513" />
                      </Svg>
                    )}
                  </View>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>

                {/* Macro & Price Row */}
                <View style={styles.metaRow}>
                  <Text style={styles.priceText}>₹{item.price}</Text>
                  <Text style={styles.macroText}>{item.proteinGrams}g pro</Text>
                </View>

                {/* 1-Tap Reorder Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onReorder(item)}
                  style={[
                    styles.reorderButton,
                    inCart && styles.reorderButtonAdded,
                  ]}
                >
                  <Text
                    style={[
                      styles.reorderButtonText,
                      inCart && styles.reorderButtonTextAdded,
                    ]}
                  >
                    {inCart ? `Added (${cartQuantities[item.id]})` : '+ Reorder'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerIcon: {
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  scrollList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  miniCard: {
    width: 148,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EBECE8',
    overflow: 'hidden',
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
  imageWrapper: {
    width: '100%',
    height: 84,
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  prepTimeBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(29, 77, 62, 0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  prepTimeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cardBody: {
    padding: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  fssaiIconBox: {
    width: 12,
    height: 12,
    borderWidth: 1.2,
    borderRadius: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fssaiVegBox: {
    borderColor: '#16A34A',
  },
  fssaiVegDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16A34A',
  },
  fssaiNonVegBox: {
    borderColor: '#8B4513',
  },
  itemTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  priceText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#111827',
  },
  macroText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#1D4D3E',
  },
  reorderButton: {
    backgroundColor: '#1D4D3E',
    paddingVertical: 5.5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderButtonAdded: {
    backgroundColor: '#EAF4E3',
    borderWidth: 1,
    borderColor: '#1D4D3E',
  },
  reorderButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  reorderButtonTextAdded: {
    color: '#1D4D3E',
  },
});
