/**
 * (tabs)/more.tsx — More Screen
 *
 * Hub for all secondary navigation: Reports, Customers, AI Advisor,
 * Quality, Settings, and Upgrade. Replaces the sidebar links not in
 * the main tab bar.
 */

import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useTier } from '@/hooks/useTier';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface NavItem {
  label: string;
  description: string;
  route: string;
  emoji: string;
  color: string;
  proOnly?: boolean;
}

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Business',
    items: [
      { label: 'Reports', description: 'Sales & profit reports', route: '/reports', emoji: '📊', color: '#7C3AED' },
      { label: 'Customers / Utang', description: 'Customer accounts & credit', route: '/customers', emoji: '👥', color: '#0D9488' },
      { label: 'AI Advisor', description: 'Free local business insights', route: '/ai', emoji: '🤖', color: '#1A56A0' },
    ],
  },
  {
    title: 'Quality & Operations',
    items: [
      { label: 'Quality', description: 'SOPs, audits, non-conformances', route: '/quality', emoji: '🛡️', color: '#0D9488' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Settings', description: 'Profile & app settings', route: '/settings', emoji: '⚙️', color: '#6B7280' },
      { label: 'Upgrade Plan', description: 'Cloud sync & AI features', route: '/upgrade', emoji: '⭐', color: '#D97706' },
    ],
  },
];

export default function MoreScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { tier } = useTier();
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/login');
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>More</Text>
          <View style={[styles.tierBadge, {
            backgroundColor: tier === 'pro' ? '#7C3AED' : tier === 'cloud' ? '#0D9488' : '#334155',
          }]}>
            <Text style={styles.tierText}>{tier.toUpperCase()}</Text>
          </View>
        </View>

        {/* User info */}
        <View style={[styles.userCard, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
            {user?.email || 'Offline user'}
          </Text>
          <Text style={[styles.tierDesc, { color: colors.textSecondary }]}>
            {tier === 'libre' ? 'Free · Local storage only'
              : tier === 'cloud' ? '₱299/mo · Cloud sync active'
              : '₱799/mo · Full AI access'}
          </Text>
        </View>

        {/* Nav sections */}
        {SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {section.title.toUpperCase()}
            </Text>
            {section.items.map(item => (
              <TouchableOpacity
                key={item.label}
                style={[styles.navRow, { backgroundColor: colors.backgroundElement }]}
                onPress={() => router.push(item.route as any)}
              >
                <View style={[styles.navIcon, { backgroundColor: item.color + '20' }]}>
                  <Text style={styles.navEmoji}>{item.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.navLabelRow}>
                    <Text style={[styles.navLabel, { color: colors.text }]}>{item.label}</Text>
                  </View>
                  <Text style={[styles.navDesc, { color: colors.textSecondary }]}>
                    {item.description}
                  </Text>
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Sign out */}
        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: '#334155' }]}
          onPress={handleSignOut}
        >
          <Text style={{ color: '#9CA3AF', fontWeight: '500' }}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  title: { fontSize: 26, fontWeight: '700' },
  tierBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  tierText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  userCard: { marginHorizontal: 16, borderRadius: 12, padding: 16, marginBottom: 24 },
  userEmail: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  tierDesc: { fontSize: 12 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 20, marginBottom: 8 },
  navRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 16, borderRadius: 12, padding: 14, marginBottom: 6,
  },
  navIcon: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  navEmoji: { fontSize: 22 },
  navLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  navLabel: { fontSize: 15, fontWeight: '600' },
  navDesc: { fontSize: 12 },
  proBadge: { backgroundColor: '#7C3AED', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  proBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  signOutBtn: {
    marginHorizontal: 16, borderRadius: 12, borderWidth: 1,
    paddingVertical: 14, alignItems: 'center',
  },
});
