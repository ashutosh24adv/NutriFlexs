import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { RotateCcw, UtensilsCrossed } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { radii } from '../../src/theme/radii';
import { useCartStore } from '../../src/store/cartStore';
import { useAuthStore } from '../../src/store/authStore';
import { getAuthToken } from '../../src/services/apiClient';
import { API_BASE_URL } from '../../src/config/api';

declare const __DEV__: boolean;
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

interface ParsedItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  proteinGrams: number;
  calories: number;
  prepTimeMinutes: number;
  isVeg: boolean;
  imageUrl: string;
}

interface RawOrder {
  id: string;
  orderNumber: string;
  status: string;
  subtotal?: number;
  discount?: number;
  totalAmount: number;
  totalProtein?: number;
  totalCalories?: number;
  paymentStatus?: string;
  estimatedPrepMinutes?: number;
  createdAt: string;
  outlet?: {
    id?: string;
    name?: string;
    gym?: {
      name?: string;
    };
  };
  items?: any[];
}

interface ReorderFavoriteItem {
  id: string;
  name: string;
  price: number;
  proteinGrams: number;
  calories: number;
  prepTimeMinutes: number;
  isVeg: boolean;
  imageUrl: string;
  lastOrderedDate: string;
  lastOrderedKiosk: string;
}

function parseOrderItems(items: any[] = []): ParsedItem[] {
  return items.map((item, idx) => {
    let meta: any = null;
    if (typeof item.productJson === 'string') {
      try {
        meta = JSON.parse(item.productJson);
      } catch {
        meta = null;
      }
    }

    const name = item.product?.name || meta?.name || item.name || 'Fuel Item';
    const price =
      item.priceAtPurchase ?? item.product?.price ?? meta?.price ?? item.price ?? 199;
    const quantity = item.quantity || 1;
    const proteinGrams =
      item.product?.protein ?? meta?.protein ?? item.proteinGrams ?? 0;
    const calories =
      item.product?.calories ?? meta?.calories ?? item.calories ?? 0;
    const prepTimeMinutes = item.product?.preparationTimeMinutes ?? 5;
    const isVeg = item.product?.isVeg ?? (meta?.isVeg ?? true);
    const imageUrl =
      item.product?.imageUrl ||
      meta?.imageUrl ||
      item.imageUrl ||
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';

    return {
      id: item.productId || item.product?.id || `item-${idx}`,
      name,
      quantity,
      price,
      proteinGrams,
      calories,
      prepTimeMinutes,
      isVeg,
      imageUrl,
    };
  });
}

function formatOrderDate(dateInput?: string | Date): string {
  if (!dateInput) return 'Recently';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    const timeStr = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;

    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  } catch {
    return 'Recently';
  }
}

export default function ReorderScreen() {
  const router = useRouter();
  const { addItem } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();

  const [orders, setOrders] = useState<RawOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!isAuthenticated || !user) {
        setOrders([]);
        return;
      }

      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      if (token) {
        const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
        headers['Authorization'] = `Bearer ${cleanToken}`;
      }

      const bases = Array.from(
        new Set(
          [
            API_BASE_URL,
            process.env.EXPO_PUBLIC_API_URL,
            'https://nutri-flexs.vercel.app',
            isDev ? 'http://localhost:3000' : undefined,
          ].filter((b): b is string => Boolean(b && typeof b === 'string'))
        )
      );

      let fetched: RawOrder[] = [];
      let success = false;

      // 1. Primary endpoint: GET /api/mobile/orders
      for (const base of bases) {
        try {
          const cleanBase = base.replace(/\/$/, '');
          const url = `${cleanBase}/api/mobile/orders?userId=${encodeURIComponent(
            user.id || ''
          )}&email=${encodeURIComponent(user.email || '')}`;
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 6000);
          const res = await fetch(url, {
            method: 'GET',
            headers,
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data?.orders)
              ? data.orders
              : Array.isArray(data)
              ? data
              : [];
            fetched = list;
            success = true;
            break;
          }
        } catch {
          // try next base
        }
      }

      // 2. Fallback: GET /api/orders
      if (!success) {
        for (const base of bases) {
          try {
            const cleanBase = base.replace(/\/$/, '');
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(`${cleanBase}/api/orders`, {
              method: 'GET',
              headers,
              signal: controller.signal,
            });
            clearTimeout(timer);
            if (res.ok) {
              const data = await res.json();
              const list = Array.isArray(data?.orders)
                ? data.orders
                : Array.isArray(data)
                ? data
                : [];
              fetched = list;
              success = true;
              break;
            }
          } catch {
            // ignore
          }
        }
      }

      setOrders(fetched);
    } catch (err) {
      console.error('[ReorderScreen] Error fetching orders:', err);
      setOrders([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleReorderItem = (item: ReorderFavoriteItem) => {
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
    router.push('/cart');
  };

  // Derive unique past ordered items for quick 1-tap reordering
  const itemMap = new Map<string, ReorderFavoriteItem>();
  for (const order of orders) {
    const kiosk =
      order.outlet?.name ||
      order.outlet?.gym?.name ||
      'Cult.fit HSR Express Counter';
    const dateFormatted = formatOrderDate(order.createdAt);
    const parsedItems = parseOrderItems(order.items);

    for (const item of parsedItems) {
      const key = item.id || item.name;
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          id: item.id,
          name: item.name,
          price: item.price,
          proteinGrams: item.proteinGrams,
          calories: item.calories,
          prepTimeMinutes: item.prepTimeMinutes,
          isVeg: item.isVeg,
          imageUrl: item.imageUrl,
          lastOrderedDate: dateFormatted,
          lastOrderedKiosk: kiosk,
        });
      }
    }
  }

  const favoriteItems = Array.from(itemMap.values());
  const hasZeroOrders = !isAuthenticated || !user || orders.length === 0;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1D4D3E"
            colors={['#1D4D3E']}
          />
        }
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>Past Favorites & Quick Reorder</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={fetchOrders}
            style={styles.refreshButton}
          >
            <RotateCcw size={14} color="#1D4D3E" />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          One-tap reorder your gym recovery fuel
        </Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#1D4D3E" />
            <Text style={styles.loadingText}>Fetching your past favorites...</Text>
          </View>
        ) : orders.length === 0 || favoriteItems.length === 0 ? (
          /* Clean Empty State */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <UtensilsCrossed size={32} color="#1D4D3E" />
            </View>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>
              Grab a fresh high-protein meal ready in 5 mins.
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(order)')}
              style={styles.browseMenuButton}
            >
              <Text style={styles.browseMenuButtonText}>Browse Menu</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsList}>
            {favoriteItems.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.orderInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.kioskText}>
                    Ordered {item.lastOrderedDate} at {item.lastOrderedKiosk}
                  </Text>
                  <Text style={styles.macroText}>
                    {item.proteinGrams}g protein • {item.calories} kcal
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleReorderItem(item)}
                  style={styles.reorderButton}
                >
                  <Text style={styles.reorderButtonText}>
                    Reorder ₹{item.price}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
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
    padding: spacing.lg,
    paddingBottom: 40,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  refreshButton: {
    padding: 6,
    backgroundColor: '#E8F1ED',
    borderRadius: 8,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#EBECE8',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F1ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 280,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    maxWidth: 280,
  },
  browseMenuButton: {
    backgroundColor: '#1D4D3E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseMenuButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  cardsList: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderInfo: {
    marginBottom: spacing.md,
  },
  itemName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  kioskText: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  macroText: {
    fontSize: typography.sizes.xs,
    color: colors.macros.protein,
    fontWeight: typography.weights.semiBold,
    marginTop: 4,
  },
  reorderButton: {
    backgroundColor: colors.brandGreen,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: spacing.touchTargetMin,
  },
  reorderButtonText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});
