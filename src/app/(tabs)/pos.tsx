/**
 * (tabs)/pos.tsx — Point of Sale Screen
 *
 * Mobile port of POSPage.jsx.
 * Key changes from web:
 *   - HTML div/button → React Native View/TouchableOpacity
 *   - router-dom Link → expo-router
 *   - window.addEventListener keyboard → removed (no HID scanner on mobile;
 *     barcode scanning via expo-camera instead)
 *   - localStorage → AsyncStorage (via storage adapter)
 *   - CSS classes → StyleSheet
 */

import { Colors } from '@/constants/theme';
import { useTier } from '@/hooks/useTier';
import { getBusinessType } from '@/lib/constants';
import {
    addToSyncQueue, getAllProducts, getProfile,
    saveProduct, saveTransaction,
} from '@/lib/db';
import { createId } from '@/lib/id';
import { storage } from '@/lib/storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export default function POSScreen() {
  const { tier } = useTier();
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  const [products, setProducts] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [taxRate] = useState(0);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'gcash' | 'credit'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  const canSync = tier !== 'libre';

  useEffect(() => {
    (async () => {
      const [prods, prof] = await Promise.all([getAllProducts(), getProfile()]);
      setProducts(prods);
      setProfile(prof);
    })();
  }, []);

  const categories = useMemo(() => {
    const type = getBusinessType(profile?.business_type);
    return ['All', ...(type?.categories || ['Others'])];
  }, [profile]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter(p => {
      const matchSearch = !term || p.name.toLowerCase().includes(term);
      const matchCat = activeCategory === 'All' || p.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, activeCategory]);

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax = subtotal * (Number(taxRate) / 100);
  const total = subtotal + tax;

  const addToCart = useCallback((product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: product.id, name: product.name, price: Number(product.price ?? 0), qty: 1 }];
    });
  }, []);

  function changeQty(productId: string, delta: number) {
    setCart(prev =>
      prev.map(i => i.id === productId ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
          .filter(i => i.qty > 0)
    );
  }

  async function completeSale() {
    if (!cart.length) return;

    const resolvedCustomer = paymentMode === 'credit' ? customerName.trim() : '';
    const tx = {
      id: createId(),
      type: 'sale',
      date: new Date().toISOString().split('T')[0],
      description: paymentMode === 'credit'
        ? `Utang - ${resolvedCustomer || 'Walk-in'}`
        : `POS sale (${paymentMode})`,
      items: cart,
      amount: Number(total.toFixed(2)),
      category: 'POS',
      payment_mode: paymentMode,
      customer_name: resolvedCustomer || null,
      balance_due: paymentMode === 'credit' ? Number(total.toFixed(2)) : 0,
      created_at: new Date().toISOString(),
    };

    await saveTransaction(tx);
    if (canSync) await addToSyncQueue({ table_name: 'transactions', record_id: tx.id, operation: 'upsert', payload: tx });

    for (const item of cart) {
      const product = products.find(p => p.id === item.id);
      if (!product?.track_stock) continue;
      const updated = { ...product, stock: Math.max(0, Number(product.stock ?? 0) - item.qty) };
      await saveProduct(updated);
      if (canSync) await addToSyncQueue({ table_name: 'products', record_id: updated.id, operation: 'upsert', payload: updated });
    }

    await storage.setItem('agora:lastSaleDraft', JSON.stringify({ items: cart, paymentMode }));
    setLastReceipt({ tx, items: cart, subtotal, tax, total });
    setReceiptVisible(true);
    setCart([]);
    setSearch('');
    setCustomerName('');
    setPaymentMode('cash');

    // Reload products for updated stock counts
    setProducts(await getAllProducts());
  }

  // ── Receipt Modal ────────────────────────────────────────────────────────────
  const ReceiptModal = () => (
    <Modal visible={receiptVisible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.receiptRoot, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={{ padding: 24 }}>
          <Text style={[styles.receiptTitle, { color: colors.text }]}>Sale Complete</Text>
          {lastReceipt?.items.map((item: CartItem) => (
            <View key={item.id} style={styles.receiptRow}>
              <Text style={[styles.receiptItem, { color: colors.text }]}>
                {item.name} × {item.qty}
              </Text>
              <Text style={[styles.receiptAmount, { color: colors.text }]}>
                {formatCurrency(item.price * item.qty)}
              </Text>
            </View>
          ))}
          <View style={[styles.receiptDivider, { borderColor: colors.backgroundElement }]} />
          <View style={styles.receiptRow}>
            <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>Subtotal</Text>
            <Text style={[styles.receiptValue, { color: colors.text }]}>{formatCurrency(lastReceipt?.subtotal ?? 0)}</Text>
          </View>
          {lastReceipt?.tax > 0 && (
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>Tax</Text>
              <Text style={[styles.receiptValue, { color: colors.text }]}>{formatCurrency(lastReceipt?.tax ?? 0)}</Text>
            </View>
          )}
          <View style={styles.receiptRow}>
            <Text style={[styles.receiptTotalLabel, { color: colors.text }]}>TOTAL</Text>
            <Text style={[styles.receiptTotalValue, { color: '#1A56A0' }]}>{formatCurrency(lastReceipt?.total ?? 0)}</Text>
          </View>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => setReceiptVisible(false)}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ── Main UI ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ReceiptModal />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Point of Sale</Text>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.backgroundElement }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search products…"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* Category pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.catPill, activeCategory === cat && styles.catPillActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.catPillText, activeCategory === cat && styles.catPillTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Product grid */}
      <FlatList
        data={filteredProducts.slice(0, 40)}
        keyExtractor={p => p.id}
        numColumns={2}
        style={styles.productList}
        contentContainerStyle={{ padding: 8, gap: 8 }}
        columnWrapperStyle={{ gap: 8 }}
        ListEmptyComponent={
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary }}>
              {search || activeCategory !== 'All' ? 'No products match.' : 'Search or tap a category.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.productCard, { backgroundColor: colors.backgroundElement }]}
            onPress={() => addToCart(item)}
          >
            <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
            <Text style={[styles.productPrice, { color: '#1A56A0' }]}>{formatCurrency(item.price ?? 0)}</Text>
            {item.track_stock && (
              <Text style={[styles.productStock, { color: Number(item.stock ?? 0) <= 5 ? '#EF4444' : colors.textSecondary }]}>
                {item.stock ?? 0} in stock
              </Text>
            )}
          </TouchableOpacity>
        )}
      />

      {/* Cart summary */}
      {cart.length > 0 && (
        <View style={[styles.cartBar, { backgroundColor: colors.backgroundElement }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cartItems}>
            {cart.map(item => (
              <View key={item.id} style={styles.cartItem}>
                <Text style={[styles.cartItemName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                <View style={styles.cartQtyRow}>
                  <TouchableOpacity onPress={() => changeQty(item.id, -1)} style={styles.qtyBtn}>
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={[styles.cartQty, { color: colors.text }]}>{item.qty}</Text>
                  <TouchableOpacity onPress={() => changeQty(item.id, 1)} style={styles.qtyBtn}>
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Payment mode */}
          <View style={styles.payRow}>
            {(['cash', 'gcash', 'credit'] as const).map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.payBtn, paymentMode === m && styles.payBtnActive]}
                onPress={() => setPaymentMode(m)}
              >
                <Text style={[styles.payBtnText, paymentMode === m && styles.payBtnTextActive]}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {paymentMode === 'credit' && (
            <TextInput
              style={[styles.customerInput, { color: colors.text, borderColor: colors.backgroundSelected }]}
              placeholder="Customer name (utang)"
              placeholderTextColor={colors.textSecondary}
              value={customerName}
              onChangeText={setCustomerName}
            />
          )}

          <TouchableOpacity style={styles.checkoutBtn} onPress={completeSale}>
            <Text style={styles.checkoutBtnText}>
              Charge {formatCurrency(total)}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  searchBar: { marginHorizontal: 16, borderRadius: 10, marginBottom: 8 },
  searchInput: { paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  catRow: { maxHeight: 44, marginBottom: 8 },
  catPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'transparent', borderWidth: 1, borderColor: '#334155',
  },
  catPillActive: { backgroundColor: '#1A56A0', borderColor: '#1A56A0' },
  catPillText: { color: '#9CA3AF', fontSize: 13 },
  catPillTextActive: { color: '#fff' },
  productList: { flex: 1 },
  productCard: { flex: 1, borderRadius: 12, padding: 14 },
  productName: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  productPrice: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  productStock: { fontSize: 11 },
  cartBar: { borderTopWidth: 1, borderTopColor: '#1E293B', padding: 12 },
  cartItems: { maxHeight: 80, marginBottom: 8 },
  cartItem: { marginRight: 12, minWidth: 80 },
  cartItemName: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  cartQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cartQty: { fontSize: 14, fontWeight: '600', minWidth: 20, textAlign: 'center' },
  payRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  payBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  payBtnActive: { backgroundColor: '#1A56A0', borderColor: '#1A56A0' },
  payBtnText: { color: '#9CA3AF', fontSize: 13 },
  payBtnTextActive: { color: '#fff', fontWeight: '600' },
  customerInput: {
    borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 8,
  },
  checkoutBtn: { backgroundColor: '#1A56A0', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  checkoutBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  receiptRoot: { flex: 1 },
  receiptTitle: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  receiptItem: { fontSize: 14, flex: 1 },
  receiptAmount: { fontSize: 14, fontWeight: '500' },
  receiptDivider: { borderTopWidth: 1, marginVertical: 12 },
  receiptLabel: { fontSize: 14 },
  receiptValue: { fontSize: 14 },
  receiptTotalLabel: { fontSize: 18, fontWeight: '700' },
  receiptTotalValue: { fontSize: 22, fontWeight: '800' },
  doneBtn: { backgroundColor: '#1A56A0', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
