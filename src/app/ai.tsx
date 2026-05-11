/**
 * ai.tsx — AI Advisor Screen
 * Free local-first business coach with offline conversation history.
 */

import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { getFinancialSummary } from '@/lib/financials';
import { clearAIHistory, getAIHistory } from '@/lib/db';
import { sendAIMessage } from '@/lib/ai';
import { createId } from '@/lib/id';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProfile } from '@/lib/db';

export default function AIAdvisorScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [contextReady, setContextReady] = useState(false);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const [history, prof, summary] = await Promise.all([
        getAIHistory(),
        getProfile(),
        getFinancialSummary(now.getFullYear(), now.getMonth() + 1),
      ]);

      setMessages(history.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      setProfile(prof);
      setFinancialSummary(summary);
      setContextReady(true);
    })();
  }, []);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg = { id: createId(), role: 'user', content: text, created_at: new Date().toISOString() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    // Scroll to end
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    setLoading(true);
    try {
      let advisorProfile = profile;
      let advisorSummary = financialSummary;
      if (!contextReady) {
        const now = new Date();
        [advisorProfile, advisorSummary] = await Promise.all([
          getProfile(),
          getFinancialSummary(now.getFullYear(), now.getMonth() + 1),
        ]);
        setProfile(advisorProfile);
        setFinancialSummary(advisorSummary);
      }

      const replyText = await sendAIMessage(text, advisorProfile, advisorSummary);

      const assistantMsg = { id: createId(), role: 'assistant', content: replyText, created_at: new Date().toISOString() };
      const newMessages = [...updatedMessages, assistantMsg];
      setMessages(newMessages);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      const errMsg = { id: createId(), role: 'assistant', content: 'I could not build a suggestion right now. Please try again.', created_at: new Date().toISOString() };
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

  const suggestedPrompts = useMemo(() => {
    if (!financialSummary) return STARTERS;

    const prompts = [
      'Give me 3 actions to improve this week.',
      'What is my biggest business risk right now?',
    ];

    if (typeof financialSummary.revenue === 'number' && typeof financialSummary.expenses === 'number') {
      if (financialSummary.expenses > financialSummary.revenue * 0.7) {
        prompts.unshift('My expenses look high. How can I cut costs without hurting sales?');
      } else {
        prompts.unshift('How can I reinvest profits to grow faster this month?');
      }
    }

    if (typeof financialSummary.profit === 'number' && financialSummary.profit < 0) {
      prompts.unshift('I am losing money this month. What should I fix first?');
    }

    return prompts.slice(0, 4);
  }, [financialSummary]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>AI Advisor</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Free, local-first coaching with no API key required.</Text>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity style={[styles.clearBtn, { backgroundColor: colors.backgroundElement }]} onPress={async () => { await clearAIHistory(); setMessages([]); }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.heroCard, { backgroundColor: colors.backgroundElement }]}> 
        <Text style={[styles.heroTitle, { color: colors.text }]}>Ask about sales, cash flow, inventory, or utang.</Text>
        <Text style={[styles.heroText, { color: colors.textSecondary }]}>The advice is generated from the data already on your device. Cloud sync is still available if you need multi-device access.</Text>
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
              <Ionicons name="bulb-outline" size={36} color={colors.textSecondary} style={styles.starterEmoji} />
              <Text style={[styles.starterTitle, { color: colors.text }]}>Ask me anything about your business</Text>
              {suggestedPrompts.map(s => (
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
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 4 },
  clearBtn: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  heroTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6, lineHeight: 22 },
  heroText: { fontSize: 13, lineHeight: 19 },
  starterWrap: { alignItems: 'center', paddingTop: 24 },
  starterEmoji: { fontSize: 40, marginBottom: 12 },
  starterTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  starterBtn: { borderRadius: 14, padding: 14, marginBottom: 8, alignSelf: 'stretch' },
  starterBtnText: { fontSize: 14 },
  bubble: { maxWidth: '85%', borderRadius: 18, padding: 14, marginBottom: 8 },
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
