export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export const ENTITLEMENTS = {
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

export const PRODUCT_IDS = {
  PRO: 'pro_monthly',
  ENTERPRISE: 'enterprise_monthly',
} as const;

export interface TierFeatures {
  monthlyEstimates: number | null;  // null = unlimited
  monthlyInvoices: number | null;
  cameraAccess: boolean;
  pdfExport: boolean;
  customBranding: boolean;
  teamAccounts: boolean;
  prioritySupport: boolean;
}

export const TIER_FEATURES: Record<SubscriptionTier, TierFeatures> = {
  free: {
    monthlyEstimates: 3,
    monthlyInvoices: 3,
    cameraAccess: false,
    pdfExport: true,
    customBranding: false,
    teamAccounts: false,
    prioritySupport: false,
  },
  pro: {
    monthlyEstimates: 15,
    monthlyInvoices: 15,
    cameraAccess: true,
    pdfExport: true,
    customBranding: false,
    teamAccounts: false,
    prioritySupport: true,
  },
  enterprise: {
    monthlyEstimates: null,
    monthlyInvoices: null,
    cameraAccess: true,
    pdfExport: true,
    customBranding: true,
    teamAccounts: true,
    prioritySupport: true,
  },
};

export const TIER_PRICES = {
  pro: '$29.99',
  enterprise: '$99.99',
};
