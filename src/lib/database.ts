// ============================================================
// ESTI-MATE — Supabase Data Access Layer
// All database CRUD operations with type mapping
// ============================================================

import { supabase } from './supabase';
import { incrementUsage, PLAN_LIMITS, PlanType } from './subscription';
import type {
  Customer,
  Estimate,
  Invoice,
  LineItem,
  CalibrationProfile,
  Measurement,
  AppSettings,
} from '@/types';

// ── Limit Enforcement ──────────────────────────────────────

export class LimitExceededError extends Error {
  constructor(public feature: string, public limit: number, public plan: string) {
    super(`${feature} limit reached (${limit}/${plan} plan). Please upgrade.`);
    this.name = 'LimitExceededError';
  }
}

async function getUserPlanAndUsage(userId: string): Promise<{
  plan: PlanType;
  estimatesThisMonth: number;
  invoicesThisMonth: number;
  measurementsThisMonth: number;
}> {
  const { data } = await supabase
    .from('em_subscriptions')
    .select('plan, estimates_this_month, invoices_this_month, measurements_this_month')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    plan: (data?.plan || 'free') as PlanType,
    estimatesThisMonth: data?.estimates_this_month || 0,
    invoicesThisMonth: data?.invoices_this_month || 0,
    measurementsThisMonth: data?.measurements_this_month || 0,
  };
}

async function enforceLimit(
  userId: string,
  feature: 'estimates' | 'invoices' | 'measurements'
): Promise<void> {
  const usage = await getUserPlanAndUsage(userId);
  const limits = PLAN_LIMITS[usage.plan];

  const fieldMap = {
    estimates: { used: usage.estimatesThisMonth, limit: limits.estimatesPerMonth, label: 'Estimates' },
    invoices: { used: usage.invoicesThisMonth, limit: limits.invoicesPerMonth, label: 'Invoices' },
    measurements: { used: usage.measurementsThisMonth, limit: limits.measurementsPerMonth, label: 'Measurements' },
  };

  const check = fieldMap[feature];
  if (check.used >= check.limit) {
    throw new LimitExceededError(check.label, check.limit, usage.plan);
  }
}

export async function enforceCustomerLimit(userId: string, currentCount: number): Promise<void> {
  const usage = await getUserPlanAndUsage(userId);
  const limit = PLAN_LIMITS[usage.plan].customers;
  if (currentCount >= limit) {
    throw new LimitExceededError('Customers', limit as number, usage.plan);
  }
}

export async function canUserExportPDF(userId: string): Promise<boolean> {
  const usage = await getUserPlanAndUsage(userId);
  return PLAN_LIMITS[usage.plan].pdfExport;
}

export async function canUserUseBranding(userId: string): Promise<boolean> {
  const usage = await getUserPlanAndUsage(userId);
  return PLAN_LIMITS[usage.plan].companyBranding;
}

// ── Type Mappers (snake_case DB ↔ camelCase frontend) ──────

function mapCustomerFromDb(row: any): Customer {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapLineItemFromDb(row: any): LineItem {
  return {
    id: row.id,
    description: row.description,
    type: row.type,
    quantity: Number(row.quantity),
    unit: row.unit,
    unitPrice: Number(row.unit_price),
    total: Number(row.total),
    length: row.length != null ? Number(row.length) : undefined,
    height: row.height != null ? Number(row.height) : undefined,
    notes: row.notes,
  };
}

function mapEstimateFromDb(row: any, lineItems: LineItem[]): Estimate {
  return {
    id: row.id,
    number: row.number,
    customerId: row.customer_id || '',
    customerName: row.customer_name || '',
    title: row.title,
    description: row.description,
    status: row.status,
    lineItems,
    subtotal: Number(row.subtotal),
    taxRate: Number(row.tax_rate),
    taxAmount: Number(row.tax_amount),
    total: Number(row.total),
    notes: row.notes,
    validUntil: row.valid_until || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInvoiceFromDb(row: any, lineItems: LineItem[]): Invoice {
  return {
    id: row.id,
    number: row.number,
    estimateId: row.estimate_id || undefined,
    customerId: row.customer_id || '',
    customerName: row.customer_name || '',
    title: row.title,
    description: row.description,
    status: row.status,
    lineItems,
    subtotal: Number(row.subtotal),
    taxRate: Number(row.tax_rate),
    taxAmount: Number(row.tax_amount),
    total: Number(row.total),
    notes: row.notes,
    dueDate: row.due_date || '',
    paidDate: row.paid_date || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCalibrationFromDb(row: any): CalibrationProfile {
  return {
    id: row.id,
    name: row.name,
    focalLength: Number(row.focal_length),
    referenceWidth: Number(row.reference_width),
    calibrationDistance: Number(row.calibration_distance),
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mapMeasurementFromDb(row: any): Measurement {
  return {
    id: row.id,
    distance: Number(row.distance),
    unit: row.unit,
    confidence: row.confidence,
    profileId: row.profile_id || '',
    profileName: row.profile_name || '',
    pixelWidth: row.pixel_width,
    referenceWidth: Number(row.reference_width),
    note: row.note,
    timestamp: row.timestamp,
  };
}

function mapSettingsFromDb(row: any): AppSettings {
  return {
    unitSystem: row.unit_system,
    showGrid: row.show_grid,
    showGuides: row.show_guides,
    darkMode: row.dark_mode,
    defaultTaxRate: Number(row.default_tax_rate),
    companyName: row.company_name || '',
    companyEmail: row.company_email || '',
    companyPhone: row.company_phone || '',
    companyAddress: row.company_address || '',
    companyLogoUrl: row.company_logo_url || undefined,
    paymentInstructions: row.payment_instructions || '',
  };
}

// ── Customers ──────────────────────────────────────────────

export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('em_customers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapCustomerFromDb);
}

export async function insertCustomer(
  userId: string,
  c: Omit<Customer, 'id' | 'createdAt'>
): Promise<Customer> {
  // Enforce customer limit
  const { count } = await supabase
    .from('em_customers')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  await enforceCustomerLimit(userId, count || 0);

  const { data, error } = await supabase
    .from('em_customers')
    .insert({
      user_id: userId,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      city: c.city,
      state: c.state,
      zip: c.zip,
      notes: c.notes,
    })
    .select()
    .single();
  if (error) throw error;
  return mapCustomerFromDb(data);
}

export async function updateCustomerDb(
  id: string,
  c: Partial<Customer>
): Promise<void> {
  const payload: any = {};
  if (c.name !== undefined) payload.name = c.name;
  if (c.email !== undefined) payload.email = c.email;
  if (c.phone !== undefined) payload.phone = c.phone;
  if (c.address !== undefined) payload.address = c.address;
  if (c.city !== undefined) payload.city = c.city;
  if (c.state !== undefined) payload.state = c.state;
  if (c.zip !== undefined) payload.zip = c.zip;
  if (c.notes !== undefined) payload.notes = c.notes;
  const { error } = await supabase
    .from('em_customers')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCustomerDb(id: string): Promise<void> {
  const { error } = await supabase
    .from('em_customers')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Estimates ──────────────────────────────────────────────

export async function fetchEstimates(): Promise<Estimate[]> {
  const { data: estRows, error: estErr } = await supabase
    .from('em_estimates')
    .select('*')
    .order('created_at', { ascending: false });
  if (estErr) throw estErr;
  if (!estRows || estRows.length === 0) return [];

  const estIds = estRows.map((e: any) => e.id);
  const { data: liRows, error: liErr } = await supabase
    .from('em_line_items')
    .select('*')
    .in('estimate_id', estIds)
    .order('sort_order', { ascending: true });
  if (liErr) throw liErr;

  const liByEst = new Map<string, LineItem[]>();
  (liRows || []).forEach((row: any) => {
    const list = liByEst.get(row.estimate_id) || [];
    list.push(mapLineItemFromDb(row));
    liByEst.set(row.estimate_id, list);
  });

  return estRows.map((row: any) =>
    mapEstimateFromDb(row, liByEst.get(row.id) || [])
  );
}

export async function insertEstimate(
  userId: string,
  e: Omit<Estimate, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'subtotal' | 'taxAmount' | 'total'>,
  subtotal: number,
  taxAmount: number,
  total: number
): Promise<Estimate> {
  // Enforce estimate limit
  await enforceLimit(userId, 'estimates');

  // Get next number atomically
  const { data: numData, error: numErr } = await supabase.rpc('em_next_number', {
    counter_id: 'estimate',
    prefix: 'EST',
  });
  if (numErr) throw numErr;
  const number = numData as string;

  const { data, error } = await supabase
    .from('em_estimates')
    .insert({
      user_id: userId,
      number,
      customer_id: e.customerId || null,
      customer_name: e.customerName,
      title: e.title,
      description: e.description,
      status: e.status,
      subtotal,
      tax_rate: e.taxRate,
      tax_amount: taxAmount,
      total,
      notes: e.notes,
      valid_until: e.validUntil || null,
    })
    .select()
    .single();
  if (error) throw error;

  // Insert line items
  const lineItems = await insertLineItems(userId, e.lineItems, data.id, null);

  // Track usage for subscription limits
  await incrementUsage(userId, 'estimates_this_month').catch(() => {});

  return mapEstimateFromDb(data, lineItems);
}

export async function updateEstimateDb(
  userId: string,
  id: string,
  e: Partial<Estimate>,
  subtotal?: number,
  taxAmount?: number,
  total?: number
): Promise<void> {
  const payload: any = {};
  if (e.customerId !== undefined) payload.customer_id = e.customerId || null;
  if (e.customerName !== undefined) payload.customer_name = e.customerName;
  if (e.title !== undefined) payload.title = e.title;
  if (e.description !== undefined) payload.description = e.description;
  if (e.status !== undefined) payload.status = e.status;
  if (e.taxRate !== undefined) payload.tax_rate = e.taxRate;
  if (e.notes !== undefined) payload.notes = e.notes;
  if (e.validUntil !== undefined) payload.valid_until = e.validUntil || null;
  if (subtotal !== undefined) payload.subtotal = subtotal;
  if (taxAmount !== undefined) payload.tax_amount = taxAmount;
  if (total !== undefined) payload.total = total;

  const { error } = await supabase
    .from('em_estimates')
    .update(payload)
    .eq('id', id);
  if (error) throw error;

  // Replace line items if provided
  if (e.lineItems) {
    await supabase.from('em_line_items').delete().eq('estimate_id', id);
    await insertLineItems(userId, e.lineItems, id, null);
  }
}

export async function deleteEstimateDb(id: string): Promise<void> {
  // Line items cascade-delete via FK
  const { error } = await supabase
    .from('em_estimates')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Invoices ───────────────────────────────────────────────

export async function fetchInvoices(): Promise<Invoice[]> {
  const { data: invRows, error: invErr } = await supabase
    .from('em_invoices')
    .select('*')
    .order('created_at', { ascending: false });
  if (invErr) throw invErr;
  if (!invRows || invRows.length === 0) return [];

  const invIds = invRows.map((i: any) => i.id);
  const { data: liRows, error: liErr } = await supabase
    .from('em_line_items')
    .select('*')
    .in('invoice_id', invIds)
    .order('sort_order', { ascending: true });
  if (liErr) throw liErr;

  const liByInv = new Map<string, LineItem[]>();
  (liRows || []).forEach((row: any) => {
    const list = liByInv.get(row.invoice_id) || [];
    list.push(mapLineItemFromDb(row));
    liByInv.set(row.invoice_id, list);
  });

  return invRows.map((row: any) =>
    mapInvoiceFromDb(row, liByInv.get(row.id) || [])
  );
}

export async function insertInvoice(
  userId: string,
  i: Omit<Invoice, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'subtotal' | 'taxAmount' | 'total'>,
  subtotal: number,
  taxAmount: number,
  total: number
): Promise<Invoice> {
  // Enforce invoice limit
  await enforceLimit(userId, 'invoices');

  const { data: numData, error: numErr } = await supabase.rpc('em_next_number', {
    counter_id: 'invoice',
    prefix: 'INV',
  });
  if (numErr) throw numErr;
  const number = numData as string;

  const { data, error } = await supabase
    .from('em_invoices')
    .insert({
      user_id: userId,
      number,
      customer_id: i.customerId || null,
      estimate_id: i.estimateId || null,
      customer_name: i.customerName,
      title: i.title,
      description: i.description,
      status: i.status,
      subtotal,
      tax_rate: i.taxRate,
      tax_amount: taxAmount,
      total,
      notes: i.notes,
      due_date: i.dueDate || null,
      paid_date: i.paidDate || null,
    })
    .select()
    .single();
  if (error) throw error;

  const lineItems = await insertLineItems(userId, i.lineItems, null, data.id);

  // Track usage for subscription limits
  await incrementUsage(userId, 'invoices_this_month').catch(() => {});

  return mapInvoiceFromDb(data, lineItems);
}

export async function updateInvoiceDb(
  userId: string,
  id: string,
  i: Partial<Invoice>,
  subtotal?: number,
  taxAmount?: number,
  total?: number
): Promise<void> {
  const payload: any = {};
  if (i.customerId !== undefined) payload.customer_id = i.customerId || null;
  if (i.customerName !== undefined) payload.customer_name = i.customerName;
  if (i.title !== undefined) payload.title = i.title;
  if (i.description !== undefined) payload.description = i.description;
  if (i.status !== undefined) payload.status = i.status;
  if (i.taxRate !== undefined) payload.tax_rate = i.taxRate;
  if (i.notes !== undefined) payload.notes = i.notes;
  if (i.dueDate !== undefined) payload.due_date = i.dueDate || null;
  if (i.paidDate !== undefined) payload.paid_date = i.paidDate || null;
  if (i.estimateId !== undefined) payload.estimate_id = i.estimateId || null;
  if (subtotal !== undefined) payload.subtotal = subtotal;
  if (taxAmount !== undefined) payload.tax_amount = taxAmount;
  if (total !== undefined) payload.total = total;

  const { error } = await supabase
    .from('em_invoices')
    .update(payload)
    .eq('id', id);
  if (error) throw error;

  if (i.lineItems) {
    await supabase.from('em_line_items').delete().eq('invoice_id', id);
    await insertLineItems(userId, i.lineItems, null, id);
  }
}

export async function deleteInvoiceDb(id: string): Promise<void> {
  const { error } = await supabase
    .from('em_invoices')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Line Items (shared helper) ─────────────────────────────

async function insertLineItems(
  userId: string,
  items: LineItem[],
  estimateId: string | null,
  invoiceId: string | null
): Promise<LineItem[]> {
  if (items.length === 0) return [];

  const rows = items.map((li, idx) => ({
    user_id: userId,
    estimate_id: estimateId,
    invoice_id: invoiceId,
    description: li.description,
    type: li.type,
    quantity: li.quantity,
    unit: li.unit,
    unit_price: li.unitPrice,
    total: li.quantity * li.unitPrice,
    length: li.length ?? null,
    height: li.height ?? null,
    notes: li.notes,
    sort_order: idx,
  }));

  const { data, error } = await supabase
    .from('em_line_items')
    .insert(rows)
    .select();
  if (error) throw error;
  return (data || []).map(mapLineItemFromDb);
}

// ── Calibration Profiles ───────────────────────────────────

export async function fetchCalibrationProfiles(): Promise<CalibrationProfile[]> {
  const { data, error } = await supabase
    .from('em_calibration_profiles')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapCalibrationFromDb);
}

export async function insertCalibrationProfile(
  userId: string,
  p: Omit<CalibrationProfile, 'id' | 'createdAt' | 'isActive'>
): Promise<CalibrationProfile> {
  const { data, error } = await supabase
    .from('em_calibration_profiles')
    .insert({
      user_id: userId,
      name: p.name,
      focal_length: p.focalLength,
      reference_width: p.referenceWidth,
      calibration_distance: p.calibrationDistance,
      is_active: false,
    })
    .select()
    .single();
  if (error) throw error;
  return mapCalibrationFromDb(data);
}

export async function updateCalibrationProfileDb(
  id: string,
  p: Partial<CalibrationProfile>
): Promise<void> {
  const payload: any = {};
  if (p.name !== undefined) payload.name = p.name;
  if (p.focalLength !== undefined) payload.focal_length = p.focalLength;
  if (p.referenceWidth !== undefined) payload.reference_width = p.referenceWidth;
  if (p.calibrationDistance !== undefined) payload.calibration_distance = p.calibrationDistance;
  if (p.isActive !== undefined) payload.is_active = p.isActive;
  const { error } = await supabase
    .from('em_calibration_profiles')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
}

export async function setActiveCalibrationProfile(
  userId: string,
  activeId: string
): Promise<void> {
  // Deactivate all first
  const { error: e1 } = await supabase
    .from('em_calibration_profiles')
    .update({ is_active: false })
    .eq('user_id', userId);
  if (e1) throw e1;

  // Activate the selected one
  const { error: e2 } = await supabase
    .from('em_calibration_profiles')
    .update({ is_active: true })
    .eq('id', activeId);
  if (e2) throw e2;
}

export async function deleteCalibrationProfileDb(id: string): Promise<void> {
  const { error } = await supabase
    .from('em_calibration_profiles')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Measurements ───────────────────────────────────────────

export async function fetchMeasurements(): Promise<Measurement[]> {
  const { data, error } = await supabase
    .from('em_measurements')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data || []).map(mapMeasurementFromDb);
}

export async function insertMeasurement(
  userId: string,
  m: Omit<Measurement, 'id' | 'timestamp'>
): Promise<Measurement> {
  // Enforce measurement limit
  await enforceLimit(userId, 'measurements');

  const { data, error } = await supabase
    .from('em_measurements')
    .insert({
      user_id: userId,
      profile_id: m.profileId || null,
      profile_name: m.profileName,
      distance: m.distance,
      unit: m.unit,
      confidence: m.confidence,
      pixel_width: m.pixelWidth,
      reference_width: m.referenceWidth,
      note: m.note,
    })
    .select()
    .single();
  if (error) throw error;

  // Track usage for subscription limits
  await incrementUsage(userId, 'measurements_this_month').catch(() => {});

  return mapMeasurementFromDb(data);
}

export async function deleteMeasurementDb(id: string): Promise<void> {
  const { error } = await supabase
    .from('em_measurements')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function clearMeasurementsDb(userId: string): Promise<void> {
  const { error } = await supabase
    .from('em_measurements')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}

// ── Settings ───────────────────────────────────────────────

export async function fetchSettings(userId: string): Promise<AppSettings | null> {
  const { data, error } = await supabase
    .from('em_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSettingsFromDb(data) : null;
}

export async function upsertSettings(
  userId: string,
  s: Partial<AppSettings>
): Promise<AppSettings> {
  const payload: any = { user_id: userId };
  if (s.unitSystem !== undefined) payload.unit_system = s.unitSystem;
  if (s.showGrid !== undefined) payload.show_grid = s.showGrid;
  if (s.showGuides !== undefined) payload.show_guides = s.showGuides;
  if (s.darkMode !== undefined) payload.dark_mode = s.darkMode;
  if (s.defaultTaxRate !== undefined) payload.default_tax_rate = s.defaultTaxRate;
  if (s.companyName !== undefined) payload.company_name = s.companyName;
  if (s.companyEmail !== undefined) payload.company_email = s.companyEmail;
  if (s.companyPhone !== undefined) payload.company_phone = s.companyPhone;
  if (s.companyAddress !== undefined) payload.company_address = s.companyAddress;
  if (s.companyLogoUrl !== undefined) payload.company_logo_url = s.companyLogoUrl;
  if (s.paymentInstructions !== undefined) payload.payment_instructions = s.paymentInstructions;

  const { data, error } = await supabase
    .from('em_settings')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return mapSettingsFromDb(data);
}
