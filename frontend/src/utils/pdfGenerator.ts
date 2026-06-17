/**
 * PDF Generation with branding support
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Estimate, AppSettings, LineItem } from '../types';
import { calculateLineTotal, calculateSubtotal, calculateTax, calculateGrandTotal, formatCurrency } from './calculations';

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'paid': return '#34C759';
    case 'sent': return '#007AFF';
    case 'accepted': return '#5856D6';
    default: return '#666';
  }
}

export function generatePdfHtml(estimate: Estimate, settings: AppSettings, isPro: boolean): string {
  const { business } = settings;
  const { customer, lineItems } = estimate;
  
  const subtotal = calculateSubtotal(lineItems);
  const taxAmount = calculateTax(subtotal, estimate.taxRate);
  const grandTotal = calculateGrandTotal(subtotal, taxAmount);
  
  const logoHtml = isPro && business.logoBase64
    ? `<img src="${business.logoBase64}" style="max-width: 150px; max-height: 80px; margin-bottom: 10px;" />`
    : '';
  
  const lineItemsHtml = lineItems.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>
        <strong>${escapeHtml(item.description)}</strong>
        ${item.notes ? `<br><small style="color: #888;">${escapeHtml(item.notes)}</small>` : ''}
      </td>
      <td style="text-align: center;">${item.quantity} ${item.unit}</td>
      <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
      <td style="text-align: right;">${formatCurrency(calculateLineTotal(item))}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #333; padding: 40px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #007AFF; padding-bottom: 20px; }
        .header-left { flex: 1; }
        .header-right { text-align: right; flex: 1; }
        .doc-type { font-size: 28px; font-weight: bold; color: #007AFF; }
        .doc-number { font-size: 14px; color: #666; }
        .business-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
        .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .info-box { flex: 1; padding: 15px; background: #f8f9fa; border-radius: 8px; margin-right: 20px; }
        .info-box:last-child { margin-right: 0; }
        .info-label { font-size: 10px; text-transform: uppercase; color: #666; margin-bottom: 8px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background: #007AFF; color: white; padding: 12px 8px; text-align: left; font-size: 11px; }
        td { padding: 12px 8px; border-bottom: 1px solid #eee; }
        .totals { width: 300px; margin-left: auto; }
        .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .totals-row.grand { font-size: 16px; font-weight: bold; color: #007AFF; border-top: 2px solid #007AFF; border-bottom: none; margin-top: 8px; padding-top: 12px; }
        .notes { margin-top: 30px; padding: 15px; background: #fff8e1; border-radius: 8px; border-left: 4px solid #ffc107; }
        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          ${logoHtml}
          ${business.name ? `<div class="business-name">${escapeHtml(business.name)}</div>` : ''}
          ${business.address ? `<div>${escapeHtml(business.address)}</div>` : ''}
          ${business.phone ? `<div>${escapeHtml(business.phone)}</div>` : ''}
          ${business.email ? `<div>${escapeHtml(business.email)}</div>` : ''}
        </div>
        <div class="header-right">
          <div class="doc-type">${estimate.type === 'invoice' ? 'INVOICE' : 'ESTIMATE'}</div>
          <div class="doc-number">${estimate.number}</div>
          <div style="margin-top: 10px; color: #666;">Date: ${new Date(estimate.createdAt).toLocaleDateString()}</div>
        </div>
      </div>

      <div class="info-section">
        <div class="info-box">
          <div class="info-label">Bill To</div>
          ${customer.name ? `<strong>${escapeHtml(customer.name)}</strong><br>` : ''}
          ${customer.address ? `${escapeHtml(customer.address)}<br>` : ''}
          ${customer.phone ? `${escapeHtml(customer.phone)}<br>` : ''}
          ${customer.email || ''}
        </div>
        <div class="info-box">
          <div class="info-label">Status</div>
          <strong style="color: ${getStatusColor(estimate.status)};">${estimate.status.toUpperCase()}</strong>
        </div>
      </div>

      <table>
        <thead>
          <tr><th>#</th><th>Description</th><th style="text-align: center;">Qty</th><th style="text-align: right;">Unit Price</th><th style="text-align: right;">Amount</th></tr>
        </thead>
        <tbody>
          ${lineItemsHtml || '<tr><td colspan="5" style="text-align: center; color: #999;">No line items</td></tr>'}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
        ${estimate.taxRate > 0 ? `<div class="totals-row"><span>Tax (${estimate.taxRate}%)</span><span>${formatCurrency(taxAmount)}</span></div>` : ''}
        <div class="totals-row grand"><span>Total</span><span>${formatCurrency(grandTotal)}</span></div>
      </div>

      ${estimate.notes ? `<div class="notes"><strong>Notes:</strong><br>${escapeHtml(estimate.notes)}</div>` : ''}

      <div class="footer">Generated on ${new Date().toLocaleString()}</div>
    </body>
    </html>
  `;
}

export async function generatePdf(
  estimate: Estimate,
  settings: AppSettings,
  isPro: boolean = false,
): Promise<string> {
  try {
    const html = generatePdfHtml(estimate, settings, isPro);
    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error('Failed to generate PDF');
  }
}

export async function sharePdf(uri: string, estimate: Estimate): Promise<void> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing not available');
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share ${estimate.type === 'invoice' ? 'Invoice' : 'Estimate'} ${estimate.number}`,
    });
  } catch (error) {
    console.error('Sharing failed:', error);
    throw error;
  }
}

export async function printPdf(
  estimate: Estimate,
  settings: AppSettings,
  isPro: boolean = false,
): Promise<void> {
  try {
    const html = generatePdfHtml(estimate, settings, isPro);
    await Print.printAsync({ html });
  } catch (error) {
    console.error('Printing failed:', error);
    throw new Error('Failed to print');
  }
}

// Text export (always available)
export function generateTextExport(estimate: Estimate, settings: AppSettings): string {
  const { business } = settings;
  const { customer, lineItems } = estimate;
  
  const subtotal = calculateSubtotal(lineItems);
  const taxAmount = calculateTax(subtotal, estimate.taxRate);
  const grandTotal = calculateGrandTotal(subtotal, taxAmount);
  
  let text = '=' .repeat(50) + '\n';
  text += `           ${estimate.type === 'invoice' ? 'INVOICE' : 'ESTIMATE'}\n`;
  text += '=' .repeat(50) + '\n\n';
  
  if (business.name) text += `From: ${business.name}\n`;
  if (business.phone) text += `Phone: ${business.phone}\n`;
  if (business.email) text += `Email: ${business.email}\n`;
  text += `\nDocument: ${estimate.number}\n`;
  text += `Date: ${new Date(estimate.createdAt).toLocaleDateString()}\n\n`;
  
  if (customer.name) {
    text += 'Bill To:\n';
    text += `  ${customer.name}\n`;
    if (customer.address) text += `  ${customer.address}\n`;
    if (customer.phone) text += `  ${customer.phone}\n`;
    if (customer.email) text += `  ${customer.email}\n`;
    text += '\n';
  }
  
  text += '-'.repeat(50) + '\n';
  text += 'LINE ITEMS:\n';
  text += '-'.repeat(50) + '\n\n';
  
  lineItems.forEach((item, index) => {
    text += `${index + 1}. ${item.description}\n`;
    text += `   ${item.quantity} ${item.unit} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(calculateLineTotal(item))}\n`;
    if (item.notes) text += `   Note: ${item.notes}\n`;
    text += '\n';
  });
  
  text += '-'.repeat(50) + '\n';
  text += `Subtotal: ${formatCurrency(subtotal)}\n`;
  if (estimate.taxRate > 0) {
    text += `Tax (${estimate.taxRate}%): ${formatCurrency(taxAmount)}\n`;
  }
  text += `TOTAL: ${formatCurrency(grandTotal)}\n`;
  text += '=' .repeat(50) + '\n';
  
  if (estimate.notes) {
    text += `\nNotes: ${estimate.notes}\n`;
  }
  
  return text;
}
