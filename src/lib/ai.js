// src/lib/ai.js
// OpenRouter API integration for the AI Business Advisor.
//
// Security model:
//   • PRODUCTION: All requests are proxied through the `ai-chat` Supabase Edge Function.
//     The OPENROUTER_API_KEY lives only in the server-side secret store — never in the browser.
//   • DEVELOPMENT FALLBACK: If VITE_OPENROUTER_API_KEY is set in .env.local and no Supabase
//     project URL is configured, the browser calls OpenRouter directly for faster local dev.
//     Never commit VITE_OPENROUTER_API_KEY to source control or deploy it to production.

import { getAIHistory, saveAIMessage, clearAIHistory } from './db';
import { BUSINESS_TYPES } from './constants';
import { v4 as uuidv4 } from 'uuid';
import { supabase, isSupabaseConfigured } from './supabase';

export const OPENROUTER_FREE_MODELS = [
  { id: 'qwen/qwen3-32b:free',                          label: 'Helios-32B' },
  { id: 'qwen/qwen3-235b-a22b:free',                    label: 'Titan-235B' },
  { id: 'meta-llama/llama-4-maverick:free',              label: 'Maverick-X' },
  { id: 'google/gemma-3-27b-it:free',                    label: 'Prism-27B' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct:free', label: 'Sirocco-24B' },
  { id: 'deepseek/deepseek-chat-v3-0324:free',           label: 'Abyss-V3' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free',        label: 'Apex-70B' },
  { id: 'google/gemma-3-12b-it:free',                    label: 'Nova-12B' },
];

const DEFAULT_MODEL = OPENROUTER_FREE_MODELS[0].id;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function buildSystemPrompt(profile, financialSummary) {
  const biz = BUSINESS_TYPES[profile.business_type];
  return `You are Agora AI, a friendly and practical business advisor for ${profile.business_name}, 
a ${biz?.label || profile.business_type} in ${profile.location || 'Southern Leyte, Philippines'}.

Your role is to give specific, actionable advice based on the owner's actual financial data.
Always respond in clear, simple English. Keep responses concise and practical.
Never give generic advice — always refer to the actual numbers provided.

Current business snapshot:
- Business type: ${biz?.label || profile.business_type}
- Total sales this month: ₱${(financialSummary.monthSales || 0).toLocaleString()}
- Total expenses this month: ₱${(financialSummary.monthExpenses || 0).toLocaleString()}
- Gross profit this month: ₱${((financialSummary.monthSales || 0) - (financialSummary.monthExpenses || 0)).toLocaleString()}
- Top selling items: ${(financialSummary.topItems || []).join(', ') || 'Not enough data yet'}
- Days of data available: ${financialSummary.dataAgeDays || 0}

Always end responses with one specific actionable tip the owner can do TODAY.`;
}

/**
 * Send a message to the AI and return the assistant's reply.
 * Routes through the Supabase Edge Function proxy in production.
 */
export async function sendAIMessage(userMessage, profile, financialSummary, selectedModel) {
  const model = selectedModel || DEFAULT_MODEL;
  const history = await getAIHistory();

  const messages = [
    { role: 'system', content: buildSystemPrompt(profile, financialSummary) },
    ...history
      .filter((h) => h?.role === 'user' || h?.role === 'assistant')
      .map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage },
  ];

  let reply;

  // ── Production path: proxy through Edge Function ──
  if (isSupabaseConfigured()) {
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ messages, model, max_tokens: 1024 }),
      }
    );

    if (!response.ok) {
      let message = 'AI request failed';
      try { const err = await response.json(); message = err?.error || message; } catch { /* ignore */ }
      throw new Error(message);
    }

    const data = await response.json();
    reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
  } else {
    // ── Development fallback: direct OpenRouter call ──
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured. Add VITE_OPENROUTER_API_KEY to your .env.local (for local dev only)');
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(import.meta.env.VITE_OPENROUTER_APP_URL ? { 'HTTP-Referer': import.meta.env.VITE_OPENROUTER_APP_URL } : {}),
        ...(import.meta.env.VITE_OPENROUTER_APP_NAME ? { 'X-Title': import.meta.env.VITE_OPENROUTER_APP_NAME } : {}),
      },
      body: JSON.stringify({ model, messages, max_tokens: 1024, temperature: 0.5 }),
    });

    if (!response.ok) {
      let message = 'AI request failed';
      try {
        const err = await response.json();
        message = err.error?.message || message;
      } catch {
        const raw = await response.text();
        if (raw) message = raw;
      }
      throw new Error(message);
    }

    const data = await response.json();
    reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
  }

  // Persist conversation to local IndexedDB history
  await saveAIMessage({ id: uuidv4(), role: 'user',      content: userMessage, created_at: new Date().toISOString() });
  await saveAIMessage({ id: uuidv4(), role: 'assistant', content: reply,       created_at: new Date().toISOString() });

  return reply;
}

export async function getInsightTeaser(financialSummary) {
  const teasers = [
    financialSummary.monthSales > 0 && `Your sales pattern suggests a growth opportunity on weekends`,
    financialSummary.topItems?.length > 0 && `${financialSummary.topItems[0]} could be priced higher based on demand`,
    `Your expense-to-revenue ratio has a specific recommendation`,
    `There's a pricing adjustment that could increase your profit by 15-20%`,
  ].filter(Boolean);
  return teasers[Math.floor(Math.random() * teasers.length)] || 'New business insights are ready for you';
}

export { clearAIHistory };
