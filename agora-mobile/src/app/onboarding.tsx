/**
 * onboarding.tsx — Business Profile Setup
 * Mobile port of OnboardingPage.jsx
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { saveProfile } from '@/lib/db';
import { BUSINESS_TYPES } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/theme';

const TYPES = Object.entries(BUSINESS_TYPES as Record<string, any>).map(([key, val]) => ({
  key, label: val.label, emoji: val.emoji, color: val.color,
}));

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!businessName.trim()) { Alert.alert('Required', 'Please enter your business name.'); return; }
    if (!businessType) { Alert.alert('Required', 'Please select a business type.'); return; }

    setLoading(true);
    try {
      await saveProfile({
        id: user?.id ?? 'profile',
        business_name: businessName.trim(),
        business_type: businessType,
        owner_name: ownerName.trim(),
        user_id: user?.id,
        created_at: new Date().toISOString(),
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save profile.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>A</Text>
          </View>
          <Text style={[styles.heading, { color: colors.text }]}>Set up your business</Text>
          <Text style={[styles.subheading, { color: colors.textSecondary }]}>
            This helps Agora personalise categories and reports for you.
          </Text>
        </View>

        {/* Business name */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Business Name *</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected, backgroundColor: colors.backgroundElement }]}
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="e.g. Mang Juan's Sari-Sari"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Owner name */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Your Name (optional)</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected, backgroundColor: colors.backgroundElement }]}
            value={ownerName}
            onChangeText={setOwnerName}
            placeholder="e.g. Juan dela Cruz"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Business type grid */}
        <Text style={[styles.label, { color: colors.textSecondary, marginLeft: 0, marginBottom: 12 }]}>
          Business Type *
        </Text>
        <View style={styles.typeGrid}>
          {TYPES.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.typeCard,
                { backgroundColor: colors.backgroundElement, borderColor: businessType === t.key ? t.color : 'transparent' },
                businessType === t.key && { borderWidth: 2 },
              ]}
              onPress={() => setBusinessType(t.key)}
            >
              <Text style={styles.typeEmoji}>{t.emoji}</Text>
              <Text style={[styles.typeLabel, { color: colors.text }]} numberOfLines={2}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveBtnText}>
            {loading ? 'Saving…' : 'Start using Agora →'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  logoArea: { alignItems: 'center', paddingVertical: 32 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#1A56A0',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  logoLetter: { fontSize: 36, fontWeight: '700', color: '#fff' },
  heading: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  subheading: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  field: { marginBottom: 20 },
  label: { fontSize: 13, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  typeCard: {
    borderRadius: 12, padding: 14, alignItems: 'center',
    flex: 1, minWidth: '28%', borderWidth: 2,
  },
  typeEmoji: { fontSize: 28, marginBottom: 6 },
  typeLabel: { fontSize: 12, textAlign: 'center', fontWeight: '500' },
  saveBtn: { backgroundColor: '#1A56A0', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
