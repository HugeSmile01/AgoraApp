/**
 * reports.tsx — Reports Screen
 * Mobile port of ReportsPage.jsx
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  useColorScheme, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllTransactions, getAllExpenses } from '@/lib/db';
import { Colors } from '@/constants/theme';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(v);
}

function getMonthLabel(offset: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
}

function getMonthKey(offset: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function ReportsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  const [monthOffset, setMonthOffset] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [txs, exps] = await Promise.all([getAllTransactions(), getAllExpenses()]);
    setTransactions(txs);
    setExpenses(exps);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const monthKey = getMonthKey(monthOffset);

  const monthSales = transactions
    .filter(t => t.type === 'sale' && (t.date || '').startsWith(monthKey))
    .reduce((s, t) => s + Number(t.amount ?? 0), 0);

  const monthExpenses = expenses
    .filter(e => (e.date || '').startsWith(monthKey))
    .reduce((s, e) => s + Number(e.amount ?? 0), 0);

  const grossProfit = monthSales - monthExpenses;
  const txCount = transactions.filter(t => t.type === 'sale' && (t.date || '').startsWith(monthKey)).length;

  // Category breakdown for expenses
  const expenseByCategory: Record<string, number> = {};
  expenses
    .filter(e => (e.date || '').startsWith(monthKey))
    .forEach(e => {
      const cat = e.category || 'Others';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Number(e.amount ?? 0);
    });

  // Sales by day (last 7 days of the month)
  const salesByDay: Record<string, number> = {};
  transactions
    .filter(t => t.type === 'sale' && (t.date || '').startsWith(monthKey))
    .forEach(t => {
      const day = t.date || '';
      salesByDay[day] = (salesByDay[day] || 0) + Number(t.amount ?? 0);
    });

  const sortedDays = Object.entries(salesByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7);

  const maxSales = Math.max(...sortedDays.map(([, v]) => v), 1);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header with month nav */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMonthOffset(o => o + 1)} style={styles.navBtn}>
          <Text style={[styles.navBtnText, { color: colors.textSecondary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: colors.text }]}>{getMonthLabel(monthOffset)}</Text>
        <TouchableOpacity
          onPress={() => setMonthOffset(o => Math.max(0, o - 1))}
          style={styles.navBtn}
          disabled={monthOffset === 0}
        >
          <Text style={[styles.navBtnText, { color: monthOffset === 0 ? colors.backgroundSelected : colors.textSecondary }]}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {/* Summary cards */}
        <View style={styles.statGrid}>
          {[
            { label: 'Total Sales', value: monthSales, color: '#1A56A0' },
            { label: 'Total Expenses', value: monthExpenses, color: '#D97706' },
            { label: 'Gross Profit', value: grossProfit, color: grossProfit >= 0 ? '#0D9488' : '#EF4444' },
            { label: 'Transactions', value: txCount, color: '#7C3AED', plain: true },
          ].map(s => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: colors.backgroundElement, borderLeftColor: s.color }]}>
              <Text style={[styles.statValue, { color: s.color }]}>
                {s.plain ? s.value : formatCurrency(s.value)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Sales trend bar chart */}
        {sortedDays.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Daily Sales Trend</Text>
            <View style={styles.barChart}>
              {sortedDays.map(([day, val]) => (
                <View key={day} style={styles.barCol}>
                  <Text style={[styles.barValue, { color: colors.textSecondary }]}>
                    {val >= 1000 ? `₱${(val / 1000).toFixed(0)}k` : `₱${Math.round(val)}`}
                  </Text>
                  <View style={[styles.barTrack, { backgroundColor: colors.backgroundSelected }]}>
                    <View style={[styles.barFill, { height: `${(val / maxSales) * 100}%`, backgroundColor: '#1A56A0' }]} />
                  </View>
                  <Text style={[styles.barLabel, { color: colors.textSecondary }]}>
                    {day.split('-')[2]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Expense breakdown */}
        {Object.keys(expenseByCategory).length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Expenses by Category</Text>
            {Object.entries(expenseByCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, amt]) => (
                <View key={cat} style={styles.catRow}>
                  <Text style={[styles.catLabel, { color: colors.text }]}>{cat}</Text>
                  <View style={styles.catBarWrap}>
                    <View
                      style={[styles.catBar, {
                        width: `${(amt / monthExpenses) * 100}%`,
                        backgroundColor: '#D97706',
                      }]}
                    />
                  </View>
                  <Text style={[styles.catAmt, { color: colors.textSecondary }]}>{formatCurrency(amt)}</Text>
                </View>
              ))}
          </View>
        )}

        {/* No data */}
        {txCount === 0 && expenses.filter(e => (e.date || '').startsWith(monthKey)).length === 0 && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No data for {getMonthLabel(monthOffset)}.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  navBtn: { padding: 8 },
  navBtnText: { fontSize: 24, fontWeight: '300' },
  monthLabel: { fontSize: 18, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 32 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, minWidth: '45%', borderRadius: 12, padding: 14,
    borderLeftWidth: 3,
  },
  statValue: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 12 },
  card: { borderRadius: 14, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barValue: { fontSize: 8, marginBottom: 2 },
  barTrack: { flex: 1, width: '100%', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, marginTop: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  catLabel: { fontSize: 13, width: 90 },
  catBarWrap: { flex: 1, height: 8, backgroundColor: '#1E293B', borderRadius: 4, overflow: 'hidden' },
  catBar: { height: 8, borderRadius: 4, minWidth: 4 },
  catAmt: { fontSize: 12, width: 72, textAlign: 'right' },
  emptyText: { textAlign: 'center', padding: 20, fontSize: 14 },
});
