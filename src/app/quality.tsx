/**
 * quality.tsx — Quality Management Hub
 * Mobile port of QualityPage.jsx
 */

import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const QUALITY_MODULES = [
  { label: 'Non-Conformance', icon: 'alert-circle-outline', route: '/quality/nonconformance', desc: 'Track quality issues' },
  { label: 'CAPA', icon: 'build-outline', route: '/quality/capa', desc: 'Corrective & preventive actions' },
  { label: 'SOP Library', icon: 'document-text-outline', route: '/quality/sop', desc: 'Standard operating procedures' },
  { label: 'Audits', icon: 'search-outline', route: '/quality/audit', desc: 'Internal quality audits' },
  { label: 'Suppliers', icon: 'people-outline', route: '/quality/supplier', desc: 'Supplier qualification & scoring' },
  { label: 'Risk Register', icon: 'locate-outline', route: '/quality/risk', desc: 'Risk identification & mitigation' },
  { label: 'Training', icon: 'school-outline', route: '/quality/training', desc: 'Staff competency records' },
  { label: 'Customer Feedback', icon: 'chatbubble-ellipses-outline', route: '/quality/customer_feedback', desc: 'Feedback cases & resolution' },
  { label: 'Monitoring', icon: 'stats-chart-outline', route: '/quality/monitoring', desc: 'Quality KPIs & trends' },
  { label: 'Workflows', icon: 'settings-outline', route: '/quality/workflow', desc: 'Process workflows' },
  { label: 'Timeline', icon: 'calendar-outline', route: '/quality/timeline', desc: 'Quality event history' },
  { label: 'Local Problems', icon: 'pin-outline', route: '/quality/local-business-problems', desc: 'Common local issues' },
];

export default function QualityScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Quality Management</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Track non-conformances, maintain SOPs, manage supplier relationships, and drive continuous improvement.
        </Text>
        <View style={styles.grid}>
          {QUALITY_MODULES.map(m => (
            <TouchableOpacity
              key={m.label}
              style={[styles.card, { backgroundColor: colors.backgroundElement }]}
              onPress={() => router.push(m.route as any)}
            >
              <Text style={styles.cardIcon}><Ionicons name={m.icon as any} size={24} color={colors.textSecondary} /></Text>
              <Text style={[styles.cardLabel, { color: colors.text }]}>{m.label}</Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{m.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 32 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    borderRadius: 14, padding: 16, flex: 1, minWidth: '45%',
  },
  cardIcon: { fontSize: 28, marginBottom: 8 },
  cardLabel: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cardDesc: { fontSize: 12, lineHeight: 16 },
});
