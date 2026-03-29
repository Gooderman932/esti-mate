// ============================================================
// ESTI-MATE — Subscription Context
// Tracks plan, enforces limits, gates features
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PLAN_LIMITS, PlanType, Subscription, fetchSubscription, incrementUsage } from '@/lib/subscription';

interface SubscriptionContextType {
  subscription: Subscription | null;
  plan: PlanType;
  loading: boolean;
  // Limit checks
  canCreateEstimate: () => boolean;
  canCreateInvoice: () => boolean;
  canCreateMeasurement: () => boolean;
  canExportPDF: () => boolean;
  canUseCompanyBranding: () => boolean;
  hasPrioritySupport: () => boolean;
  canAddCustomer: (currentCount: number) => boolean;
  // Usage tracking
  recordEstimateCreated: () => Promise<void>;
  recordInvoiceCreated: () => Promise<void>;
  recordMeasurementCreated: () => Promise<void>;
  // Usage info
  getUsage: () => { estimates: { used: number; limit: number }; invoices: { used: number; limit: number }; measurements: { used: number; limit: number }; customers: { limit: number } };
  // Upgrade
  isPaid: () => boolean;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({} as SubscriptionContextType);
export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSubscription = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const sub = await fetchSubscription(user.id);
      setSubscription(sub);
    } catch (err) {
      console.error('Failed to load subscription:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadSubscription(); }, [loadSubscription]);

  const plan: PlanType = subscription?.plan || 'free';
  const limits = PLAN_LIMITS[plan];

  const canCreateEstimate = useCallback(() => {
    if (!subscription) return true;
    return subscription.estimatesThisMonth < limits.estimatesPerMonth;
  }, [subscription, limits]);

  const canCreateInvoice = useCallback(() => {
    if (!subscription) return true;
    return subscription.invoicesThisMonth < limits.invoicesPerMonth;
  }, [subscription, limits]);

  const canCreateMeasurement = useCallback(() => {
    if (!subscription) return true;
    return subscription.measurementsThisMonth < limits.measurementsPerMonth;
  }, [subscription, limits]);

  const canExportPDF = useCallback(() => limits.pdfExport, [limits]);
  const canUseCompanyBranding = useCallback(() => limits.companyBranding, [limits]);
  const hasPrioritySupport = useCallback(() => limits.prioritySupport, [limits]);

  const canAddCustomer = useCallback((currentCount: number) => {
    return currentCount < limits.customers;
  }, [limits]);

  const isPaid = useCallback(() => plan !== 'free', [plan]);

  const recordEstimateCreated = useCallback(async () => {
    if (!user?.id) return;
    try {
      await incrementUsage(user.id, 'estimates_this_month');
      setSubscription(prev => prev ? { ...prev, estimatesThisMonth: prev.estimatesThisMonth + 1 } : prev);
    } catch (err) { console.error('Failed to record usage:', err); }
  }, [user?.id]);

  const recordInvoiceCreated = useCallback(async () => {
    if (!user?.id) return;
    try {
      await incrementUsage(user.id, 'invoices_this_month');
      setSubscription(prev => prev ? { ...prev, invoicesThisMonth: prev.invoicesThisMonth + 1 } : prev);
    } catch (err) { console.error('Failed to record usage:', err); }
  }, [user?.id]);

  const recordMeasurementCreated = useCallback(async () => {
    if (!user?.id) return;
    try {
      await incrementUsage(user.id, 'measurements_this_month');
      setSubscription(prev => prev ? { ...prev, measurementsThisMonth: prev.measurementsThisMonth + 1 } : prev);
    } catch (err) { console.error('Failed to record usage:', err); }
  }, [user?.id]);

  const getUsage = useCallback(() => ({
    estimates: { used: subscription?.estimatesThisMonth || 0, limit: limits.estimatesPerMonth },
    invoices: { used: subscription?.invoicesThisMonth || 0, limit: limits.invoicesPerMonth },
    measurements: { used: subscription?.measurementsThisMonth || 0, limit: limits.measurementsPerMonth },
    customers: { limit: limits.customers },
  }), [subscription, limits]);

  return (
    <SubscriptionContext.Provider value={{
      subscription, plan, loading,
      canCreateEstimate, canCreateInvoice, canCreateMeasurement,
      canExportPDF, canUseCompanyBranding, hasPrioritySupport, canAddCustomer,
      recordEstimateCreated, recordInvoiceCreated, recordMeasurementCreated,
      getUsage, isPaid, refresh: loadSubscription,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
