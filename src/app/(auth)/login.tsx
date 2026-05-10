/**
 * (auth)/login.tsx — Login Screen
 *
 * Mobile-native version of the web LoginPage.
 * Uses React Native primitives instead of HTML/CSS.
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { StatusBar } from 'expo-status-bar';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signUp, activateOfflineMode } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        Alert.alert('Check your email', 'A confirmation link has been sent to your email.');
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOfflineMode() {
    await activateOfflineMode();
    router.replace('/(tabs)');
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>A</Text>
          </View>
          <Text style={styles.logoTitle}>Agora</Text>
          <Text style={styles.logoSubtitle}>Business OS</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#6B7280"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#6B7280"
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>{mode === 'login' ? 'Sign in' : 'Create account'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchMode}
            onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            <Text style={styles.switchModeText}>
              {mode === 'login'
                ? "Don't have an account? Register"
                : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Offline mode */}
        <TouchableOpacity style={styles.offlineBtn} onPress={handleOfflineMode}>
          <Text style={styles.offlineBtnText}>Use offline (free / Libre mode)</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>
          Libre mode stores data locally on your device. Upgrade anytime to sync to the cloud.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },
  container: {
    flexGrow: 1, justifyContent: 'center',
    paddingHorizontal: 24, paddingVertical: 48,
  },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#1A56A0', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  logoLetter: { fontSize: 36, fontWeight: '700', color: '#fff' },
  logoTitle: { fontSize: 28, fontWeight: '700', color: '#fff' },
  logoSubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },

  card: {
    backgroundColor: '#1E293B', borderRadius: 16,
    padding: 24, marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20, fontWeight: '700', color: '#F1F5F9', marginBottom: 20,
  },
  label: { fontSize: 13, color: '#9CA3AF', marginBottom: 6 },
  input: {
    backgroundColor: '#0F172A', borderRadius: 10,
    borderWidth: 1, borderColor: '#334155',
    color: '#F1F5F9', fontSize: 15,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 16,
  },
  btn: {
    backgroundColor: '#1A56A0', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  switchMode: { alignItems: 'center', marginTop: 16 },
  switchModeText: { color: '#60A5FA', fontSize: 14 },

  offlineBtn: {
    borderWidth: 1, borderColor: '#334155', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginBottom: 16,
  },
  offlineBtnText: { color: '#9CA3AF', fontSize: 14 },
  footnote: { textAlign: 'center', color: '#4B5563', fontSize: 12, lineHeight: 18 },
});
