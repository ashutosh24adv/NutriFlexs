import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { ProductCard } from '../../src/components/ProductCard';
import { QuickReorderStrip, QuickReorderItem } from '../../src/components/QuickReorderStrip';
import { FloatingCartBar } from '../../src/components/FloatingCartBar';
import { useCartStore } from '../../src/store/cartStore';

interface MenuItem {
  id: string;
  name: string;
  isVeg: boolean;
  rating: number;
  prepTimeMinutes: number;
  proteinGrams: number;
  calories: number;
  price: number;
  description: string;
  imageUrl: string;
  isColdPressed?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: '1',
    name: 'High Protein Peanut Butter Banana Shake',
    isVeg: true,
    rating: 4.8,
    prepTimeMinutes: 5,
    proteinGrams: 32,
    calories: 420,
    price: 199,
    description: 'Raw whey isolate, roasted peanut butter, banana, chia seeds.',
    imageUrl:
      'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '2',
    name: 'Low-Fat Paneer Quinoa Power Bowl',
    isVeg: true,
    rating: 4.9,
    prepTimeMinutes: 7,
    proteinGrams: 28,
    calories: 380,
    price: 249,
    description: 'Low-fat malai paneer, quinoa, broccoli, bell peppers, mint dip.',
    imageUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '3',
    name: 'Cold-Pressed Citrus Electrolyte Booster',
    isVeg: true,
    rating: 4.7,
    prepTimeMinutes: 3,
    proteinGrams: 4,
    calories: 120,
    price: 149,
    isColdPressed: true,
    description: 'Valencia orange, amla, pink salt, fresh tender coconut water.',
    imageUrl:
      'https://images.unsplash.com/photo-1622597467836-f3285f2131b7?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '4',
    name: 'Whey Isolate Berry Blast Recovery',
    isVeg: true,
    rating: 4.9,
    prepTimeMinutes: 5,
    proteinGrams: 36,
    calories: 280,
    price: 229,
    description: 'Hydrolyzed whey isolate, blueberries, strawberries, almond milk.',
    imageUrl:
      'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '5',
    name: 'Smoked Tofu Teriyaki Quinoa Bowl',
    isVeg: true,
    rating: 4.8,
    prepTimeMinutes: 5,
    proteinGrams: 31,
    calories: 350,
    price: 189,
    description: 'High-protein pressed tofu, edamame, tri-color quinoa, sesame glaze.',
    imageUrl:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '6',
    name: 'Herb Grilled Chicken & Avocado Salad',
    isVeg: false,
    rating: 4.9,
    prepTimeMinutes: 8,
    proteinGrams: 42,
    calories: 410,
    price: 299,
    description: 'Sous-vide chicken breast, Hass avocado, baby spinach, citrus mustard.',
    imageUrl:
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '7',
    name: 'Cold-Pressed Green Alkaline Cleanser',
    isVeg: true,
    rating: 4.8,
    prepTimeMinutes: 3,
    proteinGrams: 3,
    calories: 95,
    price: 159,
    isColdPressed: true,
    description: 'Celery, green apple, cucumber, moringa, lemon & ginger.',
    imageUrl:
      'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&q=80',
  },
];

const FILTER_CHIPS = [
  'All',
  '⚡ Under 5 Mins',
  'High Protein 30g+',
  'Under ₹199',
  'Cold-Pressed',
] as const;

type FilterChip = (typeof FILTER_CHIPS)[number];

export default function OrderHomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [pureVegOnly, setPureVegOnly] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterChip>('All');

  // Shared Cart Store
  const {
    items: cartItemsMap,
    totalCount,
    totalAmount,
    addItem,
    increment,
    decrement,
  } = useCartStore();

  const handleIncrement = (id: string) => {
    const item = MENU_ITEMS.find((m) => m.id === id);
    if (item) {
      addItem({
        id: item.id,
        name: item.name,
        price: item.price,
        proteinGrams: item.proteinGrams,
        calories: item.calories,
        prepTimeMinutes: item.prepTimeMinutes,
        isVeg: item.isVeg,
        imageUrl: item.imageUrl,
      });
    } else {
      increment(id);
    }
  };

  const handleDecrement = (id: string) => {
    decrement(id);
  };

  const handleQuickReorder = (item: QuickReorderItem) => {
    handleIncrement(item.id);
  };

  // Filter items based on Pure Veg toggle, active chip, and search query
  const filteredMenu = useMemo(() => {
    return MENU_ITEMS.filter((item) => {
      // Pure Veg toggle filter
      if (pureVegOnly && !item.isVeg) return false;

      // Filter Chips
      if (selectedFilter === '⚡ Under 5 Mins' && item.prepTimeMinutes > 5) {
        return false;
      }
      if (selectedFilter === 'High Protein 30g+' && item.proteinGrams < 30) {
        return false;
      }
      if (selectedFilter === 'Under ₹199' && item.price > 199) {
        return false;
      }
      if (
        selectedFilter === 'Cold-Pressed' &&
        !item.isColdPressed &&
        !item.name.toLowerCase().includes('cold-pressed')
      ) {
        return false;
      }

      // Search Query filter
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      return true;
    });
  }, [pureVegOnly, selectedFilter, searchQuery]);

  // Map quantities for quick lookup
  const cartQuantities = useMemo(() => {
    const res: Record<string, number> = {};
    for (const [id, item] of Object.entries(cartItemsMap)) {
      res[id] = item.quantity;
    }
    return res;
  }, [cartItemsMap]);

  return (
    <View style={styles.container}>
      {/* Sticky Header: Search Bar + Pure Veg Toggle + Filter Chips */}
      <View style={styles.stickyHeader}>
        {/* Search Bar Row with Pure Veg Toggle Switch on right */}
        <View style={styles.searchBarRow}>
          <View style={styles.searchInputWrapper}>
            <Search size={18} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search shakes, bowls, cold-pressed..."
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              clearButtonMode="while-editing"
            />
          </View>

          {/* Pure Veg Toggle Switch on right */}
          <View style={styles.pureVegContainer}>
            <View style={styles.fssaiDotWrapper}>
              <View style={styles.fssaiDot} />
            </View>
            <Text
              style={[
                styles.pureVegLabel,
                pureVegOnly && styles.pureVegLabelActive,
              ]}
            >
              VEG
            </Text>
            <Switch
              value={pureVegOnly}
              onValueChange={setPureVegOnly}
              trackColor={{ false: '#D1D5DB', true: '#1D4D3E' }}
              thumbColor={pureVegOnly ? '#FFFFFF' : '#F9FAFB'}
              ios_backgroundColor="#D1D5DB"
              style={styles.switchControl}
            />
          </View>
        </View>

        {/* Horizontal Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsScroll}
        >
          {FILTER_CHIPS.map((chip) => {
            const isSelected = selectedFilter === chip;
            return (
              <TouchableOpacity
                key={chip}
                activeOpacity={0.75}
                onPress={() => setSelectedFilter(chip)}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextActive,
                  ]}
                >
                  {chip}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Horizontal Quick Reorder Strip: 'Order Again in 1 Tap' */}
        <QuickReorderStrip
          onReorder={handleQuickReorder}
          cartQuantities={cartQuantities}
        />

        {/* Menu Section Header */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Fresh at Cult.fit HSR</Text>
            <Text style={styles.sectionSubtitle}>
              {filteredMenu.length}{' '}
              {filteredMenu.length === 1 ? 'item' : 'items'} available • Express Pickup
            </Text>
          </View>
        </View>

        {/* Full-Width Horizontal Dish Cards */}
        <View style={styles.menuList}>
          {filteredMenu.map((item) => (
            <ProductCard
              key={item.id}
              id={item.id}
              name={item.name}
              isVeg={item.isVeg}
              rating={item.rating}
              prepTimeMinutes={item.prepTimeMinutes}
              proteinGrams={item.proteinGrams}
              calories={item.calories}
              price={item.price}
              description={item.description}
              imageUrl={item.imageUrl}
              quantity={cartQuantities[item.id] || 0}
              onAdd={() => handleIncrement(item.id)}
              onIncrement={() => handleIncrement(item.id)}
              onDecrement={() => handleDecrement(item.id)}
            />
          ))}

          {filteredMenu.length === 0 && (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyTitle}>No matching fuel items</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search or filters to see more delicious options.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Pinned Floating Cart Bar: Tapping View Cart navigates to /cart */}
      <FloatingCartBar
        itemCount={totalCount}
        totalAmount={totalAmount}
        pickupSlot="⚡ Ready in 5m"
        onViewCart={() => router.push('/cart')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F6', // Off-white canvas
  },
  stickyHeader: {
    backgroundColor: '#F7F8F6',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE8DF',
    paddingTop: 10,
    paddingBottom: 8,
    zIndex: 10,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // Pure white
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 42,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
      default: {},
    }),
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#111827',
    paddingVertical: 0,
  },
  pureVegContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingLeft: 8,
    paddingRight: 4,
    height: 42,
    gap: 4,
  },
  fssaiDotWrapper: {
    width: 12,
    height: 12,
    borderWidth: 1.2,
    borderColor: '#16A34A',
    borderRadius: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fssaiDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16A34A',
  },
  pureVegLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#6B7280',
  },
  pureVegLabelActive: {
    color: '#16A34A',
  },
  switchControl: {
    transform: Platform.select({
      ios: [{ scaleX: 0.75 }, { scaleY: 0.75 }],
      default: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
    }),
  },
  filterChipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#1D4D3E', // Deep Forest Green
    borderColor: '#1D4D3E',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 110, // Generous padding so floating cart bar never covers cards
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  menuList: {
    paddingHorizontal: 16,
  },
  emptyStateContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#EBECE8',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});
