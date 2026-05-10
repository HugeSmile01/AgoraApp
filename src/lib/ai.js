// src/lib/ai.js
// Free, local-first AI advisor for Agora Business OS.
//
// Security model:
//   • No client-side AI API keys are required.
//   • Advice is generated locally from the app's own financial data.
//   • Cloud features remain optional and are isolated to Supabase sync.

import { createId } from '@/lib/id';
import { BUSINESS_TYPES } from './constants';
import { clearAIHistory, getAIHistory, saveAIMessage } from './db';
import { runReliable } from './reliability';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function getBusinessLabel(profile) {
  const businessType = BUSINESS_TYPES[profile?.business_type] || BUSINESS_TYPES.general;
  return profile?.business_name || businessType.label || 'your business';
}

function getExpenseLeader(financialSummary) {
  const categories = financialSummary?.expenseByCategory || [];
  if (!categories.length) return null;
  return [...categories].sort((a, b) => Number(b.total || 0) - Number(a.total || 0))[0];
}

function getPerformanceSignals(financialSummary) {
  const sales = Number(financialSummary?.monthSales || 0);
  const expenses = Number(financialSummary?.monthExpenses || 0);
  const profit = sales - expenses;
  const margin = sales > 0 ? (profit / sales) * 100 : 0;
  const topItems = Array.isArray(financialSummary?.topItems) ? financialSummary.topItems : [];
  const lowData = Number(financialSummary?.dataAgeDays || 0) < 7;

  return {
    sales,
    expenses,
    profit,
    margin,
    topItems,
    lowData,
  };
}

function buildActionLine(intent, signals, financialSummary) {
  const topExpense = getExpenseLeader(financialSummary);
  const topItem = signals.topItems[0];

  if (intent === 'sales') {
    return topItem
      ? `Today, feature ${topItem} near the cashier or menu so it sells faster.`
      : 'Today, highlight your best-selling item with a small sign or bundle offer.';
  }

  if (intent === 'expenses') {
    return topExpense
      ? `Today, review ${topExpense.category} first and cut one non-essential cost there.`
      : 'Today, check one recurring expense and remove anything that is not driving sales.';
  }

  if (intent === 'cashflow') {
    return 'Today, separate your daily sales cash from personal spending before the day ends.';
  }

  if (intent === 'inventory') {
    return topItem
      ? `Today, restock ${topItem} before it sells out.`
      : 'Today, count the top 10 items and mark anything running low.';
  }

  if (intent === 'utang') {
    return 'Today, list every credit customer and follow up on the oldest unpaid balance first.';
  }

  if (signals.margin < 10 && signals.sales > 0) {
    return 'Today, raise prices on one fast-moving item by a small amount and watch the effect.';
  }

  if (signals.margin >= 10) {
    return 'Today, keep the same selling rhythm and record which items bring the best margin.';
  }

  return "Today, record every sale and expense so tomorrow's advice becomes sharper.";
}

function detectIntent(message) {
  const text = normalizeText(message);
  if (!text) return 'general';
  if (/(utang|credit|collect|receiv|unpaid)/.test(text)) return 'utang';
  if (/(stock|inventory|restock|supply|low stock)/.test(text)) return 'inventory';
  if (/(expense|cost|reduce|spend|save)/.test(text)) return 'expenses';
  if (/(cash flow|cashflow|money|profit|margin|earn)/.test(text)) return 'cashflow';
  if (/(sale|sell|customer|product|item|menu|promote)/.test(text)) return 'sales';
  return 'general';
}




function inferWorkflowContext(message) {
  const text = normalizeText(message);
  if (/(login|auth|account|session)/.test(text)) return 'auth';
  if (/(offline|libre|local|sync|cloud)/.test(text)) return 'offline';
  if (/(dashboard|summary|kpi|report)/.test(text)) return 'insights';
  if (/(invoice|payment|collect|utang)/.test(text)) return 'collections';
  return 'general';
}

function buildWorkflowCue(workflow, intent) {
  const cues = {
    auth: 'Workflow cue: keep account access simple and avoid repeated sign-in friction.',
    offline: 'Workflow cue: continue locally first, then schedule cloud handoff when internet is stable.',
    insights: 'Workflow cue: prioritize one metric and one action for today to avoid overload.',
    collections: 'Workflow cue: contact highest-risk unpaid customer before closing hours.',
    general: 'Workflow cue: convert advice into a single logged task so progress is visible tomorrow.',
  };
  if (intent === 'utang') return cues.collections;
  return cues[workflow] || cues.general;
}

function sanitizeInput(message) {
  return String(message || '').replace(/[<>`]/g, '').slice(0, 500);
}

function constrainOutput(text) {
  const safe = String(text || '').replace(/guarantee|certain|always profitable/gi, 'likely');
  return `${safe}

Safety note: This is operational guidance, not a guaranteed outcome.`;
}

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
 * Generates a free local response from the app's own financial data.
 */
export async function sendAIMessage(userMessage, profile, financialSummary, options = { cloudAssist: false, offline: false }) {
  const sanitizedMessage = sanitizeInput(userMessage);
  const history = await getAIHistory();
  const signals = getPerformanceSignals(financialSummary);
  const intent = detectIntent(sanitizedMessage);
  const businessLabel = getBusinessLabel(profile);
  const workflow = inferWorkflowContext(sanitizedMessage);
  const recentContext = history
    .filter((item) => item?.role === 'assistant')
    .slice(-1)[0]?.content;

  const summaryLine = signals.sales > 0
    ? `${businessLabel} made ${formatCurrency(signals.sales)} in sales and ${formatCurrency(signals.expenses)} in expenses this month.`
    : `${businessLabel} is ready for its first sales record. Start by logging today's revenue and expenses.`;

  const statusLine = signals.sales > 0
    ? `Gross profit is ${formatCurrency(signals.profit)} with an estimated margin of ${Math.max(0, signals.margin).toFixed(1)}%.`
    : 'Once you record a few sales, I can give you sharper recommendations.';

  const topItemLine = signals.topItems.length > 0
    ? `Top item: ${signals.topItems.join(', ')}.`
    : 'No top items yet, so the app will focus on margins and expense control.';

  const expenseLine = getExpenseLeader(financialSummary)
    ? `Largest expense bucket: ${getExpenseLeader(financialSummary).category}.`
    : 'No expense category is dominating yet.';

  const intentLines = {
    sales: 'You asked about sales growth, so I am focusing on your best movers and conversion hints.',
    expenses: 'You asked about costs, so I am focusing on spend control and waste reduction.',
    cashflow: 'You asked about cash flow, so I am focusing on money movement and profit retention.',
    inventory: 'You asked about inventory, so I am focusing on stock availability and restocking.',
    utang: 'You asked about utang, so I am focusing on collections and unpaid balances.',
    general: 'I am using your latest business data to keep the advice practical and local.',
  };

  const sourceLabel = options.cloudAssist && !options.offline ? 'Cloud-assisted' : 'Local-only';
  const reply = [
    `Source of advice: ${sourceLabel}.`,
    `Here is a simple update for ${businessLabel}.`,
    summaryLine,
    statusLine,
    topItemLine,
    expenseLine,
    intentLines[intent],
    buildWorkflowCue(workflow, intent),
    recentContext ? `Previous note: ${recentContext}` : null,
    buildActionLine(intent, signals, financialSummary),
  ].filter(Boolean).join('\n\n');

  // Persist conversation to local IndexedDB history
  await saveAIMessage({ id: createId(), role: 'user',      content: sanitizedMessage, created_at: new Date().toISOString() });
  const constrained = constrainOutput(reply);
  await saveAIMessage({ id: createId(), role: 'assistant', content: constrained,       created_at: new Date().toISOString() });

  const localResult = await runReliable('local_ai_reply', async () => constrained, { timeoutMs: 1200, retries: 0, offline: options.offline, fallback: () => constrained, source: 'local' });
  return localResult.data || constrained;
}

export async function getInsightTeaser(financialSummary) {
  const signals = getPerformanceSignals(financialSummary);
  const teasers = [
    signals.sales > 0 && `Sales are active. A small bundle or add-on offer could lift profit today.`,
    signals.topItems?.length > 0 && `${signals.topItems[0]} is a strong seller. Keep it visible and easy to find.`,
    getExpenseLeader(financialSummary) && `Your biggest expense is ${getExpenseLeader(financialSummary).category}. There may be room to trim it.`,
    signals.margin > 0 && `Your estimated margin is ${Math.max(0, signals.margin).toFixed(1)}%. Track which items beat that average.`,
  ].filter(Boolean);
  return teasers[Math.floor(Math.random() * teasers.length)] || 'New business insights are ready for you';
}

export { clearAIHistory };
