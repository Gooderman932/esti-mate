import { useState, useCallback } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAppContext } from '@/contexts/AppContext';

type GatedFeature = 'estimate' | 'invoice' | 'measurement' | 'pdf' | 'branding' | 'customer';

const FEATURE_MESSAGES: Record<GatedFeature, { feature: string; description: string }> = {
  estimate: {
    feature: 'Create Estimate',
    description: 'You have reached your monthly estimate limit on the Free plan. Upgrade to Pro for unlimited estimates.',
  },
  invoice: {
    feature: 'Create Invoice',
    description: 'You have reached your monthly invoice limit on the Free plan. Upgrade to Pro for unlimited invoices.',
  },
  measurement: {
    feature: 'Save Measurement',
    description: 'You have reached your monthly measurement limit on the Free plan. Upgrade to Pro for unlimited measurements.',
  },
  pdf: {
    feature: 'PDF Export',
    description: 'PDF export is a Pro feature. Upgrade to export professional estimates and invoices as PDF.',
  },
  branding: {
    feature: 'Company Branding',
    description: 'Custom company branding on PDFs is a Pro feature. Upgrade to add your logo and company details to exports.',
  },
  customer: {
    feature: 'Add Customer',
    description: 'You have reached the customer limit on the Free plan. Upgrade to Pro for unlimited customers.',
  },
};

export function useFeatureGate() {
  const { canCreateEstimate, canCreateInvoice, canCreateMeasurement, canExportPDF, canUseCompanyBranding, canAddCustomer } = useSubscription();
  const { customers, setCurrentView } = useAppContext();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeInfo, setUpgradeInfo] = useState<{ feature: string; description: string } | null>(null);

  const checkFeature = useCallback((feature: GatedFeature): boolean => {
    let allowed = true;
    switch (feature) {
      case 'estimate': allowed = canCreateEstimate(); break;
      case 'invoice': allowed = canCreateInvoice(); break;
      case 'measurement': allowed = canCreateMeasurement(); break;
      case 'pdf': allowed = canExportPDF(); break;
      case 'branding': allowed = canUseCompanyBranding(); break;
      case 'customer': allowed = canAddCustomer(customers.length); break;
    }
    if (!allowed) {
      setUpgradeInfo(FEATURE_MESSAGES[feature]);
      setShowUpgrade(true);
      return false;
    }
    return true;
  }, [canCreateEstimate, canCreateInvoice, canCreateMeasurement, canExportPDF, canUseCompanyBranding, canAddCustomer, customers.length]);

  const closeUpgrade = useCallback(() => {
    setShowUpgrade(false);
    setUpgradeInfo(null);
  }, []);

  const goToPricing = useCallback(() => {
    setShowUpgrade(false);
    setUpgradeInfo(null);
    setCurrentView('pricing');
  }, [setCurrentView]);

  return { checkFeature, showUpgrade, upgradeInfo, closeUpgrade, goToPricing };
}
