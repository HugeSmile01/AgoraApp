/**
 * db.ts  — Mobile-compatible data layer for Agora Business OS
 *
 * Original web version used IndexedDB via the `idb` library.
 * This version uses AsyncStorage (via the storage.ts adapter) which
 * works on iOS, Android, and Expo web.
 *
 * Public API is identical to the web db.js so all pages/hooks that
 * import from '@/lib/db' continue to work unchanged.
 */

import { createId } from '@/lib/id';
import { db as store } from './storage';

// ── Store names ─────────────────────────────────────────────────────────────
const STORES = {
  PROFILE:              'profile',
  PRODUCTS:             'products',
  TRANSACTIONS:         'transactions',
  EXPENSES:             'expenses',
  SYNC_QUEUE:           'sync_queue',
  AI_HISTORY:           'ai_history',
  NON_CONFORMANCES:     'non_conformances',
  CAPA_ACTIONS:         'capa_actions',
  QUALITY_EVENTS:       'quality_events',
  SOPS:                 'sops',
  SOP_CHANGE_CONTROLS:  'sop_change_controls',
  SOP_ACKNOWLEDGEMENTS: 'sop_acknowledgements',
  AUDIT_PLANS:          'audit_plans',
  AUDIT_CHECKLIST_TEMPLATES: 'audit_checklist_templates',
  AUDIT_FINDINGS:       'audit_findings',
  AUDIT_EVIDENCE:       'audit_evidence',
  SUPPLIER_ASL:         'supplier_asl',
  SUPPLIER_SCORECARDS:  'supplier_scorecards',
  SUPPLIER_INCOMING_INSPECTIONS: 'supplier_incoming_inspections',
  SUPPLIER_CAPA_REQUESTS: 'supplier_capa_requests',
  QUALITY_KPI_RECORDS:  'quality_kpi_records',
  CUSTOMER_FEEDBACK:    'customer_feedback',
  RISK_REGISTER:        'risk_register',
  FMEA:                 'fmea',
  TRAINING_ROLE_REQUIREMENTS: 'training_role_requirements',
  TRAINING_COMPETENCY:  'training_competency',
  CUSTOMERS:            'customers',
  WORKFLOWS:            'workflows',
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────
function now() { return new Date().toISOString(); }
function newId() { return createId(); }

// ── Profile ──────────────────────────────────────────────────────────────────
export async function getProfile() {
  const all = await store.getAll(STORES.PROFILE);
  return all[0] ?? null;
}

export async function saveProfile(profile: any) {
  const record = { ...profile, id: profile.id ?? 'profile', updated_at: now() };
  await store.put(STORES.PROFILE, record);
  return record;
}

// ── Products ─────────────────────────────────────────────────────────────────
export async function getAllProducts() {
  return store.getAll(STORES.PRODUCTS);
}

export async function getProductById(id: string) {
  return store.get(STORES.PRODUCTS, id);
}

export async function saveProduct(product: any) {
  const record = { ...product, id: product.id ?? newId(), updated_at: now() };
  await store.put(STORES.PRODUCTS, record);
  return record;
}

export async function deleteProduct(id: string) {
  return store.delete(STORES.PRODUCTS, id);
}

// ── Transactions ─────────────────────────────────────────────────────────────
export async function getAllTransactions() {
  return store.getAll(STORES.TRANSACTIONS);
}

export async function saveTransaction(tx: any) {
  const record = { ...tx, id: tx.id ?? newId(), updated_at: now() };
  await store.put(STORES.TRANSACTIONS, record);
  return record;
}

export async function deleteTransaction(id: string) {
  return store.delete(STORES.TRANSACTIONS, id);
}

// ── Expenses ─────────────────────────────────────────────────────────────────
export async function getAllExpenses() {
  return store.getAll(STORES.EXPENSES);
}

export async function saveExpense(expense: any) {
  const record = { ...expense, id: expense.id ?? newId(), updated_at: now() };
  await store.put(STORES.EXPENSES, record);
  return record;
}

export async function deleteExpense(id: string) {
  return store.delete(STORES.EXPENSES, id);
}

// ── Sync Queue ────────────────────────────────────────────────────────────────
export async function getSyncQueue() {
  return store.getAll(STORES.SYNC_QUEUE);
}

export async function addToSyncQueue(item: any) {
  const record = { ...item, id: item.id ?? newId(), attempts: 0, created_at: now() };
  await store.put(STORES.SYNC_QUEUE, record);
  return record;
}

export async function removeSyncQueueItem(id: string) {
  return store.delete(STORES.SYNC_QUEUE, id);
}

export async function incrementSyncAttempts(id: string, currentAttempts: number) {
  const item = await store.get(STORES.SYNC_QUEUE, id);
  if (item) await store.put(STORES.SYNC_QUEUE, { ...item, attempts: currentAttempts + 1 });
}

// ── AI History ────────────────────────────────────────────────────────────────
export async function getAIHistory() {
  return store.getAll(STORES.AI_HISTORY);
}

export async function saveAIMessage(message: any) {
  const record = { ...message, id: message.id ?? newId() };
  await store.put(STORES.AI_HISTORY, record);
  return record;
}

export async function clearAIHistory() {
  return store.clear(STORES.AI_HISTORY);
}

// ── Customers ─────────────────────────────────────────────────────────────────
export async function getAllCustomers() {
  return store.getAll(STORES.CUSTOMERS);
}

export async function saveCustomer(customer: any) {
  const record = { ...customer, id: customer.id ?? newId(), updated_at: now() };
  await store.put(STORES.CUSTOMERS, record);
  return record;
}

export async function deleteCustomer(id: string) {
  return store.delete(STORES.CUSTOMERS, id);
}

// ── Quality: Non-Conformances ─────────────────────────────────────────────────
export async function getAllNonConformances() {
  return store.getAll(STORES.NON_CONFORMANCES);
}

export async function saveNonConformance(nc: any) {
  const record = { ...nc, id: nc.id ?? newId(), updated_at: now() };
  await store.put(STORES.NON_CONFORMANCES, record);
  return record;
}

export async function deleteNonConformance(id: string) {
  return store.delete(STORES.NON_CONFORMANCES, id);
}

// ── Quality: CAPA ─────────────────────────────────────────────────────────────
export async function getAllCAPAActions() {
  return store.getAll(STORES.CAPA_ACTIONS);
}

export async function saveCAPA(capa: any) {
  const record = { ...capa, id: capa.id ?? newId(), updated_at: now() };
  await store.put(STORES.CAPA_ACTIONS, record);
  return record;
}

export async function deleteCAPA(id: string) {
  return store.delete(STORES.CAPA_ACTIONS, id);
}

// ── Quality: Events ───────────────────────────────────────────────────────────
export async function getQualityEventsByNC(ncId: string) {
  return store.getAllByIndex(STORES.QUALITY_EVENTS, 'non_conformance_id', ncId);
}

export async function saveQualityEvent(event: any) {
  const record = { ...event, id: event.id ?? newId() };
  await store.put(STORES.QUALITY_EVENTS, record);
  return record;
}

// ── SOPs ──────────────────────────────────────────────────────────────────────
export async function getAllSOPs() {
  return store.getAll(STORES.SOPS);
}

export async function saveSOP(sop: any) {
  const record = { ...sop, id: sop.id ?? newId(), updated_at: now() };
  await store.put(STORES.SOPS, record);
  return record;
}

export async function deleteSOP(id: string) {
  return store.delete(STORES.SOPS, id);
}

export async function saveSOPChangeControl(ctrl: any) {
  const record = { ...ctrl, id: ctrl.id ?? newId() };
  await store.put(STORES.SOP_CHANGE_CONTROLS, record);
  return record;
}

export async function saveSOPAcknowledgement(ack: any) {
  const record = { ...ack, id: ack.id ?? newId() };
  await store.put(STORES.SOP_ACKNOWLEDGEMENTS, record);
  return record;
}

// ── Audit ─────────────────────────────────────────────────────────────────────
export async function getAllAuditPlans() {
  return store.getAll(STORES.AUDIT_PLANS);
}

export async function saveAuditPlan(plan: any) {
  const record = { ...plan, id: plan.id ?? newId(), updated_at: now() };
  await store.put(STORES.AUDIT_PLANS, record);
  return record;
}

export async function saveAuditChecklistTemplate(tmpl: any) {
  const record = { ...tmpl, id: tmpl.id ?? newId() };
  await store.put(STORES.AUDIT_CHECKLIST_TEMPLATES, record);
  return record;
}

export async function saveAuditFinding(finding: any) {
  const record = { ...finding, id: finding.id ?? newId() };
  await store.put(STORES.AUDIT_FINDINGS, record);
  return record;
}

export async function saveAuditEvidence(evidence: any) {
  const record = { ...evidence, id: evidence.id ?? newId() };
  await store.put(STORES.AUDIT_EVIDENCE, record);
  return record;
}

// ── Suppliers ─────────────────────────────────────────────────────────────────
export async function getAllSupplierASL() {
  return store.getAll(STORES.SUPPLIER_ASL);
}

export async function saveSupplierASL(supplier: any) {
  const record = { ...supplier, id: supplier.id ?? newId(), updated_at: now() };
  await store.put(STORES.SUPPLIER_ASL, record);
  return record;
}

export async function saveSupplierScorecard(sc: any) {
  const record = { ...sc, id: sc.id ?? newId() };
  await store.put(STORES.SUPPLIER_SCORECARDS, record);
  return record;
}

export async function saveSupplierIncomingInspection(insp: any) {
  const record = { ...insp, id: insp.id ?? newId() };
  await store.put(STORES.SUPPLIER_INCOMING_INSPECTIONS, record);
  return record;
}

export async function saveSupplierCAPARequest(capa: any) {
  const record = { ...capa, id: capa.id ?? newId() };
  await store.put(STORES.SUPPLIER_CAPA_REQUESTS, record);
  return record;
}

// ── Quality KPI ───────────────────────────────────────────────────────────────
export async function getAllQualityKPIRecords() {
  return store.getAll(STORES.QUALITY_KPI_RECORDS);
}

export async function saveQualityKPIRecord(kpi: any) {
  const record = { ...kpi, id: kpi.id ?? newId() };
  await store.put(STORES.QUALITY_KPI_RECORDS, record);
  return record;
}

// ── Customer Feedback ─────────────────────────────────────────────────────────
export async function getAllCustomerFeedbackCases() {
  return store.getAll(STORES.CUSTOMER_FEEDBACK);
}

export async function saveCustomerFeedbackCase(fb: any) {
  const record = { ...fb, id: fb.id ?? newId(), updated_at: now() };
  await store.put(STORES.CUSTOMER_FEEDBACK, record);
  return record;
}

// ── Risk ──────────────────────────────────────────────────────────────────────
export async function getAllRiskRegisterItems() {
  return store.getAll(STORES.RISK_REGISTER);
}

export async function saveRiskRegisterItem(item: any) {
  const record = { ...item, id: item.id ?? newId(), updated_at: now() };
  await store.put(STORES.RISK_REGISTER, record);
  return record;
}

export async function saveFMEAEntry(fmea: any) {
  const record = { ...fmea, id: fmea.id ?? newId() };
  await store.put(STORES.FMEA, record);
  return record;
}

// ── Training ──────────────────────────────────────────────────────────────────
export async function getAllTrainingRoleRequirements() {
  return store.getAll(STORES.TRAINING_ROLE_REQUIREMENTS);
}

export async function saveTrainingRoleRequirement(req: any) {
  const record = { ...req, id: req.id ?? newId() };
  await store.put(STORES.TRAINING_ROLE_REQUIREMENTS, record);
  return record;
}

export async function getAllTrainingCompetencyRecords() {
  return store.getAll(STORES.TRAINING_COMPETENCY);
}

export async function saveTrainingCompetencyRecord(rec: any) {
  const record = { ...rec, id: rec.id ?? newId(), updated_at: now() };
  await store.put(STORES.TRAINING_COMPETENCY, record);
  return record;
}

// ── Workflows ─────────────────────────────────────────────────────────────────
export async function getAllWorkflows() {
  return store.getAll(STORES.WORKFLOWS);
}

export async function saveWorkflow(wf: any) {
  const record = { ...wf, id: wf.id ?? newId(), updated_at: now() };
  await store.put(STORES.WORKFLOWS, record);
  return record;
}
