/**
 * Subscription Context
 *
 * Manages subscription state across the app and provides feature gating logic.
 * On Android, purchases go through Google Play Billing (react-native-iap).
 * Other platforms fall back to Stripe browser checkout (handled in paywall).
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as RNIap from 'react-native-iap';
import {
  getSettings,
  saveSettings,
  getSubscriptionStatus,
  saveSubscriptionStatus,
  getDocumentsCreatedThisMonth,
} from './store/storage';
import {
  SubscriptionStatus,
  AppSettings,
  SubscriptionTier,
  GOOGLE_PLAY_PRODUCT_IDS,
  TIER_FOR_PRODUCT_ID,
  TIER_LIMITS,
} from './types';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface MonthlyUsage {
  used: number;
  limit: number | null; // null = unlimited
}

interface SubscriptionContextType {
  tier: SubscriptionTier;
  isPro: boolean; // true for pro OR enterprise
  isEnterprise: boolean;
  isLoading: boolean;
  isPurchasing: boolean;
  userId: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  settings: AppSettings | null;
  checkSubscription: () => Promise<void>;
  canCreateEstimate: () => Promise<boolean>;
  getMonthlyUsage: () => Promise<MonthlyUsage>;
  canUploadLogo: boolean;
  purchaseSubscription: (plan: 'pro' | 'enterprise') => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  getStorePrices: () => Promise<Partial<Record<'pro' | 'enterprise', string>>>;
  refreshSettings: () => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const ALL_PRODUCT_IDS = [GOOGLE_PLAY_PRODUCT_IDS.pro, GOOGLE_PLAY_PRODUCT_IDS.enterprise];

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const userIdRef = useRef<string | null>(null);
  const iapConnectedRef = useRef(false);

  useEffect(() => {
    let purchaseUpdateSub: { remove: () => void } | undefined;
    let purchaseErrorSub: { remove: () => void } | undefined;

    const init = async () => {
      try {
        setIsLoading(true);

        const appSettings = await getSettings();
        setSettings(appSettings);
        setUserId(appSettings.userId);
        userIdRef.current = appSettings.userId;

        if (Platform.OS === 'android') {
          try {
            await RNIap.initConnection();
            iapConnectedRef.current = true;

            purchaseUpdateSub = RNIap.purchaseUpdatedListener(async (purchase: any) => {
              try {
                await handlePurchaseUpdate(purchase);
              } catch (e) {
                console.error('Error handling purchase update:', e);
              } finally {
                setIsPurchasing(false);
              }
            });

            purchaseErrorSub = RNIap.purchaseErrorListener((error: any) => {
              console.warn('Purchase error:', error?.code, error?.message);
              setIsPurchasing(false);
            });

            // Restore entitlements from any existing Play purchases on startup
            await syncGooglePlayEntitlement(appSettings.userId);
          } catch (e) {
            console.warn('IAP init failed (billing unavailable?):', e);
          }
        }

        await checkSubscriptionFromServer(appSettings.userId);
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    return () => {
      purchaseUpdateSub?.remove();
      purchaseErrorSub?.remove();
      if (iapConnectedRef.current) {
        RNIap.endConnection().catch(() => {});
      }
    };
  }, []);

  const applyStatus = async (status: SubscriptionStatus) => {
    setSubscriptionStatus(status);
    setTier(status.tier ?? (status.isPro ? 'pro' : 'free'));
    await saveSubscriptionStatus(status);
  };

  // Handle a purchase coming from the Play billing flow
  const handlePurchaseUpdate = async (purchase: any) => {
    const productId: string = purchase?.productId || '';
    const purchaseToken: string = purchase?.purchaseToken || '';
    if (!purchaseToken || !TIER_FOR_PRODUCT_ID[productId]) return;

    const uid = userIdRef.current;
    const purchasedTier = TIER_FOR_PRODUCT_ID[productId];

    // Report to backend (best-effort; entitlement is granted locally regardless
    // so the user is not blocked by network issues right after paying)
    if (uid && API_URL) {
      try {
        await fetch(`${API_URL}/api/subscriptions/verify-google-play`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: uid,
            product_id: productId,
            purchase_token: purchaseToken,
          }),
        });
      } catch (e) {
        console.warn('Backend verification failed, granting locally:', e);
      }
    }

    // Acknowledge the purchase — Google refunds unacknowledged purchases after 3 days
    try {
      await RNIap.finishTransaction({ purchase, isConsumable: false });
    } catch (e) {
      console.warn('finishTransaction failed:', e);
    }

    await applyStatus({
      userId: uid || '',
      isPro: true,
      tier: purchasedTier,
      billingSource: 'google_play',
      status: 'active',
    });
  };

  // Check existing Play purchases and grant/clear entitlement accordingly
  const syncGooglePlayEntitlement = async (uid: string): Promise<boolean> => {
    try {
      const purchases: any[] = await RNIap.getAvailablePurchases();
      const active = purchases.find(
        (p) => TIER_FOR_PRODUCT_ID[p.productId] && p.purchaseToken
      );
      if (active) {
        // Acknowledge if Play returned it un-acknowledged (e.g. app killed mid-purchase)
        if (active.isAcknowledgedAndroid === false) {
          try {
            await RNIap.finishTransaction({ purchase: active, isConsumable: false });
          } catch {}
        }
        await applyStatus({
          userId: uid,
          isPro: true,
          tier: TIER_FOR_PRODUCT_ID[active.productId],
          billingSource: 'google_play',
          status: 'active',
        });
        return true;
      }
    } catch (e) {
      console.warn('Could not sync Play purchases:', e);
    }
    return false;
  };

  const checkSubscriptionFromServer = async (uid: string) => {
    // A locally-synced Play subscription wins; the server check below only
    // upgrades the status, never downgrades a live Play entitlement.
    try {
      if (!API_URL) throw new Error('no API url configured');

      await fetch(`${API_URL}/api/customers/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: uid }),
      });

      const response = await fetch(`${API_URL}/api/subscriptions/status/${uid}`);
      if (response.ok) {
        const data = await response.json();
        if (data.is_pro) {
          await applyStatus({
            userId: uid,
            isPro: data.is_pro,
            tier: (data.tier as SubscriptionTier) || (data.is_pro ? 'pro' : 'free'),
            billingSource: data.billing_source,
            subscriptionId: data.subscription_id,
            status: data.status,
            currentPeriodEnd: data.current_period_end,
            cancelAtPeriodEnd: data.cancel_at_period_end,
          });
          return;
        }
      }
    } catch (error) {
      console.warn('Server subscription check failed:', error);
    }

    // Fall back to cached status if we have no live entitlement yet
    const cached = await getSubscriptionStatus();
    if (cached && cached.isPro) {
      setSubscriptionStatus(cached);
      setTier(cached.tier ?? 'pro');
    }
  };

  const checkSubscription = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    if (Platform.OS === 'android' && iapConnectedRef.current) {
      const restored = await syncGooglePlayEntitlement(uid);
      if (restored) return;
    }
    await checkSubscriptionFromServer(uid);
  }, []);

  // Fetch subscription products from the Play Store
  const fetchStoreProducts = async (): Promise<any[]> => {
    const products = await RNIap.fetchProducts({ skus: ALL_PRODUCT_IDS, type: 'subs' });
    return (products ?? []) as any[];
  };

  const getStorePrices = async (): Promise<Partial<Record<'pro' | 'enterprise', string>>> => {
    if (Platform.OS !== 'android' || !iapConnectedRef.current) return {};
    try {
      const products = await fetchStoreProducts();
      const prices: Partial<Record<'pro' | 'enterprise', string>> = {};
      for (const product of products) {
        const t = TIER_FOR_PRODUCT_ID[product.id];
        if (t === 'pro' || t === 'enterprise') prices[t] = product.displayPrice;
      }
      return prices;
    } catch (e) {
      console.warn('Could not fetch store prices:', e);
      return {};
    }
  };

  // Launch the native Google Play subscription purchase flow
  const purchaseSubscription = async (plan: 'pro' | 'enterprise') => {
    if (Platform.OS !== 'android') {
      throw new Error('Google Play billing is only available on Android.');
    }
    if (!iapConnectedRef.current) {
      throw new Error('Billing is not available on this device.');
    }

    const productId = GOOGLE_PLAY_PRODUCT_IDS[plan];
    const products = await fetchStoreProducts();
    const product = products.find((p: any) => p.id === productId);
    if (!product) {
      throw new Error('Subscription not found in Play Store. It may still be processing in Play Console.');
    }

    const offerToken: string =
      product.subscriptionOffers?.[0]?.offerTokenAndroid ??
      product.subscriptionOfferDetailsAndroid?.[0]?.offerToken ??
      '';
    if (!offerToken) {
      throw new Error('No subscription offer available for this plan.');
    }

    setIsPurchasing(true);
    try {
      await RNIap.requestPurchase({
        request: {
          google: {
            skus: [productId],
            subscriptionOffers: [{ sku: productId, offerToken }],
          },
        },
        type: 'subs',
      });
      // Result arrives via purchaseUpdatedListener / purchaseErrorListener
    } catch (e) {
      setIsPurchasing(false);
      throw e;
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    const uid = userIdRef.current;
    if (!uid) return false;
    if (Platform.OS === 'android' && iapConnectedRef.current) {
      const restored = await syncGooglePlayEntitlement(uid);
      if (restored) return true;
    }
    await checkSubscriptionFromServer(uid);
    const cached = await getSubscriptionStatus();
    return !!cached?.isPro;
  };

  const getMonthlyUsage = async (): Promise<MonthlyUsage> => {
    const used = await getDocumentsCreatedThisMonth();
    return { used, limit: TIER_LIMITS[tier].maxDocumentsPerMonth };
  };

  const canCreateEstimate = async (): Promise<boolean> => {
    const limit = TIER_LIMITS[tier].maxDocumentsPerMonth;
    if (limit === null) return true;
    const used = await getDocumentsCreatedThisMonth();
    return used < limit;
  };

  const refreshSettings = async () => {
    const appSettings = await getSettings();
    setSettings(appSettings);
  };

  const updateSettings = async (newSettings: AppSettings) => {
    await saveSettings(newSettings);
    setSettings(newSettings);
  };

  const value: SubscriptionContextType = {
    tier,
    isPro: tier === 'pro' || tier === 'enterprise',
    isEnterprise: tier === 'enterprise',
    isLoading,
    isPurchasing,
    userId,
    subscriptionStatus,
    settings,
    checkSubscription,
    canCreateEstimate,
    getMonthlyUsage,
    canUploadLogo: TIER_LIMITS[tier].canUploadLogo,
    purchaseSubscription,
    restorePurchases,
    getStorePrices,
    refreshSettings,
    updateSettings,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
}
