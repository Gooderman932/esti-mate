// ============================================================
// ESTI-MATE — Default Data (Production)
// Empty arrays — all data comes from Supabase in production.
// These are ONLY used as fallbacks when Supabase is unreachable
// or during initial load before auth completes.
// ============================================================

import type {
  Customer,
  Estimate,
  Invoice,
  CalibrationProfile,
  Measurement,
} from '@/types';

export const sampleCustomers: Customer[] = [];
export const sampleEstimates: Estimate[] = [];
export const sampleInvoices: Invoice[] = [];
export const sampleCalibrationProfiles: CalibrationProfile[] = [];
export const sampleMeasurements: Measurement[] = [];
