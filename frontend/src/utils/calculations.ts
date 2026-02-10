/**
 * Financial calculations for estimates/invoices
 */

import { LineItem } from '../types';

/**
 * Calculate line item total (quantity × unit price)
 */
export function calculateLineTotal(item: LineItem): number {
  return item.quantity * item.unitPrice;
}

/**
 * Calculate subtotal (sum of all line item totals)
 */
export function calculateSubtotal(lineItems: LineItem[]): number {
  return lineItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);
}

/**
 * Calculate tax amount
 */
export function calculateTax(subtotal: number, taxRate: number): number {
  return subtotal * (taxRate / 100);
}

/**
 * Calculate grand total
 */
export function calculateGrandTotal(subtotal: number, taxAmount: number): number {
  return subtotal + taxAmount;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Format percentage for display
 */
export function formatPercentage(rate: number): string {
  return `${rate.toFixed(1)}%`;
}
