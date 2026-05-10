import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const TITLES: Record<string, string> = {
  capa: 'CAPA Actions',
  sop: 'SOP Library',
  audit: 'Audit Plans',
  supplier: 'Supplier Management',
  risk: 'Risk Register',
  training: 'Training Records',
  customer_feedback: 'Customer Feedback',
  monitoring: 'Quality KPIs',
  workflow: 'Workflows',
  timeline: 'Quality Timeline',
  'local-business-problems': 'Local Business Problems',
};

export default function QualitySubScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const route = 'sop';
  const title = TITLES[route] ?? route;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: '#1A56A0', fontSize: 16 }}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={s.body}>
        <View style={s.iconWrap}><Ionicons name="construct-outline" size={36} color="#1A56A0" /></View>
        <Text style={[s.heading, { color: colors.text }]}>{title}</Text>
        <Text style={[s.desc, { color: colors.textSecondary }]}>
          This module is being built. It ports the full web {title} page to React Native.
          Check back in the next update!
        </Text>
        <TouchableOpacity style={s.btn} onPress={() => router.back()}>
          <Text style={s.btnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn: { marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '700' },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heading: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  desc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  btn: { backgroundColor: '#1A56A0', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 },
  btnText: { color: '#fff', fontWeight: '600' },
});
