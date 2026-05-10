/**
 * (tabs)/inventory.tsx — Inventory Management Screen
 * Mobile port of InventoryPage.jsx
 */

import { Colors } from '@/constants/theme';
import { useTier } from '@/hooks/useTier';
import { addToSyncQueue, deleteProduct, getAllProducts, saveProduct } from '@/lib/db';
import { createId } from '@/lib/id';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);
}

const BLANK_PRODUCT = {
  name: '', category: 'Others', price: '', stock: '', track_stock: true,
  low_stock_threshold: '5', unit: 'pcs', cost_price: '', barcode: '',
};

export default function InventoryScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const { tier } = useTier();
  const canSync = tier !== 'libre';

  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form, setForm] = useState<any>(BLANK_PRODUCT);

  const load = useCallback(async () => {
    setProducts(await getAllProducts());
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase())
  );

  function openNew() {
    setEditingProduct(null);
    setForm(BLANK_PRODUCT);
    setModalVisible(true);
  }

  function openEdit(product: any) {
    setEditingProduct(product);
    setForm({ ...product });
    setModalVisible(true);
  }

  async function save() {
    if (!form.name?.trim()) { Alert.alert('Required', 'Product name is required.'); return; }
    const record = {
      ...form,
      id: editingProduct?.id ?? createId(),
      price: Number(form.price) || 0,
      cost_price: Number(form.cost_price) || 0,
      stock: Number(form.stock) || 0,
      low_stock_threshold: Number(form.low_stock_threshold) || 5,
      updated_at: new Date().toISOString(),
    };
    await saveProduct(record);
    if (canSync) await addToSyncQueue({ table_name: 'products', record_id: record.id, operation: 'upsert', payload: record });
    setModalVisible(false);
    load();
  }

  async function remove(id: string) {
    Alert.alert('Delete product', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteProduct(id);
          if (canSync) await addToSyncQueue({ table_name: 'products', record_id: id, operation: 'delete', payload: { id } });
          load();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Inventory</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.backgroundElement }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={search} onChangeText={setSearch}
          placeholder="Search products…" placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            {products.length === 0 ? 'No products yet. Tap + Add to start.' : 'No results.'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: colors.backgroundElement }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                {item.category} · {formatCurrency(item.price ?? 0)}
                {item.track_stock ? ` · ${item.stock ?? 0} in stock` : ''}
              </Text>
            </View>
            <View style={styles.rowActions}>
              <TouchableOpacity onPress={() => openEdit(item)} style={styles.editBtn}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(item.id)} style={styles.delBtn}>
                <Text style={styles.delBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <ScrollView contentContainerStyle={{ padding: 24 }}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingProduct ? 'Edit Product' : 'New Product'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {[
              { label: 'Name *', key: 'name', placeholder: 'Product name' },
              { label: 'Category', key: 'category', placeholder: 'e.g. Snacks' },
              { label: 'Price (₱)', key: 'price', placeholder: '0.00', keyboardType: 'decimal-pad' },
              { label: 'Cost Price (₱)', key: 'cost_price', placeholder: '0.00', keyboardType: 'decimal-pad' },
              { label: 'Stock', key: 'stock', placeholder: '0', keyboardType: 'number-pad' },
              { label: 'Low Stock Threshold', key: 'low_stock_threshold', placeholder: '5', keyboardType: 'number-pad' },
              { label: 'Unit', key: 'unit', placeholder: 'pcs / kg / L' },
              { label: 'Barcode', key: 'barcode', placeholder: 'optional' },
            ].map(field => (
              <View key={field.key} style={{ marginBottom: 16 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{field.label}</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text, borderColor: colors.backgroundSelected, backgroundColor: colors.backgroundElement }]}
                  value={String(form[field.key] ?? '')}
                  onChangeText={val => setForm((f: any) => ({ ...f, [field.key]: val }))}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType={(field as any).keyboardType ?? 'default'}
                />
              </View>
            ))}

            <View style={styles.trackRow}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Track stock</Text>
              <TouchableOpacity
                style={[styles.toggle, form.track_stock && styles.toggleOn]}
                onPress={() => setForm((f: any) => ({ ...f, track_stock: !f.track_stock }))}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                  {form.track_stock ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={save}>
              <Text style={styles.saveBtnText}>Save Product</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  addBtn: { backgroundColor: '#1A56A0', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '600' },
  searchWrap: { marginHorizontal: 16, borderRadius: 10, marginBottom: 8 },
  searchInput: { paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  row: { borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center' },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  rowActions: { flexDirection: 'row', gap: 8 },
  editBtn: { backgroundColor: '#1E40AF', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { color: '#fff', fontSize: 13 },
  delBtn: { backgroundColor: '#7F1D1D', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  delBtnText: { color: '#FCA5A5', fontSize: 13 },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  fieldLabel: { fontSize: 13, marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  trackRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  toggle: { backgroundColor: '#334155', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  toggleOn: { backgroundColor: '#1A56A0' },
  saveBtn: { backgroundColor: '#1A56A0', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
