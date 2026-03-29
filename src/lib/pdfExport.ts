import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Estimate, Invoice, Customer, LineItem } from '@/types';

// ── Color palette ──────────────────────────────────────────────────
const BRAND_ORANGE  = [249, 115, 22] as const;   // #f97316
const BRAND_AMBER   = [245, 158, 11] as const;   // #f59e0b
const DARK_SLATE    = [30, 41, 59] as const;      // #1e293b
const MID_SLATE     = [71, 85, 105] as const;     // #475569
const LIGHT_SLATE   = [148, 163, 184] as const;   // #94a3b8
const WHITE         = [255, 255, 255] as const;
const TABLE_HEADER  = [30, 41, 59] as const;
const TABLE_ALT_ROW = [241, 245, 249] as const;   // #f1f5f9
const GREEN         = [16, 185, 129] as const;
const RED           = [239, 68, 68] as const;
const BLUE          = [59, 130, 246] as const;
const PURPLE        = [139, 92, 246] as const;

// ── Helpers ────────────────────────────────────────────────────────
const fmt = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return iso; }
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function statusColor(status: string): readonly [number, number, number] {
  switch (status) {
    case 'approved': case 'paid':      return GREEN;
    case 'sent':                        return BLUE;
    case 'invoiced':                    return PURPLE;
    case 'rejected': case 'overdue':    return RED;
    case 'cancelled':                   return LIGHT_SLATE;
    default:                            return MID_SLATE;
  }
}

// ── Shared header renderer ─────────────────────────────────────────
function drawHeader(
  doc: jsPDF,
  docType: 'ESTIMATE' | 'INVOICE',
  docNumber: string,
  status: string,
  pageW: number,
  margin: number,
) {
  const contentW = pageW - margin * 2;

  // Orange accent bar at very top
  doc.setFillColor(...BRAND_ORANGE);
  doc.rect(0, 0, pageW, 4, 'F');

  // Brand block
  const logoY = 14;
  doc.setFillColor(...DARK_SLATE);
  doc.roundedRect(margin, logoY, 42, 42, 3, 3, 'F');
  doc.setFillColor(...BRAND_ORANGE);
  doc.roundedRect(margin + 8, logoY + 8, 26, 26, 2, 2, 'F');

  // Ruler icon (simplified SVG-like lines inside the orange square)
  doc.setDrawColor(...WHITE);
  doc.setLineWidth(1.2);
  doc.line(margin + 16, logoY + 14, margin + 26, logoY + 34);
  doc.line(margin + 16, logoY + 14, margin + 22, logoY + 14);
  doc.line(margin + 26, logoY + 34, margin + 20, logoY + 34);

  // Company name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...DARK_SLATE);
  doc.text('Esti-Mate', margin + 50, logoY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...LIGHT_SLATE);
  doc.text('Construction Estimating + PixelMeasure', margin + 50, logoY + 26);
  doc.text('Professional Field-Service Solutions', margin + 50, logoY + 33);

  // Document type & number — right side
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...BRAND_ORANGE);
  doc.text(docType, pageW - margin, logoY + 16, { align: 'right' });

  doc.setFontSize(11);
  doc.setTextColor(...MID_SLATE);
  doc.text(docNumber, pageW - margin, logoY + 26, { align: 'right' });

  // Status badge
  const sc = statusColor(status);
  const statusText = capitalize(status);
  const badgeW = doc.getTextWidth(statusText) + 12;
  const badgeX = pageW - margin - badgeW;
  const badgeY = logoY + 32;
  doc.setFillColor(sc[0], sc[1], sc[2]);
  doc.roundedRect(badgeX, badgeY, badgeW, 14, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text(statusText.toUpperCase(), badgeX + badgeW / 2, badgeY + 9.5, { align: 'center' });

  // Divider
  const divY = logoY + 52;
  doc.setDrawColor(...BRAND_ORANGE);
  doc.setLineWidth(0.6);
  doc.line(margin, divY, pageW - margin, divY);

  return divY + 6; // next Y position
}

// ── Info columns (customer + dates) ────────────────────────────────
function drawInfoColumns(
  doc: jsPDF,
  startY: number,
  customer: Customer | null,
  dates: { label: string; value: string }[],
  description: string,
  pageW: number,
  margin: number,
) {
  let y = startY;
  const colW = (pageW - margin * 2 - 12) / 2;

  // Left: Bill To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND_ORANGE);
  doc.text('BILL TO', margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...DARK_SLATE);
  y += 7;
  doc.text(customer?.name || 'No customer selected', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MID_SLATE);
  if (customer) {
    if (customer.email)   { y += 5; doc.text(customer.email, margin, y); }
    if (customer.phone)   { y += 5; doc.text(customer.phone, margin, y); }
    if (customer.address) { y += 5; doc.text(customer.address, margin, y); }
    if (customer.city)    { y += 5; doc.text(`${customer.city}, ${customer.state} ${customer.zip}`, margin, y); }
  }

  // Right: Dates
  let ry = startY;
  const rx = margin + colW + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND_ORANGE);
  doc.text('DETAILS', rx, ry);
  ry += 7;

  dates.forEach(d => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...LIGHT_SLATE);
    doc.text(d.label, rx, ry);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_SLATE);
    doc.text(d.value, rx + 55, ry);
    ry += 6;
  });

  const bottomY = Math.max(y, ry) + 4;

  // Description
  if (description) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...MID_SLATE);
    const lines = doc.splitTextToSize(description, pageW - margin * 2);
    doc.text(lines, margin, bottomY + 4);
    return bottomY + 4 + lines.length * 4.5 + 4;
  }

  return bottomY + 4;
}

// ── Line items table ───────────────────────────────────────────────
function drawLineItemsTable(
  doc: jsPDF,
  startY: number,
  lineItems: LineItem[],
  margin: number,
  pageW: number,
) {
  const body = lineItems.map((li, i) => [
    String(i + 1),
    li.description || '—',
    capitalize(li.type),
    li.quantity.toLocaleString('en-US'),
    li.unit,
    fmt(li.unitPrice),
    fmt(li.quantity * li.unitPrice),
  ]);

  autoTable(doc, {
    startY,
    margin: { left: margin, right: margin },
    head: [['#', 'Description', 'Type', 'Qty', 'Unit', 'Unit Price', 'Total']],
    body,
    theme: 'grid',
    headStyles: {
      fillColor: TABLE_HEADER as any,
      textColor: WHITE as any,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 4,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: DARK_SLATE as any,
      cellPadding: 3.5,
    },
    alternateRowStyles: {
      fillColor: TABLE_ALT_ROW as any,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 28 },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 28, halign: 'right' },
      6: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    styles: {
      lineColor: [226, 232, 240] as any,
      lineWidth: 0.3,
    },
    didParseCell: (data) => {
      // Bold the total column
      if (data.section === 'body' && data.column.index === 6) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  return (doc as any).lastAutoTable.finalY as number;
}

// ── Totals block ───────────────────────────────────────────────────
function drawTotals(
  doc: jsPDF,
  startY: number,
  subtotal: number,
  taxRate: number,
  taxAmount: number,
  total: number,
  pageW: number,
  margin: number,
) {
  const boxW = 120;
  const boxX = pageW - margin - boxW;
  let y = startY + 6;

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MID_SLATE);
  doc.text('Subtotal', boxX, y);
  doc.setTextColor(...DARK_SLATE);
  doc.text(fmt(subtotal), pageW - margin, y, { align: 'right' });
  y += 7;

  // Tax
  doc.setTextColor(...MID_SLATE);
  doc.text(`Tax (${taxRate}%)`, boxX, y);
  doc.setTextColor(...DARK_SLATE);
  doc.text(fmt(taxAmount), pageW - margin, y, { align: 'right' });
  y += 4;

  // Divider
  doc.setDrawColor(...LIGHT_SLATE);
  doc.setLineWidth(0.4);
  doc.line(boxX, y, pageW - margin, y);
  y += 7;

  // Total
  doc.setFillColor(...DARK_SLATE);
  doc.roundedRect(boxX - 4, y - 6, boxW + 8, 18, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...WHITE);
  doc.text('TOTAL', boxX + 2, y + 5);
  doc.text(fmt(total), pageW - margin - 2, y + 5, { align: 'right' });

  return y + 20;
}

// ── Notes section ──────────────────────────────────────────────────
function drawNotes(
  doc: jsPDF,
  startY: number,
  notes: string,
  pageW: number,
  margin: number,
) {
  if (!notes) return startY;

  let y = startY + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND_ORANGE);
  doc.text('NOTES', margin, y);
  y += 6;

  doc.setFillColor(248, 250, 252); // slate-50
  const lines = doc.splitTextToSize(notes, pageW - margin * 2 - 12);
  const boxH = lines.length * 4.5 + 10;
  doc.roundedRect(margin, y - 4, pageW - margin * 2, boxH, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MID_SLATE);
  doc.text(lines, margin + 6, y + 2);

  return y + boxH + 4;
}

// ── Footer ─────────────────────────────────────────────────────────
function drawFooter(doc: jsPDF, pageW: number, pageH: number, margin: number) {
  const y = pageH - 14;
  doc.setDrawColor(...TABLE_ALT_ROW);
  doc.setLineWidth(0.4);
  doc.line(margin, y - 4, pageW - margin, y - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...LIGHT_SLATE);
  doc.text('Generated by Esti-Mate + PixelMeasure', margin, y);
  doc.text(`Exported on ${fmtDate(new Date().toISOString())}`, pageW - margin, y, { align: 'right' });

  doc.setFontSize(6.5);
  doc.text('Construction Estimating & Camera-Based Distance Measurement', margin, y + 4);
  doc.text('www.esti-mate.app', pageW - margin, y + 4, { align: 'right' });
}

// ════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ════════════════════════════════════════════════════════════════════

export function exportEstimatePDF(estimate: Estimate, customer: Customer | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;

  let y = drawHeader(doc, 'ESTIMATE', estimate.number, estimate.status, pageW, margin);

  y = drawInfoColumns(doc, y, customer, [
    { label: 'Created', value: fmtDate(estimate.createdAt) },
    { label: 'Last Updated', value: fmtDate(estimate.updatedAt) },
    { label: 'Valid Until', value: fmtDate(estimate.validUntil) },
    { label: 'Line Items', value: String(estimate.lineItems.length) },
  ], estimate.description, pageW, margin);

  y = drawLineItemsTable(doc, y, estimate.lineItems, margin, pageW);
  y = drawTotals(doc, y, estimate.subtotal, estimate.taxRate, estimate.taxAmount, estimate.total, pageW, margin);
  y = drawNotes(doc, y, estimate.notes, pageW, margin);

  drawFooter(doc, pageW, pageH, margin);

  doc.save(`${estimate.number}_${estimate.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

export function exportInvoicePDF(invoice: Invoice, customer: Customer | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;

  let y = drawHeader(doc, 'INVOICE', invoice.number, invoice.status, pageW, margin);

  const dates: { label: string; value: string }[] = [
    { label: 'Created', value: fmtDate(invoice.createdAt) },
    { label: 'Due Date', value: fmtDate(invoice.dueDate) },
  ];
  if (invoice.paidDate) {
    dates.push({ label: 'Paid Date', value: fmtDate(invoice.paidDate) });
  }
  if (invoice.estimateId) {
    dates.push({ label: 'From Estimate', value: 'Yes' });
  }
  dates.push({ label: 'Line Items', value: String(invoice.lineItems.length) });

  y = drawInfoColumns(doc, y, customer, dates, invoice.description, pageW, margin);

  y = drawLineItemsTable(doc, y, invoice.lineItems, margin, pageW);
  y = drawTotals(doc, y, invoice.subtotal, invoice.taxRate, invoice.taxAmount, invoice.total, pageW, margin);
  y = drawNotes(doc, y, invoice.notes, pageW, margin);

  // Payment terms box for invoices
  if (invoice.status !== 'paid' && invoice.status !== 'cancelled') {
    const termsY = y + 2;
    doc.setFillColor(254, 243, 199); // amber-100
    doc.roundedRect(margin, termsY, pageW - margin * 2, 16, 2, 2, 'F');
    doc.setDrawColor(...BRAND_AMBER);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, termsY, pageW - margin * 2, 16, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(146, 64, 14); // amber-800
    doc.text('PAYMENT TERMS', margin + 6, termsY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Payment due by ${fmtDate(invoice.dueDate)}. Please reference invoice number ${invoice.number} with your payment.`, margin + 6, termsY + 12);
  }

  drawFooter(doc, pageW, pageH, margin);

  doc.save(`${invoice.number}_${invoice.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}
