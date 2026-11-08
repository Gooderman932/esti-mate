/**
 * Backend API URL configuration — Esti-Mate Pro 1.1.8
 *
 * VERIFIED PATH (see docs/PLAY_SUBMISSION_1.1.8.md and docs/API_URL.md):
 * Production and preview builds are Play-Billing-only. On Android,
 * subscriptions go through Google Play Billing on the device
 * (react-native-iap) and the app sends no user data to a developer server.
 * That is why `app.json` (`extra.apiUrl`) and the preview/production
 * entries in `eas.json` (`EXPO_PUBLIC_API_BASE_URL`) are intentionally "".
 *
 * An empty URL is therefore NOT a value to "fix" by inventing one. It means
 * "no backend". Code that needs the backend must either:
 *  - skip the server call on the Play-Billing-only path (Android
 *    subscription checks — Play is the source of truth), or
 *  - fail loudly via `requireApiUrl()` with a clear message (Stripe web
 *    checkout / cancel on non-Android platforms).
 *
 * To enable the Stripe backend, Matt must supply a real production API URL
 * and set it in `eas.json` (production/preview) or `app.json`. Never commit
 * a guessed or placeholder URL here.
 *
 * This module is intentionally dependency-free (no expo/react-native
 * imports) so its logic can be unit-tested with plain Node.
 */

export const PLAY_BILLING_ONLY_NOTE =
  'Production builds are Play-Billing-only: subscriptions are handled by ' +
  'Google Play Billing on the device and the app sends no user data to a ' +
  'developer server. The Stripe backend is not used in these builds.';

export const NO_API_URL_MESSAGE =
  'No backend API URL is configured (EXPO_PUBLIC_API_BASE_URL / extra.apiUrl is empty). ' +
  PLAY_BILLING_ONLY_NOTE +
  ' To use the Stripe backend, set a real production API URL in eas.json/app.json.';

/** Resolve the backend base URL. Empty string means "no backend". */
export function resolveApiUrl(
  extraApiUrl?: string | null,
  envApiUrl?: string | null,
): string {
  return (extraApiUrl || envApiUrl || '').trim();
}

/** True when a backend URL is configured. */
export function isBackendConfigured(
  extraApiUrl?: string | null,
  envApiUrl?: string | null,
): boolean {
  return resolveApiUrl(extraApiUrl, envApiUrl) !== '';
}

/**
 * Return the backend base URL, or throw a clear config error when none is
 * configured. Call this at the point a backend request is actually required
 * — never silently fetch against "" (which would resolve to a meaningless
 * relative "/api/..." URL).
 */
export function requireApiUrl(
  extraApiUrl?: string | null,
  envApiUrl?: string | null,
): string {
  const url = resolveApiUrl(extraApiUrl, envApiUrl);
  if (!url) {
    throw new Error(NO_API_URL_MESSAGE);
  }
  return url;
}
