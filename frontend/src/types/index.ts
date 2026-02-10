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

// Line item on an estimate/invoice
export interface LineItem {
  id: string;
  materialId?: string; // Reference to material, or null for custom
  description: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  notes: string;
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
}

// Subscription status
export interface SubscriptionStatus {
  userId: string;
  isPro: boolean;
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

// Free tier limits
export const FREE_TIER_LIMITS = {
  maxActiveEstimates: 5,
  canUploadLogo: false,
};
