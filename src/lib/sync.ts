/**
 * sync.ts — Cloud sync for Cloud/Pro tier users
 *
 * Functionally identical to the web sync.js.
 * Uses the mobile db.ts (AsyncStorage-backed) instead of IndexedDB.
 * All Supabase calls are the same.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import {
  getSyncQueue, removeSyncQueueItem, incrementSyncAttempts,
  saveTransaction, deleteTransaction, saveExpense, saveProduct, deleteProduct, deleteExpense,
  saveNonConformance, saveCAPA, saveQualityEvent,
  saveSOP, saveSOPChangeControl, saveSOPAcknowledgement,
  saveAuditPlan, saveAuditFinding, saveAuditEvidence,
  saveSupplierASL, saveSupplierScorecard,
  saveSupplierIncomingInspection, saveSupplierCAPARequest,
  saveQualityKPIRecord, saveCustomerFeedbackCase,
  saveRiskRegisterItem, saveFMEAEntry,
  saveTrainingRoleRequirement, saveTrainingCompetencyRecord, saveProfile,
} from './db';
import { runReliable } from './reliability';

const MAX_ATTEMPTS = 5;

export async function runSyncQueue() {
  if (!isSupabaseConfigured() || !supabase) return { pushed: 0, failed: 0 };
  const sb = supabase!;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return { pushed: 0, failed: 0 };

  const queue = await getSyncQueue();
  let pushed = 0, failed = 0;

  for (const item of queue) {
    if (item.attempts >= MAX_ATTEMPTS) { failed++; continue; }
    try {
      switch (item.operation) {
        case 'upsert': {
          const upsertRes = await runReliable(`sync_upsert_${item.table_name}`, async () => {
            const { error } = await sb.from(item.table_name).upsert(item.payload);
            if (error) throw error;
            return true;
          }, { timeoutMs: 6000, retries: 2, source: 'cloud' });
          if (!upsertRes.ok) throw upsertRes.error;
          break;
        }
        case 'delete': {
          const delRes = await runReliable(`sync_delete_${item.table_name}`, async () => {
            const { error } = await sb.from(item.table_name).delete().eq('id', item.record_id);
            if (error) throw error;
            return true;
          }, { timeoutMs: 6000, retries: 2, source: 'cloud' });
          if (!delRes.ok) throw delRes.error;
          break;
        }
        default:
          throw new Error(`Unsupported sync operation: ${item.operation}`);
      }
      await removeSyncQueueItem(item.id);
      pushed++;
    } catch (err) {
      console.warn(`Sync failed for ${item.table_name}:${item.record_id}`, err);
      await incrementSyncAttempts(item.id, item.attempts);
      failed++;
    }
  }

  return { pushed, failed };
}

export async function pullFromCloud(_userId: string | null) {
  if (!isSupabaseConfigured() || !supabase) return;
  const sb = supabase!;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;

  const userId = _userId ?? session.user.id;

  const tables: [string, (r: any) => Promise<any>][] = [
    ['profiles', saveProfile],
    ['products', saveProduct],
    ['transactions', saveTransaction],
    ['expenses', saveExpense],
    ['non_conformances', saveNonConformance],
    ['capa_actions', saveCAPA],
    ['quality_events', saveQualityEvent],
    ['sops', saveSOP],
    ['sop_change_controls', saveSOPChangeControl],
    ['sop_acknowledgements', saveSOPAcknowledgement],
    ['audit_plans', saveAuditPlan],
    ['audit_findings', saveAuditFinding],
    ['audit_evidence', saveAuditEvidence],
    ['supplier_asl', saveSupplierASL],
    ['supplier_scorecards', saveSupplierScorecard],
    ['supplier_incoming_inspections', saveSupplierIncomingInspection],
    ['supplier_capa_requests', saveSupplierCAPARequest],
    ['quality_kpi_records', saveQualityKPIRecord],
    ['customer_feedback', saveCustomerFeedbackCase],
    ['risk_register', saveRiskRegisterItem],
    ['fmea', saveFMEAEntry],
    ['training_role_requirements', saveTrainingRoleRequirement],
    ['training_competency', saveTrainingCompetencyRecord],
  ];

  for (const [table, saveFn] of tables) {
    try {
      const { data } = await sb.from(table).select('*').eq('user_id', userId);
      if (data) {
        for (const row of data) await saveFn(row);
      }
    } catch (err) {
      console.warn(`Pull failed for ${table}:`, err);
    }
  }
}
