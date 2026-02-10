/**
 * Type definitions for the Estimate/Invoice App
 * 
 * All data structures used throughout the application
 */

// A single line item on an estimate/invoice
export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  notes: string;
  measurement?: string; // Optional measurement from document scan
}

// Corner points for perspective correction
export interface Point {
  x: number;
  y: number;
}

// Document/image data with optional corner selection
export interface DocumentImage {
  uri: string; // Base64 URI of the image
  originalWidth: number;
  originalHeight: number;
  corners?: Point[]; // 4 corners for perspective correction [TL, TR, BR, BL]
  correctedUri?: string; // Base64 URI after perspective correction/crop
}

// Customer information
export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

// Business information (user's company)
export interface BusinessInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

// Complete estimate/invoice record
export interface Estimate {
  id: string;
  type: 'estimate' | 'invoice';
  number: string; // EST-001 or INV-001
  createdAt: string;
  updatedAt: string;
  customer: CustomerInfo;
  lineItems: LineItem[];
  documentImage?: DocumentImage;
  notes: string;
  status: 'draft' | 'sent' | 'accepted' | 'paid';
}

// App settings stored in AsyncStorage
export interface AppSettings {
  business: BusinessInfo;
  taxRate: number; // Percentage (e.g., 10 for 10%)
  nextEstimateNumber: number;
  nextInvoiceNumber: number;
}

// Default empty customer
export const emptyCustomer: CustomerInfo = {
  name: '',
  email: '',
  phone: '',
  address: '',
};

// Default empty business
export const emptyBusiness: BusinessInfo = {
  name: '',
  email: '',
  phone: '',
  address: '',
};

// Default settings
export const defaultSettings: AppSettings = {
  business: emptyBusiness,
  taxRate: 0,
  nextEstimateNumber: 1,
  nextInvoiceNumber: 1,
};
