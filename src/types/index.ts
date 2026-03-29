// ============================================================
// ESTI-MATE + PIXELMEASURE — Core Type Definitions
// Production-ready types aligned with Supabase schema (em_ tables)
// ============================================================

// ── Navigation ─────────────────────────────────────────────
export type PageView =
  | 'dashboard'
  | 'estimates'
  | 'estimate-editor'
  | 'invoices'
  | 'invoice-editor'
  | 'customers'
  | 'measure'
  | 'calibration'
  | 'history'
  | 'settings'
  | 'pricing';

// ── Customer ───────────────────────────────────────────────
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
  createdAt: string;
}

// ── Line Item (shared by Estimates & Invoices) ─────────────
export interface LineItem {
  id: string;
  description: string;
  type: 'labor' | 'material' | 'equipment' | 'other';
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  length?: number;
  height?: number;
  notes: string;
}

// ── Estimate ───────────────────────────────────────────────
export interface Estimate {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'invoiced';
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
}

// ── Invoice ────────────────────────────────────────────────
export interface Invoice {
  id: string;
  number: string;
  estimateId?: string;
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string;
  dueDate: string;
  paidDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Calibration Profile ────────────────────────────────────
export interface CalibrationProfile {
  id: string;
  name: string;
  focalLength: number;
  referenceWidth: number;
  referenceHeight?: number;
  calibrationDistance: number;
  isActive: boolean;
  createdAt: string;
}

// ── Measurement ────────────────────────────────────────────
export interface Measurement {
  id: string;
  distance: number;
  unit: 'metric' | 'imperial';
  confidence: number;
  profileId: string;
  profileName: string;
  pixelWidth: number;
  referenceWidth: number;
  note: string;
  timestamp: string;
}

// ── Measurement Stats (computed) ───────────────────────────
export interface MeasurementStats {
  count: number;
  average: number;
  min: number;
  max: number;
}

// ── App Settings ───────────────────────────────────────────
export interface AppSettings {
  unitSystem: 'metric' | 'imperial';
  showGrid: boolean;
  showGuides: boolean;
  darkMode: boolean;
  defaultTaxRate?: number;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyLogoUrl?: string;
  paymentInstructions?: string;
}
