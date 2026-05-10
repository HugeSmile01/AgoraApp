/**
 * (tabs)/index.tsx — Dashboard (Today) Screen
 *
 * Mobile port of DashboardPage.jsx.
 * Charts: recharts → react-native-compatible SVG charts via Victory Native
 * or simple custom bars using View widths.
 * Uses React Native primitives throughout.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getAllProducts, getAllTransactions } from '@/lib/db';
import { getFinancialSummary } from '@/lib/financials';
import { useTier } from '@/hooks/useTier';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { checkAndNotifyLowStock, sendDailySummaryNotification } from '@/lib/notifications';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface Summary {
  monthSales: number;
  monthExpenses: number;
  grossProfit: number;
  totalTransactions: number;
  salesByDay?: { date: string; amount: number }[];
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(v);
}

function formatTimestamp(date: Date | null) {
  if (!date) return 'Never';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function DashboardScreen() {
  const { tier } = useTier();
  const { isOnline } = useNetworkStatus();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  const [summary, setSummary] = useState<Summary | null>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError('');
      const now = new Date();
      const [data, products, txs] = await Promise.all([
        getFinancialSummary(now.getFullYear(), now.getMonth() + 1),
        getAllProducts(),
        getAllTransactions(),
      ]);

      setSummary(data);
      setLowStock(
        products
          .filter((p: any) => p.track_stock && Number(p.stock ?? 0) <= Number(p.low_stock_threshold ?? 5))
          .slice(0, 5)
      );

      const today = new Date().toISOString().split('T')[0];
      const sorted = (txs as any[])
        .filter(t => t.type === 'sale')
        .sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
      setRecent(sorted.slice(0, 5));

      // Background notifications
      checkAndNotifyLowStock(products);
      const todayTxs = sorted.filter(t => (t.date || '').startsWith(today));
      const todaySales = todayTxs.reduce((s: number, t: any) => s + Number(t.amount ?? 0), 0);
      if (todayTxs.length > 0) sendDailySummaryNotification(todaySales, todayTxs.length);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Could not load dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const STATS = summary ? [
    { key: 'monthSales',        label: 'Total Sales',    icon: 'cash-outline', accent: '#1A56A0', profit: false },
    { key: 'monthExpenses',     label: 'Total Expenses', icon: 'receipt-outline', accent: '#D97706', profit: false },
    { key: 'grossProfit',       label: 'Gross Profit',   icon: 'trending-up-outline', accent: '#0D9488', profit: true  },
    { key: 'totalTransactions', label: 'Transactions',   icon: 'document-text-outline', accent: '#7C3AED', profit: false },
  ] : [];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View><Text style={[styles.headerEyebrow, { color: colors.textSecondary }]}>Overview</Text><Text style={[styles.headerTitle, { color: colors.text }]}>Today</Text></View>
        <View style={[styles.tierBadge, { backgroundColor: tier === 'pro' ? '#7C3AED' : tier === 'cloud' ? '#0D9488' : '#334155' }]}>
          <Ionicons name="sparkles-outline" size={12} color="#fff" />
          <Text style={styles.tierBadgeText}>{tier.toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !summary && (
          <View style={styles.loadingCard}>
            <Text style={{ color: colors.textSecondary }}>Loading dashboard…</Text>
          </View>
        )}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={[styles.healthCard, { backgroundColor: colors.backgroundElement, borderColor: isOnline ? '#14532D' : '#7F1D1D' }]}>
          <View style={styles.healthRow}>
            <Ionicons name={isOnline ? 'cloud-done-outline' : 'cloud-offline-outline'} size={16} color={isOnline ? '#22C55E' : '#F87171'} />
            <Text style={[styles.healthText, { color: colors.text }]}>
              {isOnline ? 'Online mode' : 'Offline mode'}
            </Text>
          </View>
          <Text style={[styles.healthMeta, { color: colors.textSecondary }]}>Last refresh: {formatTimestamp(lastUpdated)}</Text>
        </View>

        {/* Stat grid */}
        {summary && (
          <View style={styles.statGrid}>
            {STATS.map(s => (
              <View key={s.key} style={[styles.statCard, { backgroundColor: colors.backgroundElement }]}>
                <Ionicons name={s.icon as any} size={20} color={colors.textSecondary} style={styles.statIcon} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {s.key === 'totalTransactions'
                    ? (summary as any)[s.key]
                    : formatCurrency((summary as any)[s.key])}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Low stock alert */}
        {lowStock.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}><Ionicons name="alert-circle-outline" size={16} color={colors.text} /><Text style={[styles.sectionTitle, { color: colors.text }]}>Low Stock</Text></View>
            {lowStock.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.listRow, { backgroundColor: colors.backgroundElement }]}
                onPress={() => router.push('/(tabs)/inventory')}
              >
                <Text style={[styles.listRowText, { color: colors.text }]}>{p.name}</Text>
                <Text style={styles.lowStockBadge}>{p.stock} left</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent transactions */}
        {recent.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Sales</Text>
            {recent.map(tx => (
              <View key={tx.id} style={[styles.listRow, { backgroundColor: colors.backgroundElement }]}>
                <View>
                  <Text style={[styles.listRowText, { color: colors.text }]}>
                    {tx.customer_name || 'Walk-in'}
                  </Text>
                  <Text style={[styles.listRowSub, { color: colors.textSecondary }]}>
                    {tx.date ? new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </Text>
                </View>
                <Text style={[styles.txAmount, { color: colors.text }]}>
                  {formatCurrency(tx.amount ?? 0)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.quickRow}>
            {[
              { label: 'New Sale', icon: 'add-circle-outline', route: '/(tabs)/pos', color: '#1A56A0' },
              { label: 'Add Expense', icon: 'receipt-outline', route: '/(tabs)/expenses', color: '#D97706' },
              { label: 'Inventory', icon: 'cube-outline', route: '/(tabs)/inventory', color: '#0D9488' },
              { label: 'Reports', icon: 'bar-chart-outline', route: '/(tabs)/more', color: '#7C3AED' },
            ].map(qa => (
              <TouchableOpacity
                key={qa.label}
                style={[styles.quickBtn, { backgroundColor: qa.color }]}
                onPress={() => router.push(qa.route as any)}
              >
                <Ionicons name={qa.icon as any} size={16} color="#fff" /><Text style={styles.quickBtnText}>{qa.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  headerEyebrow: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  headerTitle: { fontSize: 30, fontWeight: '700', letterSpacing: -0.4 },
  tierBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  tierBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  loadingCard: { padding: 20, alignItems: 'center' },
  errorCard: { backgroundColor: '#7F1D1D', borderRadius: 10, padding: 14, marginBottom: 16 },
  errorText: { color: '#FCA5A5' },
  healthCard: { borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 14 },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  healthText: { fontSize: 13, fontWeight: '600' },
  healthMeta: { fontSize: 12 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: {
    borderRadius: 18, padding: 16, flex: 1, minWidth: '45%',
    borderWidth: 1, borderColor: 'rgba(148,163,184,0.18)',
  },
  statIcon: { fontSize: 20, marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  statValueNeg: { color: '#EF4444' },
  statLabel: { fontSize: 12 },
  section: { marginBottom: 24 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  listRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: 10, marginBottom: 6,
  },
  listRowText: { fontSize: 14, fontWeight: '500' },
  listRowSub: { fontSize: 12, marginTop: 2 },
  lowStockBadge: {
    backgroundColor: '#7F1D1D', color: '#FCA5A5',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, fontSize: 12,
  },
  txAmount: { fontSize: 14, fontWeight: '600' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: {
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16,
    flex: 1, minWidth: '45%', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  quickBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
