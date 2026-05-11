import { storage } from './storage';

export type HealthFlag = 'ok' | 'degraded' | 'offline' | 'blocked';
export type ErrorType = 'timeout' | 'offline' | 'blocked' | 'retry_exhausted' | 'unknown';

export interface ReliabilityError {
  type: ErrorType;
  message: string;
  cause?: unknown;
}

export interface ReliabilityResult<T> {
  ok: boolean;
  data?: T;
  error?: ReliabilityError;
  health: HealthFlag;
  source?: 'local' | 'cloud';
}

const TELEMETRY_KEY = 'agora_reliability_events';

type ReliabilityEvent = {
  op: string;
  type: ErrorType;
  health: HealthFlag;
  message: string;
  ts: string;
};

function parseTelemetry(raw: string | null): ReliabilityEvent[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function logReliabilityEvent(event: { op: string; type: ErrorType; health: HealthFlag; message: string }) {
  const safe: ReliabilityEvent = { ...event, ts: new Date().toISOString() };
  const parsed = parseTelemetry(await storage.getItem(TELEMETRY_KEY));
  parsed.push(safe);
  await storage.setItem(TELEMETRY_KEY, JSON.stringify(parsed.slice(-200)));
}

function timeoutPromise<T>(ms: number): Promise<T> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms));
}

export async function runReliable<T>(
  op: string,
  fn: () => Promise<T>,
  opts: { timeoutMs?: number; retries?: number; offline?: boolean; blocked?: boolean; fallback?: () => Promise<T> | T; source?: 'local' | 'cloud' } = {},
): Promise<ReliabilityResult<T>> {
  const timeoutMs = opts.timeoutMs ?? 5000;
  const retries = Math.max(0, opts.retries ?? 1);

  if (opts.blocked) {
    const error = { type: 'blocked' as const, message: `${op} blocked by mode` };
    await logReliabilityEvent({ op, type: error.type, health: 'blocked', message: error.message });
    return { ok: false, error, health: 'blocked', source: opts.source };
  }

  if (opts.offline && opts.fallback) {
    const data = await opts.fallback();
    return { ok: true, data, health: 'offline', source: 'local' };
  }

  for (let i = 0; i <= retries; i++) {
    try {
      const data = await Promise.race([fn(), timeoutPromise<T>(timeoutMs)]);
      return { ok: true, data, health: i === 0 ? 'ok' : 'degraded', source: opts.source };
    } catch (cause) {
      const isTimeout = cause instanceof Error && cause.message.includes('Timeout');
      if (i === retries) {
        if (opts.fallback) {
          const data = await opts.fallback();
          const health = opts.offline ? 'offline' : 'degraded';
          await logReliabilityEvent({ op, type: isTimeout ? 'timeout' : 'retry_exhausted', health, message: String((cause as any)?.message || cause) });
          return { ok: true, data, health, source: 'local' };
        }
        const error: ReliabilityError = { type: isTimeout ? 'timeout' : 'retry_exhausted', message: `${op} failed`, cause };
        await logReliabilityEvent({ op, type: error.type, health: 'degraded', message: String((cause as any)?.message || cause) });
        return { ok: false, error, health: 'degraded', source: opts.source };
      }
    }
  }

  return { ok: false, error: { type: 'unknown', message: `${op} failed` }, health: 'degraded', source: opts.source };
}
