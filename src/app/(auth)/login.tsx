import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { StatusBar } from 'expo-status-bar';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signUp, activateOfflineMode, libreLifecycle } = useAuth();

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
      <LinearGradient colors={["#070B16", "#0A1228", "#111C35"]} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.logoArea}>
            <BlurView intensity={50} tint="dark" style={styles.logoCircle}>
              <Text style={styles.logoLetter}>A</Text>
            </BlurView>
            <Text style={styles.logoTitle}>Agora</Text>
            <Text style={styles.logoSubtitle}>Business OS</Text>
            <Text style={styles.modeChip}>Libre lifecycle: {libreLifecycle.replace(/_/g, ' ')}</Text>
          </View>

          <BlurView intensity={45} tint="dark" style={styles.card}>
            <Text style={styles.cardTitle}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#94A3B8"
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
              placeholderTextColor="#94A3B8"
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
          </BlurView>

          <TouchableOpacity style={styles.offlineBtn} onPress={handleOfflineMode}>
            <Text style={styles.offlineBtnText}>Continue in Libre Offline</Text>
          </TouchableOpacity>

          <Text style={styles.footnote}>
            Libre mode stores data locally on your device. You can hand off to cloud sync anytime.
          </Text>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070B16' },
  gradient: { flex: 1 },
  container: {
    flexGrow: 1, justifyContent: 'center',
    paddingHorizontal: 24, paddingVertical: 48,
  },
  logoArea: { alignItems: 'center', marginBottom: 30 },
  logoCircle: {
    width: 78, height: 78, borderRadius: 39,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', marginBottom: 12,
  },
  logoLetter: { fontSize: 38, fontWeight: '700', color: '#F8FAFC' },
  logoTitle: { fontSize: 30, fontWeight: '700', color: '#F8FAFC', letterSpacing: 0.4 },
  logoSubtitle: { fontSize: 14, color: '#AFC3E9', marginTop: 2 },
  modeChip: { marginTop: 8, fontSize: 12, color: '#9FB2D5' },
  card: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 22, fontWeight: '700', color: '#F1F5F9', marginBottom: 20,
  },
  label: { fontSize: 13, color: '#C8D5F0', marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(10, 18, 40, 0.68)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(156, 163, 175, 0.32)',
    color: '#F1F5F9', fontSize: 15,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 16,
  },
  btn: {
    backgroundColor: '#1D4ED8', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  switchMode: { alignItems: 'center', marginTop: 16 },
  switchModeText: { color: '#8CB4FF', fontSize: 14 },

  offlineBtn: {
    borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.5)', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginBottom: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  offlineBtnText: { color: '#D5E3FF', fontSize: 14, fontWeight: '600' },
  footnote: { textAlign: 'center', color: '#90A4CC', fontSize: 12, lineHeight: 18 },
});
