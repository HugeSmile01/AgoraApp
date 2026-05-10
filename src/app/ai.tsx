/**
 * ai.tsx — AI Advisor Screen
 * Mobile port of AIAdvisorPage.jsx
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, useColorScheme, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAIHistory, saveAIMessage, clearAIHistory } from '@/lib/db';
import { useTier } from '@/hooks/useTier';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { v4 as uuidv4 } from 'uuid';

const SYSTEM_PROMPT = `You are Agora AI, a friendly business advisor for Filipino small and micro-businesses (sari-sari stores, carinderias, salons, bakeries, pharmacies, etc.). 
Give practical, actionable advice in simple English or Filipino. Focus on profitability, cash flow, inventory, and customer management.
Keep responses concise and mobile-friendly (short paragraphs).`;

export default function AIAdvisorScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const { tier } = useTier();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAIHistory().then(history => {
      setMessages(history.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    });
  }, []);

  // Pro gate
  if (tier !== 'pro') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.gateWrap}>
          <Text style={styles.gateEmoji}>🤖</Text>
          <Text style={[styles.gateTitle, { color: colors.text }]}>AI Advisor</Text>
          <Text style={[styles.gateDesc, { color: colors.textSecondary }]}>
            Get personalised business insights, forecasts, and actionable recommendations powered by Claude AI.
          </Text>
          <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/upgrade')}>
            <Text style={styles.upgradeBtnText}>Upgrade to Pro — ₱799/mo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg = { id: uuidv4(), role: 'user', content: text, created_at: new Date().toISOString() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    await saveAIMessage(userMsg);

    // Scroll to end
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    setLoading(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: updatedMessages
            .filter((m: any) => m.role === 'user' || m.role === 'assistant')
            .map((m: any) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      const replyText = data.content?.[0]?.text ?? 'Sorry, I could not generate a response.';

      const assistantMsg = { id: uuidv4(), role: 'assistant', content: replyText, created_at: new Date().toISOString() };
      const newMessages = [...updatedMessages, assistantMsg];
      setMessages(newMessages);
      await saveAIMessage(assistantMsg);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      const errMsg = { id: uuidv4(), role: 'assistant', content: 'Connection error. Please try again.', created_at: new Date().toISOString() };
      setMessages(p => [...p, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  const STARTERS = [
    'What are my top selling products this month?',
    'How can I reduce expenses?',
    'Tips to attract more customers?',
    'How do I manage utang (credit) better?',
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>AI Advisor</Text>
        {messages.length > 0 && (
          <TouchableOpacity onPress={async () => { await clearAIHistory(); setMessages([]); }}>
            <Text style={{ color: '#EF4444', fontSize: 13 }}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          ListEmptyComponent={
            <View style={styles.starterWrap}>
              <Text style={styles.starterEmoji}>💡</Text>
              <Text style={[styles.starterTitle, { color: colors.text }]}>Ask me anything about your business</Text>
              {STARTERS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.starterBtn, { backgroundColor: colors.backgroundElement }]}
                  onPress={() => { setInput(s); }}
                >
                  <Text style={[styles.starterBtnText, { color: colors.text }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          }
          renderItem={({ item }) => (
            <View style={[
              styles.bubble,
              item.role === 'user' ? styles.userBubble : [styles.aiBubble, { backgroundColor: colors.backgroundElement }],
            ]}>
              <Text style={[styles.bubbleText, { color: item.role === 'user' ? '#fff' : colors.text }]}>
                {item.content}
              </Text>
            </View>
          )}
        />

        {loading && (
          <View style={[styles.typingIndicator, { backgroundColor: colors.backgroundElement }]}>
            <ActivityIndicator size="small" color="#1A56A0" />
            <Text style={[styles.typingText, { color: colors.textSecondary }]}>Agora AI is thinking…</Text>
          </View>
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { backgroundColor: colors.backgroundElement, borderTopColor: colors.backgroundSelected }]}>
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your business…"
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  title: { fontSize: 22, fontWeight: '700' },
  gateWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  gateEmoji: { fontSize: 56, marginBottom: 16 },
  gateTitle: { fontSize: 24, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  gateDesc: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  upgradeBtn: { backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  upgradeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  starterWrap: { alignItems: 'center', paddingTop: 24 },
  starterEmoji: { fontSize: 40, marginBottom: 12 },
  starterTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  starterBtn: { borderRadius: 10, padding: 14, marginBottom: 8, alignSelf: 'stretch' },
  starterBtnText: { fontSize: 14 },
  bubble: { maxWidth: '85%', borderRadius: 16, padding: 14, marginBottom: 8 },
  userBubble: { backgroundColor: '#1A56A0', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  typingIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, borderRadius: 10, padding: 12, marginBottom: 8,
  },
  typingText: { fontSize: 13 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, borderTopWidth: 1,
  },
  textInput: { flex: 1, fontSize: 15, maxHeight: 100, paddingTop: 0 },
  sendBtn: {
    backgroundColor: '#1A56A0', width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#334155' },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 22 },
});
