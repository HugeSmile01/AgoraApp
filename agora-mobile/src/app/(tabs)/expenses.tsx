/**
 * (tabs)/expenses.tsx — Expenses Screen
 * Mobile port of ExpensesPage.jsx
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Modal, StyleSheet, Alert, useColorScheme, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import { getAllExpenses, saveExpense, deleteExpense, addToSyncQueue, getProfile } from '@/lib/db';
import { getBusinessType } from '@/lib/constants';
import { useTier } from '@/hooks/useTier';
import { Colors } from '@/constants/theme';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);
}

const BLANK = { description: '', amount: '', category: 'Others', date: new Date().toISOString().split('T')[0], notes: '' };

export default function ExpensesScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const { tier } = useTier();
  const canSync = tier !== 'libre';

  const [expenses, setExpenses] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(BLANK);

  const load = useCallback(async () => {
    const [exps, prof] = await Promise.all([getAllExpenses(), getProfile()]);
    setExpenses(exps.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setProfile(prof);
  }, []);

  useEffect(() => { load(); }, [load]);

  const expenseCategories = getBusinessType(profile?.business_type)?.expenseCategories ?? ['Utilities', 'Rent', 'Supplies', 'Others'];

  const totalThisMonth = expenses
    .filter(e => {
      const now = new Date();
      return e.date?.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    })
    .reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);

  function openNew() { setEditing(null); setForm(BLANK); setModalVisible(true); }
  function openEdit(e: any) { setEditing(e); setForm({ ...e }); setModalVisible(true); }

  async function save() {
    if (!form.description?.trim()) { Alert.alert('Required', 'Description is required.'); return; }
    if (!form.amount) { Alert.alert('Required', 'Amount is required.'); return; }
    const record = {
      ...form,
      id: editing?.id ?? uuidv4(),
      amount: Number(form.amount),
      type: 'expense',
      created_at: editing?.created_at ?? new Date().toISOString(),
    };
    await saveExpense(record);
    if (canSync) await addToSyncQueue({ table_name: 'expenses', record_id: record.id, operation: 'upsert', payload: record });
    setModalVisible(false);
    load();
  }

  async function remove(id: string) {
    Alert.alert('Delete expense', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteExpense(id);
          if (canSync) await addToSyncQueue({ table_name: 'expenses', record_id: id, operation: 'delete', payload: { id } });
          load();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Expenses</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Monthly summary */}
      <View style={[styles.summaryCard, { backgroundColor: colors.backgroundElement }]}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>This month</Text>
        <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{formatCurrency(totalThisMonth)}</Text>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={e => e.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            No expenses yet. Tap + Add to log one.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: colors.backgroundElement }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowDesc, { color: colors.text }]}>{item.description}</Text>
              <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                {item.category} · {item.date}
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowAmount}>{formatCurrency(item.amount ?? 0)}</Text>
              <View style={styles.rowActions}>
                <TouchableOpacity onPress={() => openEdit(item)} style={styles.editBtn}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(item.id)} style={styles.delBtn}>
                  <Text style={styles.delBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <ScrollView contentContainerStyle={{ padding: 24 }}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editing ? 'Edit Expense' : 'New Expense'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {[
              { label: 'Description *', key: 'description', placeholder: 'e.g. Supplier restock' },
              { label: 'Amount (₱) *', key: 'amount', placeholder: '0.00', keyboardType: 'decimal-pad' },
              { label: 'Date', key: 'date', placeholder: 'YYYY-MM-DD' },
              { label: 'Notes', key: 'notes', placeholder: 'optional' },
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

            {/* Category picker */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8 }}>
              {expenseCategories.map((cat: string) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catPill, form.category === cat && styles.catPillActive]}
                  onPress={() => setForm((f: any) => ({ ...f, category: cat }))}
                >
                  <Text style={[styles.catPillText, form.category === cat && { color: '#fff' }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} onPress={save}>
              <Text style={styles.saveBtnText}>Save Expense</Text>
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
  summaryCard: { marginHorizontal: 16, borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 22, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  row: { borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center' },
  rowDesc: { fontSize: 15, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  rowAmount: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
  rowActions: { flexDirection: 'row', gap: 6 },
  editBtn: { backgroundColor: '#1E40AF', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  editBtnText: { color: '#fff', fontSize: 12 },
  delBtn: { backgroundColor: '#7F1D1D', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  delBtnText: { color: '#FCA5A5', fontSize: 12 },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  fieldLabel: { fontSize: 13, marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  catPill: { borderWidth: 1, borderColor: '#334155', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  catPillActive: { backgroundColor: '#1A56A0', borderColor: '#1A56A0' },
  catPillText: { color: '#9CA3AF', fontSize: 13 },
  saveBtn: { backgroundColor: '#1A56A0', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
