import Purchases, {
  LOG_LEVEL,
  type PurchasesPackage,
  type CustomerInfo,
} from 'react-native-purchases';
import { ENTITLEMENTS, SubscriptionTier } from './subscriptionConfig';

const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

export function initPurchases(userId?: string): void {
  if (!ANDROID_KEY) {
    console.warn('[RevenueCat] EXPO_PUBLIC_REVENUECAT_ANDROID_KEY not set — billing disabled');
    return;
  }
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.ERROR);
  Purchases.configure({
    apiKey: ANDROID_KEY,
    appUserID: userId ?? null,
  });
}

export async function getOfferings(): Promise<PurchasesPackage[]> {
  if (!ANDROID_KEY) return [];
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch (e) {
    console.error('[RevenueCat] getOfferings failed:', e);
    return [];
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!ANDROID_KEY) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    console.error('[RevenueCat] getCustomerInfo failed:', e);
    return null;
  }
}

export async function getSubscriptionTier(): Promise<SubscriptionTier> {
  const info = await getCustomerInfo();
  if (!info) return 'free';
  if (info.entitlements.active[ENTITLEMENTS.ENTERPRISE]) return 'enterprise';
  if (info.entitlements.active[ENTITLEMENTS.PRO]) return 'pro';
  return 'free';
}

export async function logOutRevenueCat(): Promise<void> {
  if (!ANDROID_KEY) return;
  try {
    await Purchases.logOut();
  } catch (e) {
    console.error('[RevenueCat] logOut failed:', e);
  }
}
