/**
 * customers.tsx — Customers / Utang Screen
 * Mobile port of CustomersPage.jsx
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Modal, StyleSheet, Alert, useColorScheme, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import { getAllCustomers, saveCustomer, deleteCustomer, getAllTransactions, addToSyncQueue } from '@/lib/db';
import { useTier } from '@/hooks/useTier';
import { Colors } from '@/constants/theme';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);
}

const BLANK = { name: '', phone: '', notes: '' };

export default function CustomersScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const { tier } = useTier();
  const canSync = tier !== 'libre';

  const [customers, setCustomers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(BLANK);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const load = useCallback(async () => {
    const [custs, txs] = await Promise.all([getAllCustomers(), getAllTransactions()]);
    setCustomers(custs);
    setTransactions(txs);
  }, []);

  useEffect(() => { load(); }, [load]);

  function getBalance(customerName: string) {
    return transactions
      .filter(t => t.customer_name === customerName && t.type === 'sale' && t.payment_mode === 'credit')
      .reduce((s, t) => s + Number(t.balance_due ?? 0), 0);
  }

  function getCustomerTransactions(customerName: string) {
    return transactions
      .filter(t => t.customer_name === customerName)
      .sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
  }

  const filtered = customers.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  function openNew() { setEditing(null); setForm(BLANK); setModalVisible(true); }
  function openEdit(c: any) { setEditing(c); setForm({ ...c }); setModalVisible(true); }

  async function save() {
    if (!form.name?.trim()) { Alert.alert('Required', 'Customer name is required.'); return; }
    const record = { ...form, id: editing?.id ?? uuidv4(), updated_at: new Date().toISOString() };
    await saveCustomer(record);
    if (canSync) await addToSyncQueue({ table_name: 'customers', record_id: record.id, operation: 'upsert', payload: record });
    setModalVisible(false);
    load();
  }

  async function remove(id: string) {
    Alert.alert('Delete customer', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteCustomer(id);
          if (canSync) await addToSyncQueue({ table_name: 'customers', record_id: id, operation: 'delete', payload: { id } });
          load();
        },
      },
    ]);
  }

  // Detail modal
  const DetailModal = () => {
    if (!selectedCustomer) return null;
    const balance = getBalance(selectedCustomer.name);
    const txs = getCustomerTransactions(selectedCustomer.name);

    return (
      <Modal visible={detailVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedCustomer.name}</Text>
            <TouchableOpacity onPress={() => setDetailVisible(false)}>
              <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
          </View>
          {balance > 0 && (
            <View style={[styles.balanceBanner, { backgroundColor: '#7F1D1D' }]}>
              <Text style={{ color: '#FCA5A5', fontWeight: '700', fontSize: 16 }}>
                Outstanding Balance: {formatCurrency(balance)}
              </Text>
            </View>
          )}
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Transaction History</Text>
            {txs.length === 0 && (
              <Text style={{ color: colors.textSecondary }}>No transactions yet.</Text>
            )}
            {txs.map(tx => (
              <View key={tx.id} style={[styles.txRow, { backgroundColor: colors.backgroundElement }]}>
                <View>
                  <Text style={[styles.txDesc, { color: colors.text }]}>{tx.description}</Text>
                  <Text style={[styles.txDate, { color: colors.textSecondary }]}>{tx.date}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.txAmt, { color: colors.text }]}>{formatCurrency(tx.amount ?? 0)}</Text>
                  {tx.payment_mode === 'credit' && (
                    <Text style={{ color: '#EF4444', fontSize: 11 }}>Utang</Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <DetailModal />

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Customers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: colors.backgroundElement }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={search} onChangeText={setSearch}
          placeholder="Search customers…" placeholderTextColor={colors.textSecondary}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            {customers.length === 0 ? 'No customers yet. Add one to track credit (utang).' : 'No results.'}
          </Text>
        }
        renderItem={({ item }) => {
          const balance = getBalance(item.name);
          return (
            <TouchableOpacity
              style={[styles.row, { backgroundColor: colors.backgroundElement }]}
              onPress={() => { setSelectedCustomer(item); setDetailVisible(true); }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, { color: colors.text }]}>{item.name}</Text>
                {item.phone ? <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>{item.phone}</Text> : null}
                {balance > 0 && (
                  <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 2 }}>
                    Utang: {formatCurrency(balance)}
                  </Text>
                )}
              </View>
              <View style={styles.rowActions}>
                <TouchableOpacity onPress={() => openEdit(item)} style={styles.editBtn}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(item.id)} style={styles.delBtn}>
                  <Text style={styles.delBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingHorizontal: 20, paddingTop: 20 }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editing ? 'Edit Customer' : 'New Customer'}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            {[
              { label: 'Name *', key: 'name', placeholder: 'Customer name' },
              { label: 'Phone', key: 'phone', placeholder: 'e.g. 09171234567', keyboardType: 'phone-pad' },
              { label: 'Notes', key: 'notes', placeholder: 'optional' },
            ].map(f => (
              <View key={f.key} style={{ marginBottom: 16 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{f.label}</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text, borderColor: colors.backgroundSelected, backgroundColor: colors.backgroundElement }]}
                  value={(form as any)[f.key] ?? ''}
                  onChangeText={val => setForm((p: any) => ({ ...p, [f.key]: val }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType={(f as any).keyboardType ?? 'default'}
                />
              </View>
            ))}
            <TouchableOpacity style={styles.saveBtn} onPress={save}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
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
  editBtn: { backgroundColor: '#1E40AF', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  editBtnText: { color: '#fff', fontSize: 12 },
  delBtn: { backgroundColor: '#7F1D1D', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  delBtnText: { color: '#FCA5A5', fontSize: 12 },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  fieldLabel: { fontSize: 13, marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  saveBtn: { backgroundColor: '#1A56A0', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  balanceBanner: { marginHorizontal: 20, borderRadius: 10, padding: 14, marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  txRow: { borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  txDesc: { fontSize: 13, fontWeight: '500' },
  txDate: { fontSize: 11, marginTop: 2 },
  txAmt: { fontSize: 14, fontWeight: '600' },
});
