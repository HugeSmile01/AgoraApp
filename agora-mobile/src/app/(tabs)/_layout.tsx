/**
 * (tabs)/_layout.tsx — Bottom Tab Navigation
 *
 * Replaces Agora's web sidebar with Expo Router bottom tabs.
 * Uses expo-symbols for tab icons (matches expo template pattern).
 * Guards: redirects to login if unauthenticated.
 */

import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { useColorScheme, Platform, View, ActivityIndicator } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/theme';

function TabIcon({ name, color }: { name: string; color: string }) {
  // expo-symbols on iOS, fallback text on Android/web
  if (Platform.OS === 'ios') {
    return <SymbolView name={name as any} tintColor={color} size={24} />;
  }
  // On Android/web, expo-symbols renders via SVG fallbacks
  return <SymbolView name={name as any} tintColor={color} size={24} />;
}

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color="#1A56A0" size="large" />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1A56A0',
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: scheme === 'dark' ? '#1E293B' : '#E2E8F0',
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <TabIcon name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: 'Sales',
          tabBarIcon: ({ color }) => <TabIcon name="cart.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color }) => <TabIcon name="cube.box.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color }) => <TabIcon name="creditcard.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <TabIcon name="ellipsis.circle.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
