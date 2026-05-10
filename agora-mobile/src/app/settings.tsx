/**
 * settings.tsx — Settings Screen
 * Mobile port of SettingsPage.jsx
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Switch, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getProfile, saveProfile } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { useTier } from '@/hooks/useTier';
import { storage } from '@/lib/storage';
import {
  getNotificationPrefs, saveNotificationPrefs,
  requestNotificationPermission,
} from '@/lib/notifications';
import { BUSINESS_TYPES } from '@/lib/constants';
import { Colors } from '@/constants/theme';

const TYPES = Object.entries(BUSINESS_TYPES as Record<string, any>).map(([key, val]) => ({
  key, label: val.label, emoji: val.emoji,
}));

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { tier } = useTier();
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ business_name: '', business_type: '', owner_name: '', tax_rate: '0' });
  const [notifPrefs, setNotifPrefs] = useState({ enabled: false, lowStock: true, dailySummary: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [prof, prefs] = await Promise.all([getProfile(), getNotificationPrefs()]);
      if (prof) {
        setProfile(prof);
        setForm({
          business_name: prof.business_name ?? '',
          business_type: prof.business_type ?? '',
          owner_name: prof.owner_name ?? '',
          tax_rate: String(prof.tax_rate ?? 0),
        });
      }
      setNotifPrefs({ enabled: prefs.enabled, lowStock: prefs.lowStock, dailySummary: prefs.dailySummary });
    })();
  }, []);

  async function saveSettings() {
    setSaving(true);
    try {
      const updated = {
        ...(profile ?? {}),
        ...form,
        tax_rate: Number(form.tax_rate) || 0,
        updated_at: new Date().toISOString(),
      };
      await saveProfile(updated);
      setProfile(updated);
      Alert.alert('Saved', 'Settings updated successfully.');
    } catch {
      Alert.alert('Error', 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleNotifications(val: boolean) {
    if (val) {
      const status = await requestNotificationPermission();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Enable notifications in your device settings.');
        return;
      }
    }
    const updated = { ...notifPrefs, enabled: val };
    setNotifPrefs(updated);
    await saveNotificationPrefs({ ...updated, syncReminder: true });
  }

  async function handleClearData() {
    Alert.alert(
      'Clear all data',
      'This will permanently delete all local data (products, transactions, expenses). This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear', style: 'destructive',
          onPress: async () => {
            // Clear AsyncStorage keys with agora prefix
            const keys = ['agora_tier', 'agora_local_user', 'agora_login_count', 'agora_first_use'];
            for (const k of keys) await storage.removeItem(k);
            Alert.alert('Cleared', 'All local data has been deleted.', [
              { text: 'OK', onPress: () => router.replace('/(auth)/login') },
            ]);
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Business Profile */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BUSINESS PROFILE</Text>
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          {[
            { label: 'Business Name', key: 'business_name', placeholder: 'My Business' },
            { label: 'Owner Name', key: 'owner_name', placeholder: 'Your name' },
            { label: 'Tax Rate (%)', key: 'tax_rate', placeholder: '0', keyboardType: 'decimal-pad' },
          ].map(f => (
            <View key={f.key} style={{ marginBottom: 16 }}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{f.label}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }]}
                value={(form as any)[f.key]}
                onChangeText={val => setForm(p => ({ ...p, [f.key]: val }))}
                placeholder={f.placeholder}
                placeholderTextColor={colors.textSecondary}
                keyboardType={(f as any).keyboardType ?? 'default'}
              />
            </View>
          ))}

          <Text style={[styles.label, { color: colors.textSecondary }]}>Business Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.typePill, form.business_type === t.key && styles.typePillActive]}
                onPress={() => setForm(p => ({ ...p, business_type: t.key }))}
              >
                <Text>{t.emoji}</Text>
                <Text style={[styles.typePillText, form.business_type === t.key && { color: '#fff' }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={saveSettings}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>NOTIFICATIONS</Text>
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          {[
            { label: 'Enable Notifications', key: 'enabled', onToggle: toggleNotifications },
            { label: 'Low Stock Alerts', key: 'lowStock', onToggle: async (v: boolean) => { const u = { ...notifPrefs, lowStock: v }; setNotifPrefs(u); await saveNotificationPrefs({ ...u, syncReminder: true }); } },
            { label: 'Daily Summary', key: 'dailySummary', onToggle: async (v: boolean) => { const u = { ...notifPrefs, dailySummary: v }; setNotifPrefs(u); await saveNotificationPrefs({ ...u, syncReminder: true }); } },
          ].map(n => (
            <View key={n.key} style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>{n.label}</Text>
              <Switch
                value={(notifPrefs as any)[n.key]}
                onValueChange={n.onToggle}
                trackColor={{ true: '#1A56A0', false: '#334155' }}
              />
            </View>
          ))}
        </View>

        {/* Account */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACCOUNT</Text>
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
          <Text style={[styles.valueText, { color: colors.text }]}>{user?.email || 'Offline user'}</Text>

          <View style={styles.divider} />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Plan</Text>
          <Text style={[styles.valueText, { color: colors.text }]}>
            {tier === 'libre' ? 'Free (Libre)' : tier === 'cloud' ? 'Cloud — ₱299/mo' : 'Pro — ₱799/mo'}
          </Text>

          {tier === 'libre' && (
            <TouchableOpacity
              style={[styles.saveBtn, { marginTop: 16, backgroundColor: '#D97706' }]}
              onPress={() => router.push('/upgrade')}
            >
              <Text style={styles.saveBtnText}>Upgrade Plan ⭐</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Danger zone */}
        <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>DANGER ZONE</Text>
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearData}>
            <Text style={styles.dangerBtnText}>Clear all local data</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dangerBtn, { marginTop: 8 }]}
            onPress={async () => { await signOut(); router.replace('/(auth)/login'); }}
          >
            <Text style={styles.dangerBtnText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 8 },
  card: { borderRadius: 14, padding: 16, marginBottom: 20 },
  label: { fontSize: 13, marginBottom: 6 },
  input: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 15, marginBottom: 0,
  },
  typePill: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    borderWidth: 1, borderColor: '#334155', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  typePillActive: { backgroundColor: '#1A56A0', borderColor: '#1A56A0' },
  typePillText: { color: '#9CA3AF', fontSize: 12 },
  saveBtn: { backgroundColor: '#1A56A0', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  toggleLabel: { fontSize: 15 },
  valueText: { fontSize: 15, fontWeight: '500', marginBottom: 4 },
  divider: { height: 1, backgroundColor: '#1E293B', marginVertical: 12 },
  dangerBtn: {
    borderWidth: 1, borderColor: '#7F1D1D', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  dangerBtnText: { color: '#EF4444', fontWeight: '600' },
});
