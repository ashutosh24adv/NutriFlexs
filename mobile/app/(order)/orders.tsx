import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
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
import { useAuthStore } from '../../src/store/authStore';

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

    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`;
  } catch {
    return 'Recently';
  }
}

export default function OrdersScreen() {
  const router = useRouter();
  const { addItem } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();

  const [orders, setOrders] = useState<RawOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!isAuthenticated || !user) {
        setOrders([]);
        return;
      }

      let token: string | null = null;
      try {
        const SecureStore = typeof require !== 'undefined' ? require('expo-secure-store') : null;
        if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
          for (const key of ['token', 'jwt_token', 'auth_token']) {
            const val = await SecureStore.getItemAsync(key);
            if (val) {
              token = val.trim();
              break;
            }
          }
        }
      } catch {}

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const bases = [
        process.env.EXPO_PUBLIC_API_URL || 'https://nutri-flexs.vercel.app',
        'http://localhost:3000',
        'http://10.91.111.142:3000',
      ];
      let fetched: RawOrder[] = [];
      let success = false;

      // 1. Primary endpoint: GET /api/mobile/orders
      for (const base of bases) {
        try {
          const cleanBase = base.replace(/\/$/, '');
          const url = `${cleanBase}/api/mobile/orders?userId=${encodeURIComponent(
            user.id || ''
          )}&email=${encodeURIComponent(user.email || '')}`;
          const res = await fetch(url, {
            method: 'GET',
            headers,
          });
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
            const res = await fetch(`${cleanBase}/api/orders`, {
              method: 'GET',
              headers,
            });
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
      console.error('[OrdersScreen] Error fetching orders:', err);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleReorder = (items: ParsedItem[]) => {
    if (!items || items.length === 0) return;
    for (const item of items) {
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
    }
    router.push('/cart');
  };

  const isActiveStatus = (status: string) => {
    const s = (status || '').toUpperCase();
    return (
      s === 'ORDER_PLACED' ||
      s === 'PREPARING' ||
      s === 'READY_FOR_PICKUP' ||
      s === 'PENDING'
    );
  };

  const activeOrders = orders.filter((o) => isActiveStatus(o.status));
  const pastOrders = orders.filter((o) => !isActiveStatus(o.status));

  const hasZeroOrders = !isAuthenticated || !user || orders.length === 0;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Screen Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Your Fuel Orders</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={fetchOrders}
              style={styles.refreshButton}
            >
              <RotateCcw size={14} color="#1D4D3E" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            Live express pickup tracker & one-tap gym reorders
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#1D4D3E" />
            <Text style={styles.loadingText}>Fetching your orders...</Text>
          </View>
        ) : orders.length === 0 ? (
          /* Clean Empty State */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <RotateCcw size={32} color="#1D4D3E" />
            </View>
            <Text style={styles.emptyText}>
              No orders yet — grab a post-workout meal in 5 mins
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
          <>
            {/* Active Live Orders */}
            {activeOrders.length > 0 && (
              <View style={styles.activeSection}>
                <Text style={styles.sectionHeading}>ACTIVE ORDER</Text>
                {activeOrders.map((order) => {
                  const items = parseOrderItems(order.items);
                  const itemsSummary =
                    items.length > 0
                      ? items.map((i) => `${i.quantity}x ${i.name}`).join(' + ')
                      : 'NutriFlexs Fuel Meal';
                  const kioskName =
                    order.outlet?.name ||
                    order.outlet?.gym?.name ||
                    'Cult.fit HSR Express Counter';
                  const statusUpper = (order.status || '').toUpperCase();
                  const statusLabel =
                    statusUpper === 'READY_FOR_PICKUP'
                      ? '● READY FOR PICKUP'
                      : statusUpper === 'ORDER_PLACED'
                      ? '● ORDER PLACED'
                      : '● PREPARING';

                  const protein =
                    order.totalProtein ||
                    items.reduce((s, i) => s + i.proteinGrams * i.quantity, 0);
                  const calories =
                    order.totalCalories ||
                    items.reduce((s, i) => s + i.calories * i.quantity, 0);

                  return (
                    <View key={order.id} style={styles.activeCard}>
                      <View style={styles.activeBadgeRow}>
                        <View
                          style={[
                            styles.preparingBadge,
                            statusUpper === 'READY_FOR_PICKUP' &&
                              styles.readyBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.preparingBadgeText,
                              statusUpper === 'READY_FOR_PICKUP' &&
                                styles.readyBadgeText,
                            ]}
                          >
                            {statusLabel}
                          </Text>
                        </View>
                        <Text style={styles.activePin}>
                          PIN #{order.orderNumber}
                        </Text>
                      </View>

                      <Text style={styles.activeItemsTitle} numberOfLines={2}>
                        {itemsSummary}
                      </Text>

                      <View style={styles.etaRow}>
                        <Clock size={14} color="#1D4D3E" />
                        <Text style={styles.etaText}>
                          Ready in ~{order.estimatedPrepMinutes || 4} mins at{' '}
                          {kioskName}
                        </Text>
                      </View>

                      <View style={styles.activeMacroRow}>
                        <Sparkles size={14} color="#1D4D3E" />
                        <Text style={styles.activeMacroText}>
                          {protein}g Protein • {calories} kcal • Confirmed
                          Auto-Logged
                        </Text>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.88}
                        onPress={() =>
                          router.push(
                            `/orders/${order.orderNumber || order.id}`
                          )
                        }
                        style={styles.trackButton}
                      >
                        <Text style={styles.trackButtonText}>
                          Track Live Order
                        </Text>
                        <ChevronRight size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Past Orders Section */}
            {pastOrders.length > 0 && (
              <View style={styles.pastSection}>
                <Text style={styles.sectionHeading}>PAST ORDERS</Text>
                {pastOrders.map((order) => {
                  const items = parseOrderItems(order.items);
                  const itemsSummary =
                    items.length > 0
                      ? items.map((i) => `${i.quantity}x ${i.name}`).join(', ')
                      : 'NutriFlexs Fuel Meal';
                  const kioskName =
                    order.outlet?.name ||
                    order.outlet?.gym?.name ||
                    'Cult.fit HSR Express Counter';
                  const dateStr = formatOrderDate(order.createdAt);
                  const protein =
                    order.totalProtein ||
                    items.reduce((s, i) => s + i.proteinGrams * i.quantity, 0);
                  const calories =
                    order.totalCalories ||
                    items.reduce((s, i) => s + i.calories * i.quantity, 0);

                  return (
                    <View key={order.id} style={styles.pastCard}>
                      <View style={styles.pastCardHeader}>
                        <View>
                          <Text style={styles.orderNumberText}>
                            #{order.orderNumber}
                          </Text>
                          <Text style={styles.orderDateText}>{dateStr}</Text>
                        </View>
                        <View style={styles.completedBadge}>
                          <CheckCircle2 size={12} color="#059669" />
                          <Text style={styles.completedBadgeText}>
                            PICKED UP
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.pastItemsText} numberOfLines={2}>
                        {itemsSummary}
                      </Text>

                      <View style={styles.pastMetaRow}>
                        <Text style={styles.pastPriceText}>
                          ₹{order.totalAmount}
                        </Text>
                        <Text style={styles.pastMacroText}>
                          {protein}g Protein • {calories} kcal
                        </Text>
                      </View>

                      <View style={styles.pastCardFooter}>
                        <Text style={styles.pastKioskText}>{kioskName}</Text>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => handleReorder(items)}
                          style={styles.reorderBtn}
                        >
                          <RotateCcw size={13} color="#FFFFFF" />
                          <Text style={styles.reorderBtnText}>
                            1-Tap Reorder
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  refreshButton: {
    padding: 6,
    backgroundColor: '#E8F1ED',
    borderRadius: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
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
    marginBottom: 12,
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
  readyBadge: {
    backgroundColor: '#ECFDF5',
  },
  readyBadgeText: {
    color: '#065F46',
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
