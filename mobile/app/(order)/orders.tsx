import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Clock,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';
import { useCartStore } from '../../src/store/cartStore';

interface PastOrder {
  id: string;
  orderNumber: string;
  date: string;
  kiosk: string;
  itemsText: string;
  itemIds: string[];
  totalPrice: number;
  proteinGrams: number;
  calories: number;
}

const PAST_ORDERS: PastOrder[] = [
  {
    id: 'past-1',
    orderNumber: 'NF-382',
    date: 'Yesterday, 7:15 PM',
    kiosk: 'Cult.fit HSR Layout',
    itemsText: '1x Whey Isolate Berry Blast, 1x Citrus Electrolyte Booster',
    itemIds: ['4', '3'],
    totalPrice: 378,
    proteinGrams: 40,
    calories: 400,
  },
  {
    id: 'past-2',
    orderNumber: 'NF-310',
    date: '3 days ago, 8:00 AM',
    kiosk: 'Cult.fit HSR Layout',
    itemsText: '1x High Protein Peanut Butter Banana Shake',
    itemIds: ['1'],
    totalPrice: 199,
    proteinGrams: 32,
    calories: 420,
  },
  {
    id: 'past-3',
    orderNumber: 'NF-284',
    date: '5 days ago, 6:30 PM',
    kiosk: 'Cult.fit HSR Layout',
    itemsText: '1x Smoked Tofu Teriyaki Quinoa Bowl',
    itemIds: ['5'],
    totalPrice: 189,
    proteinGrams: 31,
    calories: 350,
  },
];

export default function OrdersScreen() {
  const router = useRouter();
  const { addItem, activeOrderId } = useCartStore();

  const handleReorder = (order: PastOrder) => {
    // Add first item from past order to cart
    if (order.id === 'past-1') {
      addItem({
        id: '4',
        name: 'Whey Isolate Berry Blast Recovery',
        price: 229,
        proteinGrams: 36,
        calories: 280,
        prepTimeMinutes: 5,
        isVeg: true,
        imageUrl:
          'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=400&q=80',
      });
    } else if (order.id === 'past-2') {
      addItem({
        id: '1',
        name: 'High Protein Peanut Butter Banana Shake',
        price: 199,
        proteinGrams: 32,
        calories: 420,
        prepTimeMinutes: 5,
        isVeg: true,
        imageUrl:
          'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=400&q=80',
      });
    } else {
      addItem({
        id: '5',
        name: 'Smoked Tofu Teriyaki Quinoa Bowl',
        price: 189,
        proteinGrams: 31,
        calories: 350,
        prepTimeMinutes: 5,
        isVeg: true,
        imageUrl:
          'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80',
      });
    }
    router.push('/cart');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Screen Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Fuel Orders</Text>
          <Text style={styles.subtitle}>
            Live express pickup tracker & one-tap gym reorders
          </Text>
        </View>

        {/* Active Live Order Card */}
        {activeOrderId && (
          <View style={styles.activeSection}>
            <Text style={styles.sectionHeading}>ACTIVE ORDER</Text>
            <View style={styles.activeCard}>
              <View style={styles.activeBadgeRow}>
                <View style={styles.preparingBadge}>
                  <Text style={styles.preparingBadgeText}>● PREPARING</Text>
                </View>
                <Text style={styles.activePin}>PIN #{activeOrderId}</Text>
              </View>

              <Text style={styles.activeItemsTitle}>
                1x Low-Fat Paneer Quinoa Bowl + 1x Peanut Butter Shake
              </Text>

              <View style={styles.etaRow}>
                <Clock size={14} color="#1D4D3E" />
                <Text style={styles.etaText}>
                  Ready in ~4 mins at Cult.fit HSR Express Counter
                </Text>
              </View>

              <View style={styles.activeMacroRow}>
                <Sparkles size={14} color="#1D4D3E" />
                <Text style={styles.activeMacroText}>
                  60g Protein • 800 kcal • Confirmed Auto-Logged
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => router.push(`/orders/${activeOrderId}`)}
                style={styles.trackButton}
              >
                <Text style={styles.trackButtonText}>Track Live Order</Text>
                <ChevronRight size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Past Orders Section */}
        <View style={styles.pastSection}>
          <Text style={styles.sectionHeading}>PAST ORDERS</Text>

          {PAST_ORDERS.map((order) => (
            <View key={order.id} style={styles.pastCard}>
              <View style={styles.pastCardHeader}>
                <View>
                  <Text style={styles.orderNumberText}>#{order.orderNumber}</Text>
                  <Text style={styles.orderDateText}>{order.date}</Text>
                </View>
                <View style={styles.completedBadge}>
                  <CheckCircle2 size={12} color="#059669" />
                  <Text style={styles.completedBadgeText}>PICKED UP</Text>
                </View>
              </View>

              <Text style={styles.pastItemsText} numberOfLines={2}>
                {order.itemsText}
              </Text>

              <View style={styles.pastMetaRow}>
                <Text style={styles.pastPriceText}>₹{order.totalPrice}</Text>
                <Text style={styles.pastMacroText}>
                  {order.proteinGrams}g Protein • {order.calories} kcal
                </Text>
              </View>

              <View style={styles.pastCardFooter}>
                <Text style={styles.pastKioskText}>{order.kiosk}</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleReorder(order)}
                  style={styles.reorderBtn}
                >
                  <RotateCcw size={13} color="#FFFFFF" />
                  <Text style={styles.reorderBtnText}>1-Tap Reorder</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F6', // Off-white canvas
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  activeSection: {
    marginBottom: 20,
  },
  activeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#1D4D3E',
    ...Platform.select({
      ios: {
        shadowColor: '#1D4D3E',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  activeBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  preparingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  preparingBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#B45309',
  },
  activePin: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1D4D3E',
  },
  activeItemsTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  etaText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  activeMacroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F1ED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  activeMacroText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1D4D3E',
  },
  trackButton: {
    backgroundColor: '#1D4D3E',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  pastSection: {},
  pastCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EBECE8',
    marginBottom: 12,
  },
  pastCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderNumberText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#111827',
  },
  orderDateText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  pastItemsText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 6,
  },
  pastMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pastPriceText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#111827',
  },
  pastMacroText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4D3E',
  },
  pastCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  pastKioskText: {
    fontSize: 11,
    color: '#6B7280',
  },
  reorderBtn: {
    backgroundColor: '#1D4D3E',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  reorderBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
});
