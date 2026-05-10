/**
 * notifications.ts — Mobile-compatible notifications
 *
 * Replaces the browser Notification API with expo-notifications.
 * Keeps the same public API as the web version.
 */

import * as ExpoNotifications from 'expo-notifications';
import { storage } from './storage';

const PREFS_KEY = 'agora_notification_prefs';
const LAST_NOTIFIED_KEY = 'agora_last_notified';

export interface NotificationPrefs {
  enabled: boolean;
  lowStock: boolean;
  syncReminder: boolean;
  dailySummary: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  enabled: false,
  lowStock: true,
  syncReminder: true,
  dailySummary: true,
};

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const raw = await storage.getItem(PREFS_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* ignore */ }
  }
  return DEFAULT_PREFS;
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  await storage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function isNotificationSupported(): boolean {
  return true; // Always supported on native
}

export async function requestNotificationPermission(): Promise<string> {
  const { status } = await ExpoNotifications.requestPermissionsAsync();
  return status; // 'granted' | 'denied' | 'undetermined'
}

async function sendNotification(title: string, body: string): Promise<void> {
  const prefs = await getNotificationPrefs();
  if (!prefs.enabled) return;

  const { status } = await ExpoNotifications.getPermissionsAsync();
  if (status !== 'granted') return;

  await ExpoNotifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null, // immediate
  });
}

export async function checkAndNotifyLowStock(products: any[]): Promise<void> {
  const prefs = await getNotificationPrefs();
  if (!prefs.enabled || !prefs.lowStock) return;

  const lastRaw = await storage.getItem(LAST_NOTIFIED_KEY + '_lowstock');
  const lastNotified = lastRaw ? new Date(lastRaw) : null;
  const now = new Date();

  // Throttle: once per hour
  if (lastNotified && now.getTime() - lastNotified.getTime() < 60 * 60 * 1000) return;

  const low = products.filter(
    p => p.track_stock && Number(p.stock ?? 0) <= Number(p.low_stock_threshold ?? 5)
  );

  if (low.length === 0) return;

  await storage.setItem(LAST_NOTIFIED_KEY + '_lowstock', now.toISOString());

  if (low.length === 1) {
    await sendNotification('Low Stock Alert', `${low[0].name} is running low (${low[0].stock} left).`);
  } else {
    await sendNotification('Low Stock Alert', `${low.length} products are running low on stock.`);
  }
}

export async function sendDailySummaryNotification(totalSales: number, txCount: number): Promise<void> {
  const prefs = await getNotificationPrefs();
  if (!prefs.enabled || !prefs.dailySummary) return;

  const lastRaw = await storage.getItem(LAST_NOTIFIED_KEY + '_daily');
  const today = new Date().toISOString().split('T')[0];
  if (lastRaw === today) return;

  await storage.setItem(LAST_NOTIFIED_KEY + '_daily', today);

  const formatted = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(totalSales);
  await sendNotification(
    "Today's Summary",
    `${txCount} transaction${txCount !== 1 ? 's' : ''} totalling ${formatted}.`
  );
}
