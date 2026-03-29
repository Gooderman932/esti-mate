// ============================================================
// ESTI-MATE — Subscription / Monetization Layer
// Handles plan checks, usage limits, and Stripe checkout
// ============================================================

import { supabase } from './supabase';

export interface Subscription {
  id: string;
  userId: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'past_due' | 'cancelled' | 'trialing';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  estimatesThisMonth: number;
  invoicesThisMonth: number;
  measurementsThisMonth: number;
  usageResetAt: string;
}

// Plan limits
export const PLAN_LIMITS = {
  free: {
    label: 'Free',
    price: 0,
    estimatesPerMonth: 3,
    invoicesPerMonth: 3,
    measurementsPerMonth: 3,
    customers: 3,
    pdfExport: false,
    companyBranding: false,
    prioritySupport: false,
  },
  pro: {
    label: 'Pro',
    price: 29,
    estimatesPerMonth: 15,
    invoicesPerMonth: 15,
    measurementsPerMonth: 15,
    customers: 50,
    pdfExport: true,
    companyBranding: false,
    prioritySupport: false,
  },
  enterprise: {
    label: 'Enterprise',
    price: 99,
    estimatesPerMonth: Infinity,
    invoicesPerMonth: Infinity,
    measurementsPerMonth: Infinity,
    customers: Infinity,
    pdfExport: true,
    companyBranding: true,
    prioritySupport: true,
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

function mapSubscription(row: any): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    plan: row.plan,
    status: row.status,
    stripeCustomerId: row.stripe_customer_id || undefined,
    stripeSubscriptionId: row.stripe_subscription_id || undefined,
    currentPeriodStart: row.current_period_start || undefined,
    currentPeriodEnd: row.current_period_end || undefined,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    estimatesThisMonth: row.estimates_this_month,
    invoicesThisMonth: row.invoices_this_month,
    measurementsThisMonth: row.measurements_this_month,
    usageResetAt: row.usage_reset_at,
  };
}

export async function fetchSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('em_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSubscription(data) : null;
}

export function canCreateEstimate(sub: Subscription | null): boolean {
  if (!sub) return true; // Fallback — allow if sub not loaded yet
  const limits = PLAN_LIMITS[sub.plan];
  return sub.estimatesThisMonth < limits.estimatesPerMonth;
}

export function canCreateInvoice(sub: Subscription | null): boolean {
  if (!sub) return true;
  const limits = PLAN_LIMITS[sub.plan];
  return sub.invoicesThisMonth < limits.invoicesPerMonth;
}

export function canCreateMeasurement(sub: Subscription | null): boolean {
  if (!sub) return true;
  const limits = PLAN_LIMITS[sub.plan];
  return sub.measurementsThisMonth < limits.measurementsPerMonth;
}

export function canExportPDF(sub: Subscription | null): boolean {
  if (!sub) return false;
  return PLAN_LIMITS[sub.plan].pdfExport;
}

export function getUsagePercent(used: number, limit: number): number {
  if (limit === Infinity) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

// Increment usage counter after creating an estimate/invoice/measurement
export async function incrementUsage(
  userId: string,
  field: 'estimates_this_month' | 'invoices_this_month' | 'measurements_this_month'
): Promise<void> {
  const { data: current } = await supabase
    .from('em_subscriptions')
    .select(field)
    .eq('user_id', userId)
    .single();

  if (current) {
    await supabase
      .from('em_subscriptions')
      .update({ [field]: (current as any)[field] + 1 })
      .eq('user_id', userId);
  }
}
