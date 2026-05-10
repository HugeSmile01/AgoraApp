/**
 * (auth)/_layout.tsx — Auth group layout
 * Redirects authenticated users away from auth screens.
 */

import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator color="#1A56A0" size="large" />
      </View>
    );
  }

  if (user) return <Redirect href="/(tabs)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
