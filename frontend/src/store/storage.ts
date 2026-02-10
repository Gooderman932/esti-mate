/**
 * AsyncStorage utilities for persisting estimates and settings
 * 
 * All data is stored locally on device - no remote API calls
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Estimate, AppSettings, defaultSettings } from '../types';

// Storage keys
const STORAGE_KEYS = {
  ESTIMATES: '@docscanner_estimates',
  SETTINGS: '@docscanner_settings',
};

/**
 * Get all saved estimates from storage
 */
export async function getEstimates(): Promise<Estimate[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.ESTIMATES);
    if (json) {
      return JSON.parse(json);
    }
    return [];
  } catch (error) {
    console.error('Error loading estimates:', error);
    return [];
  }
}

/**
 * Save all estimates to storage
 */
export async function saveEstimates(estimates: Estimate[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ESTIMATES, JSON.stringify(estimates));
  } catch (error) {
    console.error('Error saving estimates:', error);
    throw error;
  }
}

/**
 * Add a new estimate
 */
export async function addEstimate(estimate: Estimate): Promise<void> {
  const estimates = await getEstimates();
  estimates.unshift(estimate); // Add to beginning
  await saveEstimates(estimates);
}

/**
 * Update an existing estimate
 */
export async function updateEstimate(updated: Estimate): Promise<void> {
  const estimates = await getEstimates();
  const index = estimates.findIndex(e => e.id === updated.id);
  if (index !== -1) {
    estimates[index] = { ...updated, updatedAt: new Date().toISOString() };
    await saveEstimates(estimates);
  }
}

/**
 * Delete an estimate
 */
export async function deleteEstimate(id: string): Promise<void> {
  const estimates = await getEstimates();
  const filtered = estimates.filter(e => e.id !== id);
  await saveEstimates(filtered);
}

/**
 * Get a single estimate by ID
 */
export async function getEstimateById(id: string): Promise<Estimate | null> {
  const estimates = await getEstimates();
  return estimates.find(e => e.id === id) || null;
}

/**
 * Get app settings
 */
export async function getSettings(): Promise<AppSettings> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (json) {
      return { ...defaultSettings, ...JSON.parse(json) };
    }
    return defaultSettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return defaultSettings;
  }
}

/**
 * Save app settings
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

/**
 * Get and increment the next estimate/invoice number
 */
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
