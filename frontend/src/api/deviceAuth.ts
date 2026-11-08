/**
 * Device secret for the subscription API.
 *
 * The backend issues a random secret the first time this install registers
 * (POST /api/customers/create) and then requires it on every subscription
 * call, so knowing a user id alone is not enough to read or cancel a
 * subscription. The secret is kept in this app's private storage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_SECRET_KEY = '@estimator_device_secret';
export const DEVICE_SECRET_HEADER = 'X-Device-Secret';

export async function getDeviceSecret(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(DEVICE_SECRET_KEY);
  } catch {
    return null;
  }
}

export async function saveDeviceSecret(secret: string): Promise<void> {
  await AsyncStorage.setItem(DEVICE_SECRET_KEY, secret);
}

/** Headers for a JSON request to the subscription API. */
export async function deviceHeaders(json = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (json) headers['Content-Type'] = 'application/json';
  const secret = await getDeviceSecret();
  if (secret) headers[DEVICE_SECRET_HEADER] = secret;
  return headers;
}
