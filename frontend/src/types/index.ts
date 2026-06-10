/**
 * Enhanced Types for Construction Estimator App
 * 
 * Includes Materials Catalog, Estimates, and Subscription types
 */

// Material in the catalog
export interface Material {
  id: string;
  name: string;
  category: string;
  unit: string; // e.g., "sq ft", "linear ft", "each", "bundle"
  pricePerUnit: number;
  notes: string;
  storeLink?: string; // Optional URL to Lowe's, Home Depot, etc.
  createdAt: string;
  updatedAt: string;
}

// Point on a captured document image
export interface Point {
  x: number;
  y: number;
}

// Scanned/photographed document attached to an estimate
export interface DocumentImage {
  uri: string;
  correctedUri?: string;
  corners?: Point[];
  originalWidth: number;
  originalHeight: number;
}

// Line item on an estimate/invoice
export interface LineItem {
  id: string;
  materialId?: string; // Reference to material, or null for custom
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  notes: string;
  measurement?: string; // From Auto Measure (e.g. "12.5 ft x 8 ft")
}

// Customer information
export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

// Business information
export interface BusinessInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  logoBase64?: string; // Pro feature
}

// Complete estimate/invoice
export interface Estimate {
  id: string;
  type: 'estimate' | 'invoice';
  number: string;
  createdAt: string;
  updatedAt: string;
  customer: CustomerInfo;
  lineItems: LineItem[];
  notes: string;
  status: 'draft' | 'sent' | 'accepted' | 'paid';
  taxRate: number; // Per-document tax rate
  documentImage?: DocumentImage | null;
}

// Subscription tiers
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

// Google Play subscription product IDs (must match Play Console)
export const GOOGLE_PLAY_PRODUCT_IDS: Record<'pro' | 'enterprise', string> = {
  pro: 'pro_monthly',
  enterprise: 'enterprise_monthly',
};

export const TIER_FOR_PRODUCT_ID: Record<string, SubscriptionTier> = {
  pro_monthly: 'pro',
  enterprise_monthly: 'enterprise',
};

// Per-tier entitlements. maxDocumentsPerMonth null = unlimited
export const TIER_LIMITS: Record<SubscriptionTier, { maxDocumentsPerMonth: number | null; canUploadLogo: boolean }> = {
  free: { maxDocumentsPerMonth: 3, canUploadLogo: false },
  pro: { maxDocumentsPerMonth: 15, canUploadLogo: false },
  enterprise: { maxDocumentsPerMonth: null, canUploadLogo: true },
};

// Display prices (fallback when Play Store prices unavailable)
export const TIER_PRICES: Record<'pro' | 'enterprise', string> = {
  pro: '$29.99',
  enterprise: '$99.00',
};

// Subscription status
export interface SubscriptionStatus {
  userId: string;
  isPro: boolean;
  tier?: SubscriptionTier;
  billingSource?: 'stripe' | 'google_play';
  subscriptionId?: string;
  status: 'none' | 'active' | 'canceled' | 'past_due';
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
}

// App settings
export interface AppSettings {
  business: BusinessInfo;
  defaultTaxRate: number;
  nextEstimateNumber: number;
  nextInvoiceNumber: number;
  userId: string; // Device ID for subscription tracking
}

// Material categories
export const MATERIAL_CATEGORIES = [
  'Lumber',
  'Drywall',
  'Roofing',
  'Flooring',
  'Plumbing',
  'Electrical',
  'Paint',
  'Hardware',
  'Concrete',
  'Insulation',
  'Siding',
  'Windows & Doors',
  'HVAC',
  'Landscaping',
  'Other',
];

// Material units
export const MATERIAL_UNITS = [
  'each',
  'sq ft',
  'linear ft',
  'bundle',
  'roll',
  'gallon',
  'bag',
  'box',
  'sheet',
  'piece',
  'yard',
  'ton',
  'hour',
];

// Default empty values
export const emptyCustomer: CustomerInfo = {
  name: '',
  email: '',
  phone: '',
  address: '',
};

export const emptyBusiness: BusinessInfo = {
  name: '',
  email: '',
  phone: '',
  address: '',
};

// Free tier limits (legacy alias, prefer TIER_LIMITS)
export const FREE_TIER_LIMITS = {
  maxActiveEstimates: 3,
  canUploadLogo: false,
};
