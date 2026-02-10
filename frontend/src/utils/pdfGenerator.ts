/**
 * PDF Generation utility using expo-print
 * 
 * Generates professional invoice/estimate PDFs from HTML templates
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Estimate, AppSettings, LineItem } from '../types';
import { calculateLineTotal, calculateSubtotal, calculateTax, calculateGrandTotal, formatCurrency } from './calculations';

/**
 * Generate HTML template for PDF
 */
function generatePdfHtml(estimate: Estimate, settings: AppSettings): string {
  const { business } = settings;
  const { customer, lineItems, documentImage } = estimate;
  
  const subtotal = calculateSubtotal(lineItems);
  const taxAmount = calculateTax(subtotal, settings.taxRate);
  const grandTotal = calculateGrandTotal(subtotal, taxAmount);
  
  const lineItemsHtml = lineItems.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>
        <strong>${escapeHtml(item.description)}</strong>
        ${item.measurement ? `<br><small style="color: #666;">Measurement: ${escapeHtml(item.measurement)}</small>` : ''}
        ${item.notes ? `<br><small style="color: #888;">${escapeHtml(item.notes)}</small>` : ''}
      </td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
      <td style="text-align: right;">${formatCurrency(calculateLineTotal(item))}</td>
    </tr>
  `).join('');

  const documentImageHtml = documentImage?.correctedUri || documentImage?.uri
    ? `
      <div style="margin: 20px 0; text-align: center;">
        <p style="color: #666; margin-bottom: 10px;">Attached Document:</p>
        <img src="${documentImage.correctedUri || documentImage.uri}" 
             style="max-width: 100%; max-height: 300px; border: 1px solid #ddd; border-radius: 4px;" />
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
          font-size: 12px;
          line-height: 1.5;
          color: #333;
          padding: 40px;
        }
        .header { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #007AFF;
        }
        .header-left { flex: 1; }
        .header-right { 
          text-align: right;
          flex: 1;
        }
        .document-type {
          font-size: 28px;
          font-weight: bold;
          color: #007AFF;
          margin-bottom: 5px;
        }
        .document-number {
          font-size: 14px;
          color: #666;
        }
        .business-name {
          font-size: 18px;
          font-weight: bold;
          color: #333;
          margin-bottom: 5px;
        }
        .info-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .info-box {
          flex: 1;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          margin-right: 20px;
        }
        .info-box:last-child { margin-right: 0; }
        .info-label {
          font-size: 10px;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 8px;
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th {
          background: #007AFF;
          color: white;
          padding: 12px 8px;
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
        }
        th:first-child { border-radius: 4px 0 0 4px; width: 40px; }
        th:last-child { border-radius: 0 4px 4px 0; }
        td {
          padding: 12px 8px;
          border-bottom: 1px solid #eee;
          vertical-align: top;
        }
        tr:hover { background: #f8f9fa; }
        .totals {
          width: 300px;
          margin-left: auto;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .totals-row.grand-total {
          font-size: 16px;
          font-weight: bold;
          color: #007AFF;
          border-bottom: none;
          border-top: 2px solid #007AFF;
          padding-top: 12px;
          margin-top: 8px;
        }
        .notes {
          margin-top: 30px;
          padding: 15px;
          background: #fff8e1;
          border-radius: 8px;
          border-left: 4px solid #ffc107;
        }
        .notes-title {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          color: #999;
          font-size: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          ${business.name ? `<div class="business-name">${escapeHtml(business.name)}</div>` : ''}
          ${business.address ? `<div>${escapeHtml(business.address)}</div>` : ''}
          ${business.phone ? `<div>${escapeHtml(business.phone)}</div>` : ''}
          ${business.email ? `<div>${escapeHtml(business.email)}</div>` : ''}
        </div>
        <div class="header-right">
          <div class="document-type">${estimate.type === 'invoice' ? 'INVOICE' : 'ESTIMATE'}</div>
          <div class="document-number">${estimate.number}</div>
          <div style="margin-top: 10px; color: #666;">Date: ${new Date(estimate.createdAt).toLocaleDateString()}</div>
        </div>
      </div>

      <div class="info-section">
        <div class="info-box">
          <div class="info-label">Bill To</div>
          ${customer.name ? `<strong>${escapeHtml(customer.name)}</strong><br>` : ''}
          ${customer.address ? `${escapeHtml(customer.address)}<br>` : ''}
          ${customer.phone ? `${escapeHtml(customer.phone)}<br>` : ''}
          ${customer.email ? `${escapeHtml(customer.email)}` : ''}
        </div>
        <div class="info-box">
          <div class="info-label">Status</div>
          <strong style="color: ${getStatusColor(estimate.status)};">${estimate.status.toUpperCase()}</strong>
        </div>
      </div>

      ${documentImageHtml}

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml || '<tr><td colspan="5" style="text-align: center; color: #999;">No line items</td></tr>'}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row">
          <span>Subtotal</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>
        ${settings.taxRate > 0 ? `
        <div class="totals-row">
          <span>Tax (${settings.taxRate}%)</span>
          <span>${formatCurrency(taxAmount)}</span>
        </div>
        ` : ''}
        <div class="totals-row grand-total">
          <span>Total</span>
          <span>${formatCurrency(grandTotal)}</span>
        </div>
      </div>

      ${estimate.notes ? `
      <div class="notes">
        <div class="notes-title">Notes</div>
        ${escapeHtml(estimate.notes)}
      </div>
      ` : ''}

      <div class="footer">
        Generated on ${new Date().toLocaleString()}
      </div>
    </body>
    </html>
  `;
}

/**
 * Escape HTML special characters
 */
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

/**
 * Get color for status badge
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'paid': return '#34C759';
    case 'sent': return '#007AFF';
    case 'accepted': return '#5856D6';
    default: return '#666';
  }
}

/**
 * Generate PDF and return file URI
 */
export async function generatePdf(estimate: Estimate, settings: AppSettings): Promise<string> {
  try {
    const html = generatePdfHtml(estimate, settings);
    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}

/**
 * Share PDF using system share sheet
 */
export async function sharePdf(uri: string, estimate: Estimate): Promise<void> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }
    
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share ${estimate.type === 'invoice' ? 'Invoice' : 'Estimate'} ${estimate.number}`,
      UTI: 'com.adobe.pdf',
    });
  } catch (error) {
    console.error('Sharing failed:', error);
    throw error;
  }
}

/**
 * Print PDF directly
 */
export async function printPdf(estimate: Estimate, settings: AppSettings): Promise<void> {
  try {
    const html = generatePdfHtml(estimate, settings);
    await Print.printAsync({ html });
  } catch (error) {
    console.error('Printing failed:', error);
    throw new Error('Failed to print. Please try again.');
  }
}
