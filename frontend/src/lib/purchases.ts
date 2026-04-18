import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  getAvailablePurchases,
  finishTransaction,
  type SubscriptionAndroid,
  type Purchase,
} from 'react-native-iap';
import { PRODUCT_IDS, SubscriptionTier } from './subscriptionConfig';

const SKU_LIST = [PRODUCT_IDS.PRO, PRODUCT_IDS.ENTERPRISE];

export async function initBilling(): Promise<void> {
  try {
    await initConnection();
  } catch (e) {
    console.error('[Billing] initConnection failed:', e);
  }
}

export async function endBilling(): Promise<void> {
  try {
    await endConnection();
  } catch {}
}

export async function purchaseSubscription(sku: string): Promise<boolean> {
  try {
    const subs = await getSubscriptions({ skus: [sku] });
    const sub = subs[0] as SubscriptionAndroid | undefined;
    const offerToken = sub?.subscriptionOfferDetails?.[0]?.offerToken;

    const purchase = await requestSubscription({
      sku,
      ...(offerToken ? { subscriptionOffers: [{ sku, offerToken }] } : {}),
    });

    if (purchase) {
      const p = Array.isArray(purchase) ? purchase[0] : purchase;
      await finishTransaction({ purchase: p as Purchase, isConsumable: false });
    }
    return true;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code !== 'E_USER_CANCELLED') {
      console.error('[Billing] purchaseSubscription failed:', e);
    }
    return false;
  }
}

export async function getCurrentTier(): Promise<SubscriptionTier> {
  try {
    const purchases = await getAvailablePurchases();
    const hasEnterprise = purchases.some(p => p.productId === PRODUCT_IDS.ENTERPRISE);
    if (hasEnterprise) return 'enterprise';
    const hasPro = purchases.some(p => p.productId === PRODUCT_IDS.PRO);
    if (hasPro) return 'pro';
    return 'free';
  } catch (e) {
    console.error('[Billing] getAvailablePurchases failed:', e);
    return 'free';
  }
}

export async function restorePurchases(): Promise<SubscriptionTier> {
  return getCurrentTier();
}
