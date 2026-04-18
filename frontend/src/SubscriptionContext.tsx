import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import {
  getSubscriptionTier,
  getOfferings,
  purchasePackage,
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

  // Offerings & purchase
  offerings: PurchasesPackage[];
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;

  // Usage gates
  canAddEstimate: () => boolean;
  canAddInvoice: () => boolean;
  canExportPDF: () => boolean;
  canUseBranding: () => boolean;
  canUseCamera: () => boolean;

  // Usage info for UI
  remainingEstimates: number | null;
  remainingInvoices: number | null;
  monthlyUsage: { estimates: number; invoices: number };
  resetDate: string;

  // Increment usage (call right before creating a document)
  incrementEstimateUsage: () => Promise<void>;
  incrementInvoiceUsage: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [offerings, setOfferings] = useState<PurchasesPackage[]>([]);
  const [usage, setUsage] = useState({ estimates: 0, invoices: 0 });
  const appStateRef = useRef(AppState.currentState);

  const loadUsage = useCallback(async () => {
    const u = await getMonthlyUsage();
    setUsage({ estimates: u.estimates, invoices: u.invoices });
  }, []);

  const loadTierAndOfferings = useCallback(async () => {
    const [t, pkgs] = await Promise.all([getSubscriptionTier(), getOfferings()]);
    setTier(t);
    setOfferings(pkgs);
  }, []);

  const loadSettings = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadTierAndOfferings(), loadUsage(), loadSettings()]);
    setIsLoading(false);
  }, [loadTierAndOfferings, loadUsage, loadSettings]);

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

  const purchase = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      await purchasePackage(pkg);
      await loadTierAndOfferings();
      return true;
    } catch (e: unknown) {
      const err = e as { userCancelled?: boolean };
      if (!err.userCancelled) console.error('[Purchase] failed:', e);
      return false;
    }
  }, [loadTierAndOfferings]);

  const restore = useCallback(async (): Promise<boolean> => {
    try {
      await restorePurchases();
      await loadTierAndOfferings();
      return true;
    } catch (e) {
      console.error('[Restore] failed:', e);
      return false;
    }
  }, [loadTierAndOfferings]);

  const features = TIER_FEATURES[tier];

  const incrementEstimateUsage = useCallback(async () => {
    await _incEstimate();
    await loadUsage();
  }, [loadUsage]);

  const incrementInvoiceUsage = useCallback(async () => {
    await _incInvoice();
    await loadUsage();
  }, [loadUsage]);

  const currentUsage = { month: '', estimates: usage.estimates, invoices: usage.invoices };

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
    checkSubscription: loadTierAndOfferings,
    canUploadLogo: tier === 'enterprise',

    offerings,
    purchase,
    restore,
    refresh,

    canAddEstimate: () => canCreateEstimate(currentUsage, features.monthlyEstimates),
    canAddInvoice: () => canCreateInvoice(currentUsage, features.monthlyInvoices),
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
