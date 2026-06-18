/**
 * Enhanced Types for Construction Estimator App
 *
 * Includes Materials Catalog, Estimates, Subscription, and image/measurement types.
 */

// 2-D point used for corner selection and on-image measurement overlays
export interface Point {
  x: number;
  y: number;
}

// Captured/imported document image + optional perspective-corrected variant
export interface DocumentImage {
  uri: string;
  correctedUri?: string;
  corners?: Point[];
  width?: number;
  height?: number;
  originalWidth?: number;
  originalHeight?: number;
  capturedAt?: string;
}

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

// Line item on an estimate/invoice
export interface LineItem {
  id: string;
  materialId?: string; // Reference to material, or null for custom
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  notes: string;
  // Optional human-readable measurement string captured from the overlay tool
  // (e.g. "12'6\" x 8'0\" = 100 sq ft"). Optional so legacy items remain valid.
  measurement?: string;
}

// Persistent customer record stored in the local customer book. CustomerInfo
// below is the snapshot copied onto an individual estimate.
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
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
  // Optional photo/scan attached to the estimate (e.g. site photo, sketch)
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
