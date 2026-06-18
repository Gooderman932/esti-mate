/**
 * Enhanced Storage utilities
 * 
 * Handles all local data persistence using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Estimate,
  Material,
  AppSettings,
  SubscriptionStatus,
  emptyBusiness,
} from '../types';

// Simple UUID generator that works in all environments
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Storage keys
const KEYS = {
  ESTIMATES: '@estimator_estimates',
  MATERIALS: '@estimator_materials',
  SETTINGS: '@estimator_settings',
  SUBSCRIPTION: '@estimator_subscription',
};

// ========== MATERIALS ==========

export async function getMaterials(): Promise<Material[]> {
  try {
    const json = await AsyncStorage.getItem(KEYS.MATERIALS);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    console.error('Error loading materials:', error);
    return [];
  }
}

export async function saveMaterials(materials: Material[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.MATERIALS, JSON.stringify(materials));
  } catch (error) {
    console.error('Error saving materials:', error);
    throw error;
  }
}

export async function addMaterial(material: Material): Promise<void> {
  const materials = await getMaterials();
  materials.unshift(material);
  await saveMaterials(materials);
}

export async function updateMaterial(updated: Material): Promise<void> {
  const materials = await getMaterials();
  const index = materials.findIndex(m => m.id === updated.id);
  if (index !== -1) {
    materials[index] = { ...updated, updatedAt: new Date().toISOString() };
    await saveMaterials(materials);
  }
}

export async function deleteMaterial(id: string): Promise<void> {
  const materials = await getMaterials();
  await saveMaterials(materials.filter(m => m.id !== id));
}

export async function getMaterialById(id: string): Promise<Material | null> {
  const materials = await getMaterials();
  return materials.find(m => m.id === id) || null;
}

// ========== ESTIMATES ==========

export async function getEstimates(): Promise<Estimate[]> {
  try {
    const json = await AsyncStorage.getItem(KEYS.ESTIMATES);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    console.error('Error loading estimates:', error);
    return [];
  }
}

export async function saveEstimates(estimates: Estimate[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.ESTIMATES, JSON.stringify(estimates));
  } catch (error) {
    console.error('Error saving estimates:', error);
    throw error;
  }
}

export async function addEstimate(estimate: Estimate): Promise<void> {
  const estimates = await getEstimates();
  estimates.unshift(estimate);
  await saveEstimates(estimates);
}

export async function updateEstimate(updated: Estimate): Promise<void> {
  const estimates = await getEstimates();
  const index = estimates.findIndex(e => e.id === updated.id);
  if (index !== -1) {
    estimates[index] = { ...updated, updatedAt: new Date().toISOString() };
    await saveEstimates(estimates);
  }
}

export async function deleteEstimate(id: string): Promise<void> {
  const estimates = await getEstimates();
  await saveEstimates(estimates.filter(e => e.id !== id));
}

export async function getEstimateById(id: string): Promise<Estimate | null> {
  const estimates = await getEstimates();
  return estimates.find(e => e.id === id) || null;
}

// ========== SETTINGS ==========

export async function getSettings(): Promise<AppSettings> {
  try {
    const json = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (json) {
      return JSON.parse(json);
    }
    // Create default settings with unique device ID
    const defaults: AppSettings = {
      business: emptyBusiness,
      defaultTaxRate: 0,
      nextEstimateNumber: 1,
      nextInvoiceNumber: 1,
      userId: generateId(),
    };
    await saveSettings(defaults);
    return defaults;
  } catch (error) {
    console.error('Error loading settings:', error);
    return {
      business: emptyBusiness,
      defaultTaxRate: 0,
      nextEstimateNumber: 1,
      nextInvoiceNumber: 1,
      userId: generateId(),
    };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

export async function getNextNumber(type: 'estimate' | 'invoice'): Promise<string> {
  const settings = await getSettings();
  let number: number;
  let prefix: string;
  
  if (type === 'estimate') {
    number = settings.nextEstimateNumber;
    prefix = 'EST';
    settings.nextEstimateNumber = number + 1;
  } else {
    number = settings.nextInvoiceNumber;
    prefix = 'INV';
    settings.nextInvoiceNumber = number + 1;
  }
  
  await saveSettings(settings);
  return `${prefix}-${number.toString().padStart(4, '0')}`;
}

// ========== SUBSCRIPTION ==========

export async function getSubscriptionStatus(): Promise<SubscriptionStatus | null> {
  try {
    const json = await AsyncStorage.getItem(KEYS.SUBSCRIPTION);
    return json ? JSON.parse(json) : null;
  } catch (error) {
    console.error('Error loading subscription:', error);
    return null;
  }
}

export async function saveSubscriptionStatus(status: SubscriptionStatus): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SUBSCRIPTION, JSON.stringify(status));
  } catch (error) {
    console.error('Error saving subscription:', error);
    throw error;
  }
}

// ========== UTILITIES ==========

export async function getActiveEstimatesCount(): Promise<number> {
  const estimates = await getEstimates();
  return estimates.filter(e => e.status !== 'paid').length;
}

// Count estimates + invoices created in the current calendar month (for tier limits)
export async function getDocumentsCreatedThisMonth(): Promise<number> {
  const estimates = await getEstimates();
  const now = new Date();
  return estimates.filter(e => {
    const created = new Date(e.createdAt);
    return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
  }).length;
}

// ========== CUSTOMERS ==========

import { Customer } from '../types';

const CUSTOMER_KEY = '@estimator_customers';

export async function getCustomers(): Promise<Customer[]> {
  try {
    const json = await AsyncStorage.getItem(CUSTOMER_KEY);
    const list: Customer[] = json ? JSON.parse(json) : [];
    return list.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error loading customers:', error);
    return [];
  }
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const customers = await getCustomers();
  return customers.find(c => c.id === id) ?? null;
}

// addCustomer accepts a full Customer object (id/createdAt/updatedAt supplied
// by the caller). For convenience it also accepts a partial without id and
// will fill in id+timestamps; this matches the two call sites in the app.
export async function addCustomer(customer: Customer): Promise<Customer>;
export async function addCustomer(
  data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Customer>;
export async function addCustomer(
  input: Customer | Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Customer> {
  const now = new Date().toISOString();
  const customer: Customer = 'id' in input && (input as Customer).id
    ? (input as Customer)
    : { ...(input as Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>), id: generateId(), createdAt: now, updatedAt: now };
  const customers = await getCustomers();
  customers.push(customer);
  await AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(customers));
  return customer;
}

// updateCustomer accepts either (id, patch) or a full Customer object whose
// id is used to locate the existing record.
export async function updateCustomer(
  idOrCustomer: string | Customer,
  patch?: Partial<Omit<Customer, 'id' | 'createdAt'>>,
): Promise<Customer | null> {
  const customers = await getCustomers();
  const id = typeof idOrCustomer === 'string' ? idOrCustomer : idOrCustomer.id;
  const patchObj = typeof idOrCustomer === 'string' ? patch ?? {} : idOrCustomer;
  const i = customers.findIndex(c => c.id === id);
  if (i === -1) return null;
  customers[i] = { ...customers[i], ...patchObj, id, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(customers));
  return customers[i];
}

export async function deleteCustomer(id: string): Promise<void> {
  const customers = await getCustomers();
  const filtered = customers.filter(c => c.id !== id);
  await AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(filtered));
}
