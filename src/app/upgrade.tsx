/**
 * upgrade.tsx — Upgrade / Pricing Screen
 * Mobile port of UpgradePage.jsx
 */

import { Colors } from '@/constants/theme';
import { useTier } from '@/hooks/useTier';
import React from 'react';
import {
    Linking,
    ScrollView, StyleSheet,
    Text, TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PLANS = [
  {
    id: 'libre',
    name: 'Libre',
    price: 'Free',
    color: '#334155',
    features: [
      '✓ POS & Sales recording',
      '✓ Inventory management',
      '✓ Expense tracking',
      '✓ Basic reports',
      '✓ AI Advisor (free, local)',
      '✓ Offline-first (no internet needed)',
      '✗ Cloud sync',
      '✗ Multi-device access',
    ],
  },
  {
    id: 'cloud',
    name: 'Cloud',
    price: '₱299/mo',
    color: '#0D9488',
    badge: 'POPULAR',
    features: [
      '✓ Everything in Libre',
      '✓ Cloud sync (Supabase)',
      '✓ Multi-device access',
      '✓ Data backup',
      '✓ Customers & credit tracking',
      '✓ Quality management modules',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₱799/mo',
    color: '#7C3AED',
    badge: 'BEST VALUE',
    features: [
      '✓ Everything in Cloud',
      '✓ Advanced exports and workflows',
      '✓ Priority support',
      '✓ Sales forecasting',
      '✓ Export to PDF/Excel',
    ],
  },
];

export default function UpgradeScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const { tier } = useTier();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Upgrade Agora</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Start free, upgrade anytime. AI is included locally for everyone. Cloud features stay optional.
        </Text>

        {PLANS.map(plan => (
          <View
            key={plan.id}
            style={[
              styles.planCard,
              { backgroundColor: colors.backgroundElement },
              tier === plan.id && { borderWidth: 2, borderColor: plan.color },
            ]}
          >
            <View style={styles.planHeader}>
              <View>
                <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
                <Text style={[styles.planPrice, { color: plan.color }]}>{plan.price}</Text>
              </View>
              <View style={styles.badgeWrap}>
                {plan.badge && (
                  <View style={[styles.badge, { backgroundColor: plan.color }]}>
                    <Text style={styles.badgeText}>{plan.badge}</Text>
                  </View>
                )}
                {tier === plan.id && (
                  <View style={[styles.badge, { backgroundColor: plan.color }]}>
                    <Text style={styles.badgeText}>CURRENT</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={[styles.divider, { borderColor: colors.backgroundSelected }]} />

            {plan.features.map(f => (
              <Text
                key={f}
                style={[styles.feature, { color: f.startsWith('✗') ? colors.textSecondary : colors.text }]}
              >
                {f}
              </Text>
            ))}

            {plan.id !== 'libre' && tier !== plan.id && (
              <TouchableOpacity
                style={[styles.upgradeBtn, { backgroundColor: plan.color }]}
                onPress={() => Linking.openURL('https://agora.app/upgrade')}
              >
                <Text style={styles.upgradeBtnText}>Get {plan.name}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <Text style={[styles.note, { color: colors.textSecondary }]}>
          Billing is handled via GCash or credit card. Cancel anytime. Questions? Email support@agora.app
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 20, textAlign: 'center' },
  planCard: { borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 2, borderColor: 'transparent' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  planName: { fontSize: 20, fontWeight: '700' },
  planPrice: { fontSize: 18, fontWeight: '600', marginTop: 2 },
  badgeWrap: { gap: 4 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  divider: { borderTopWidth: 1, marginVertical: 12 },
  feature: { fontSize: 14, lineHeight: 22 },
  upgradeBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  upgradeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  note: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
