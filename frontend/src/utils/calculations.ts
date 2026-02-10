/**
 * Financial calculations
 */

import { LineItem } from '../types';

export function calculateLineTotal(item: LineItem): number {
  return item.quantity * item.unitPrice;
}

export function calculateSubtotal(lineItems: LineItem[]): number {
  return lineItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);
}

export function calculateTax(subtotal: number, taxRate: number): number {
  return subtotal * (taxRate / 100);
}

export function calculateGrandTotal(subtotal: number, taxAmount: number): number {
  return subtotal + taxAmount;
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatPercentage(rate: number): string {
  return `${rate.toFixed(1)}%`;
}
