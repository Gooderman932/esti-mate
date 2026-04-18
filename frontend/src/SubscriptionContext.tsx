import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  getCurrentTier,
  purchaseSubscription,
  restorePurchases,
} from './lib/purchases';
import {
  TIER_FEATURES,
  SubscriptionTier,
  TierFeatures,
} from './lib/subscriptionConfig';
import {
  getMonthlyUsage,
  incrementEstimateUsage as _incEstimate,
  incrementInvoiceUsage as _incInvoice,
  canCreateEstimate,
  canCreateInvoice,
  getRemainingEstimates,
  getRemainingInvoices,
  getResetDate,
  countUniqueCustomers,
  canAddCustomer,
} from './lib/usageTracker';
import { getSettings, saveSettings } from './store/storage';
import { AppSettings } from './types';

interface SubscriptionContextType {
  // Tier
  tier: SubscriptionTier;
  features: TierFeatures;
  isPro: boolean;
  isEnterprise: boolean;
  isLoading: boolean;

  // Settings (backward compat)
  userId: string | null;
  settings: AppSettings | null;
  refreshSettings: () => Promise<void>;
  updateSettings: (s: AppSettings) => Promise<void>;
  checkSubscription: () => Promise<void>;
  canUploadLogo: boolean;

  // Purchase & restore
  purchase: (sku: string) => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;

  // Usage gates
  canAddEstimate: () => boolean;
  canAddInvoice: () => boolean;
  canAddNewCustomer: (
    newName: string,
    allEstimates: Array<{ id: string; customer: { name: string } }>,
    currentEstimateId: string,
  ) => boolean;
  canExportPDF: () => boolean;
  canUseBranding: () => boolean;
  canUseCamera: () => boolean;

  // Usage info for UI
  remainingEstimates: number | null;
  remainingInvoices: number | null;
  monthlyUsage: { estimates: number; invoices: number };
  resetDate: string;

  incrementEstimateUsage: () => Promise<void>;
  incrementInvoiceUsage: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [usage, setUsage] = useState({ estimates: 0, invoices: 0 });
  const appStateRef = useRef(AppState.currentState);

  const loadUsage = useCallback(async () => {
    const u = await getMonthlyUsage();
    setUsage({ estimates: u.estimates, invoices: u.invoices });
  }, []);

  const loadTier = useCallback(async () => {
    const t = await getCurrentTier();
    setTier(t);
  }, []);

  const loadSettings = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadTier(), loadUsage(), loadSettings()]);
    setIsLoading(false);
  }, [loadTier, loadUsage, loadSettings]);

  useEffect(() => {
    refresh();

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        refresh();
      }
      appStateRef.current = next;
    });

    return () => sub.remove();
  }, [refresh]);

  const purchase = useCallback(async (sku: string): Promise<boolean> => {
    const ok = await purchaseSubscription(sku);
    if (ok) await loadTier();
    return ok;
  }, [loadTier]);

  const restore = useCallback(async (): Promise<boolean> => {
    const restoredTier = await restorePurchases();
    setTier(restoredTier);
    return restoredTier !== 'free';
  }, []);

  const features = TIER_FEATURES[tier];
  const currentUsage = { month: '', estimates: usage.estimates, invoices: usage.invoices };

  const incrementEstimateUsage = useCallback(async () => {
    await _incEstimate();
    await loadUsage();
  }, [loadUsage]);

  const incrementInvoiceUsage = useCallback(async () => {
    await _incInvoice();
    await loadUsage();
  }, [loadUsage]);

  const value: SubscriptionContextType = {
    tier,
    features,
    isPro: tier === 'pro' || tier === 'enterprise',
    isEnterprise: tier === 'enterprise',
    isLoading,

    userId: settings?.userId ?? null,
    settings,
    refreshSettings: loadSettings,
    updateSettings: async (s: AppSettings) => {
      await saveSettings(s);
      setSettings(s);
    },
    checkSubscription: loadTier,
    canUploadLogo: tier === 'enterprise',

    purchase,
    restore,
    refresh,

    canAddEstimate: () => canCreateEstimate(currentUsage, features.monthlyEstimates),
    canAddInvoice: () => canCreateInvoice(currentUsage, features.monthlyInvoices),
    canAddNewCustomer: (newName, allEstimates, currentEstimateId) => {
      const existing = countUniqueCustomers(allEstimates, currentEstimateId);
      return canAddCustomer(newName, existing, features.maxUniqueCustomers);
    },
    canExportPDF: () => features.pdfExport,
    canUseBranding: () => features.customBranding,
    canUseCamera: () => features.cameraAccess,

    remainingEstimates: getRemainingEstimates(currentUsage, features.monthlyEstimates),
    remainingInvoices: getRemainingInvoices(currentUsage, features.monthlyInvoices),
    monthlyUsage: usage,
    resetDate: getResetDate(),

    incrementEstimateUsage,
    incrementInvoiceUsage,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextType {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
