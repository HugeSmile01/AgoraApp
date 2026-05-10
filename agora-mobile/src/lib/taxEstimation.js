// src/lib/taxEstimation.js
// Quarterly BIR tax estimation (Philippines) — Pro tier feature.
//
// Supports two entity types:
//   • individual   — BIR Form 1701Q (individual/sole proprietor)
//   • corporation  — BIR Form 1702Q (domestic corporation)
//
// IMPORTANT: This module provides estimates only and is NOT a substitute for
// professional tax advice. Users should consult a licensed accountant or tax
// consultant for their actual BIR filings.

// ── Income tax rate tables ──

/**
 * Philippine graduated income tax rates for individuals (TRAIN Law, 2023+)
 * Source: BIR Revenue Regulation No. 8-2018 / TRAIN Law RA 10963
 * @type {Array<{min: number, max: number|null, base: number, rate: number, description: string}>}
 */
export const INDIVIDUAL_TAX_BRACKETS = [
  { min:          0, max:    250_000, base:       0, rate: 0.00, description: '₱0 – ₱250,000: 0%' },
  { min:    250_001, max:    400_000, base:       0, rate: 0.15, description: '₱250,001 – ₱400,000: 15% of excess over ₱250,000' },
  { min:    400_001, max:    800_000, base:  22_500, rate: 0.20, description: '₱400,001 – ₱800,000: ₱22,500 + 20% of excess over ₱400,000' },
  { min:    800_001, max:  2_000_000, base: 102_500, rate: 0.25, description: '₱800,001 – ₱2,000,000: ₱102,500 + 25% of excess over ₱800,000' },
  { min:  2_000_001, max:  8_000_000, base: 402_500, rate: 0.30, description: '₱2,000,001 – ₱8,000,000: ₱402,500 + 30% of excess over ₱2,000,000' },
  { min:  8_000_001, max:        null, base: 2_202_500, rate: 0.35, description: 'Over ₱8,000,000: ₱2,202,500 + 35% of excess over ₱8,000,000' },
];

/** Corporate income tax rate (CIT) under CREATE Law RA 11534 (2023+) */
export const CORPORATE_TAX_RATE = 0.25;

/** Optional Minimum Corporate Income Tax (MCIT): 2% of gross income */
export const MCIT_RATE = 0.02;

/** Optional standard deduction for individuals (OSD): 40% of gross income */
export const OSD_RATE = 0.40;

/** Percentage Tax (PT) threshold — below this, apply 3% on gross receipts */
export const PT_THRESHOLD = 3_000_000;
export const PT_RATE       = 0.03;

/** VAT threshold and rate */
export const VAT_THRESHOLD = 3_000_000;
export const VAT_RATE       = 0.12;

// ── Utility helpers ──

/**
 * Apply Philippine graduated income tax brackets to annualised taxable income.
 * @param {number} annualisedIncome - Full-year taxable income in Philippine Peso
 * @returns {{ incomeTax: number, bracket: object }}
 */
export function computeGraduatedTax(annualisedIncome) {
  const bracket = INDIVIDUAL_TAX_BRACKETS.findLast(
    (b) => annualisedIncome >= b.min
  ) ?? INDIVIDUAL_TAX_BRACKETS[0];

  const excess    = annualisedIncome - (bracket.min - 1);
  const incomeTax = bracket.base + excess * bracket.rate;

  return { incomeTax: Math.max(0, incomeTax), bracket };
}

// ── Main estimator ──

/**
 * Estimate quarterly BIR tax liability.
 *
 * @param {object} params
 * @param {number}   params.quarterRevenue         Total gross receipts / sales for the quarter
 * @param {number}   params.quarterCOGS            Cost of goods sold for the quarter
 * @param {number}   params.quarterOperatingExpenses Operating expenses (excluding COGS) for the quarter
 * @param {number}   params.quarterNumber           1 | 2 | 3 | 4
 * @param {number}   params.priorQuartersTaxPaid    Cumulative income tax paid in previous quarters this year
 * @param {'individual'|'corporation'} params.entityType
 * @param {boolean}  [params.useOSD]                If true, use 40% OSD instead of itemised deductions (individual only)
 *
 * @returns {TaxEstimateResult}
 */
export function estimateQuarterlyTax({
  quarterRevenue,
  quarterCOGS,
  quarterOperatingExpenses,
  quarterNumber,
  priorQuartersTaxPaid = 0,
  entityType = 'individual',
  useOSD = false,
}) {
  const revenue  = Math.max(0, quarterRevenue            ?? 0);
  const cogs     = Math.max(0, quarterCOGS               ?? 0);
  const opex     = Math.max(0, quarterOperatingExpenses  ?? 0);
  const grossIncome = revenue - cogs;

  // ── Deductions ──
  let deductions;
  let deductionMethod;

  if (entityType === 'individual' && useOSD) {
    deductions     = grossIncome * OSD_RATE;
    deductionMethod = 'OSD (40% of gross income)';
  } else {
    deductions     = opex;
    deductionMethod = 'Itemised deductions (operating expenses)';
  }

  const taxableIncome = Math.max(0, grossIncome - deductions);

  // ── Annualise taxable income for graduated rate computation ──
  // BIR 1701Q uses cumulative/annualised income; for simplicity we annualise
  // the quarter's taxable income.
  const annualisedTaxableIncome = taxableIncome * 4;

  // ── Income tax ──
  let annualisedIncomeTax = 0;
  let effectiveRate       = 0;
  let bracketInfo         = null;

  if (entityType === 'individual') {
    const { incomeTax, bracket } = computeGraduatedTax(annualisedTaxableIncome);
    annualisedIncomeTax = incomeTax;
    bracketInfo         = bracket;
    effectiveRate       = annualisedTaxableIncome > 0
      ? incomeTax / annualisedTaxableIncome
      : 0;
  } else {
    // Corporation: flat CIT
    annualisedIncomeTax = annualisedTaxableIncome * CORPORATE_TAX_RATE;
    effectiveRate       = CORPORATE_TAX_RATE;

    // MCIT check: pay the higher of CIT or 2% of annual gross income
    const annualisedGrossIncome = grossIncome * 4;
    const mcit = annualisedGrossIncome * MCIT_RATE;
    if (mcit > annualisedIncomeTax) {
      annualisedIncomeTax = mcit;
      bracketInfo = { description: `MCIT applied: 2% of annual gross income ₱${annualisedGrossIncome.toLocaleString('en-PH')}` };
    }
  }

  // Pro-rate back to the quarter
  const quarterIncomeTax = annualisedIncomeTax / 4;
  const incomeTaxDue     = Math.max(0, quarterIncomeTax - priorQuartersTaxPaid);

  // ── Percentage Tax (for non-VAT registered with gross < ₱3M/year) ──
  const annualisedRevenue = revenue * 4;
  const isVatRegistered   = annualisedRevenue >= VAT_THRESHOLD;
  const isPtApplicable    = !isVatRegistered;
  const percentageTax     = isPtApplicable ? revenue * PT_RATE : 0;

  // ── Total estimated tax ──
  const totalTaxDue = incomeTaxDue + percentageTax;

  return {
    // Inputs (normalised)
    quarterRevenue:          revenue,
    quarterCOGS:             cogs,
    quarterOperatingExpenses: opex,
    grossIncome,
    deductions,
    deductionMethod,
    taxableIncome,

    // Income tax computation
    annualisedTaxableIncome,
    annualisedIncomeTax,
    effectiveRate,
    bracketInfo,
    quarterIncomeTax,
    priorQuartersTaxPaid,
    incomeTaxDue,

    // Percentage tax / VAT
    isVatRegistered,
    isPtApplicable,
    percentageTax,

    // Summary
    totalTaxDue,
    quarterNumber,
    entityType,
    birForm: entityType === 'individual' ? '1701Q' : '1702Q',

    disclaimer:
      'This is an estimate only. Consult a licensed accountant before filing. ' +
      'Actual tax may differ based on allowable deductions, tax credits, and other factors.',
  };
}

/**
 * Summarise full-year tax estimates from an array of quarterly results.
 * @param {TaxEstimateResult[]} quarters
 * @returns {object}
 */
export function annualTaxSummary(quarters) {
  const totalRevenue      = quarters.reduce((s, q) => s + q.quarterRevenue, 0);
  const totalGrossIncome  = quarters.reduce((s, q) => s + q.grossIncome, 0);
  const totalTaxableIncome = quarters.reduce((s, q) => s + q.taxableIncome, 0);
  const totalIncomeTaxPaid = quarters.reduce((s, q) => s + q.incomeTaxDue, 0);
  const totalPercentageTax = quarters.reduce((s, q) => s + q.percentageTax, 0);
  const totalTaxDue        = quarters.reduce((s, q) => s + q.totalTaxDue, 0);

  return {
    totalRevenue,
    totalGrossIncome,
    totalTaxableIncome,
    totalIncomeTaxPaid,
    totalPercentageTax,
    totalTaxDue,
    effectiveAnnualRate: totalTaxableIncome > 0 ? totalIncomeTaxPaid / totalTaxableIncome : 0,
  };
}

/**
 * @typedef {object} TaxEstimateResult
 * @property {number}  quarterRevenue
 * @property {number}  quarterCOGS
 * @property {number}  quarterOperatingExpenses
 * @property {number}  grossIncome
 * @property {number}  deductions
 * @property {string}  deductionMethod
 * @property {number}  taxableIncome
 * @property {number}  annualisedTaxableIncome
 * @property {number}  annualisedIncomeTax
 * @property {number}  effectiveRate
 * @property {object|null} bracketInfo
 * @property {number}  quarterIncomeTax
 * @property {number}  priorQuartersTaxPaid
 * @property {number}  incomeTaxDue
 * @property {boolean} isVatRegistered
 * @property {boolean} isPtApplicable
 * @property {number}  percentageTax
 * @property {number}  totalTaxDue
 * @property {number}  quarterNumber
 * @property {string}  entityType
 * @property {string}  birForm
 * @property {string}  disclaimer
 */
