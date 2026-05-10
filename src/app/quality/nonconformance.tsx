/**
 * quality/nonconformance.tsx — Non-Conformance Tracker
 * Simplified mobile port of NonConformancePage.jsx
 */

import { Colors } from '@/constants/theme';
import { deleteNonConformance, getAllNonConformances, saveNonConformance } from '@/lib/db';
import { createId } from '@/lib/id';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList, Modal,
    ScrollView, StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SEVERITY = ['low', 'medium', 'high', 'critical'] as const;
const STATUS = ['open', 'in_progress', 'resolved', 'closed'] as const;

const SEVERITY_COLOR: Record<string, string> = {
  low: '#0D9488', medium: '#D97706', high: '#EF4444', critical: '#7C3AED',
};

const BLANK = {
  title: '', description: '', severity: 'medium',
  status: 'open', owner: '', due_date: '',
};

export default function NonConformanceScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  const [items, setItems] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(BLANK);

  const load = useCallback(async () => {
    setItems(await getAllNonConformances());
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() { setEditing(null); setForm(BLANK); setModalVisible(true); }
  function openEdit(item: any) { setEditing(item); setForm({ ...item }); setModalVisible(true); }

  async function save() {
    if (!form.title?.trim()) { Alert.alert('Required', 'Title is required.'); return; }
    const record = { ...form, id: editing?.id ?? createId(), created_at: editing?.created_at ?? new Date().toISOString(), updated_at: new Date().toISOString() };
    await saveNonConformance(record);
    setModalVisible(false);
    load();
  }

  async function remove(id: string) {
    Alert.alert('Delete', 'Delete this record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteNonConformance(id); load(); } },
    ]);
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Non-Conformances</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>No non-conformances logged.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.row, { backgroundColor: colors.backgroundElement }]} onPress={() => openEdit(item)}>
            <View style={{ flex: 1 }}>
              <View style={styles.rowTop}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>{item.title}</Text>
                <View style={[styles.severityBadge, { backgroundColor: SEVERITY_COLOR[item.severity] + '30' }]}>
                  <Text style={[styles.severityText, { color: SEVERITY_COLOR[item.severity] }]}>{item.severity}</Text>
                </View>
              </View>
              <Text style={[styles.rowDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
              <View style={styles.rowBottom}>
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>{item.status.replace('_', ' ')} · {item.owner || 'Unassigned'}</Text>
                <TouchableOpacity onPress={() => remove(item.id)} style={styles.delBtn}>
                  <Text style={styles.delBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <ScrollView contentContainerStyle={{ padding: 24 }}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{editing ? 'Edit NC' : 'New Non-Conformance'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {[
              { label: 'Title *', key: 'title' },
              { label: 'Description', key: 'description' },
              { label: 'Owner', key: 'owner' },
              { label: 'Due Date (YYYY-MM-DD)', key: 'due_date' },
            ].map(f => (
              <View key={f.key} style={{ marginBottom: 14 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{f.label}</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected, backgroundColor: colors.backgroundElement }]}
                  value={form[f.key] ?? ''}
                  onChangeText={val => setForm((p: any) => ({ ...p, [f.key]: val }))}
                  placeholder={f.label}
                  placeholderTextColor={colors.textSecondary}
                  multiline={f.key === 'description'}
                />
              </View>
            ))}

            <Text style={[styles.label, { color: colors.textSecondary }]}>Severity</Text>
            <View style={styles.pillRow}>
              {SEVERITY.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pill, form.severity === s && { backgroundColor: SEVERITY_COLOR[s] }]}
                  onPress={() => setForm((p: any) => ({ ...p, severity: s }))}
                >
                  <Text style={[styles.pillText, form.severity === s && { color: '#fff' }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>Status</Text>
            <View style={styles.pillRow}>
              {STATUS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pill, form.status === s && { backgroundColor: '#1A56A0' }]}
                  onPress={() => setForm((p: any) => ({ ...p, status: s }))}
                >
                  <Text style={[styles.pillText, form.status === s && { color: '#fff' }]}>{s.replace('_', ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={save}>
              <Text style={styles.saveBtnText}>Save</Text>
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
  title: { fontSize: 20, fontWeight: '700' },
  addBtn: { backgroundColor: '#1A56A0', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40 },
  row: { borderRadius: 12, padding: 14 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  rowTitle: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  severityBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  severityText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  rowDesc: { fontSize: 12, marginBottom: 8 },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowMeta: { fontSize: 11, textTransform: 'capitalize' },
  delBtn: { backgroundColor: '#7F1D1D', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  delBtnText: { color: '#FCA5A5', fontSize: 11 },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 13, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  pill: { borderWidth: 1, borderColor: '#334155', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  pillText: { color: '#9CA3AF', fontSize: 12, textTransform: 'capitalize' },
  saveBtn: { backgroundColor: '#1A56A0', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
