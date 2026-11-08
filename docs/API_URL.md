# Backend API URL — Esti-Mate Pro 1.1.8

## The verified path: production builds are Play-Billing-only

Production and preview builds **do not call a developer backend**. On
Android, subscriptions go through Google Play Billing on the device
(`react-native-iap`), and the app sends no user data to a developer server
(see `docs/PLAY_SUBMISSION_1.1.8.md`: "Production and preview builds no
longer call the placeholder `api.estimate.example.com`").

That is why these values are intentionally empty — `""` means "no backend",
not "forgot to fill in":

| Place | Value | Meaning |
|---|---|---|
| `frontend/app.json` → `expo.extra.apiUrl` | `""` | No backend in any build using this default |
| `frontend/eas.json` → `build.preview.env.EXPO_PUBLIC_API_BASE_URL` | `""` | Preview is Play-Billing-only |
| `frontend/eas.json` → `build.production.env.EXPO_PUBLIC_API_BASE_URL` | `""` | Production is Play-Billing-only |
| `frontend/eas.json` → `build.development.env.EXPO_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Local dev backend only |

## How the code handles an empty URL (fail loudly, never silently)

All three call sites resolve the URL through the shared module
`frontend/src/config/api.ts` (`resolveApiUrl()` / `requireApiUrl()`):

- **`src/SubscriptionContext.tsx`** — subscription status check: when no
  URL is configured it logs an explicit warning
  ("No backend API URL configured — skipping server subscription check
  (Play-Billing-only build…)") and falls back to the cached status. On
  Android the Play entitlement is the source of truth, so skipping is
  correct there — but it is now visible, not silent.
- **`src/SubscriptionContext.tsx`** — purchase reporting: when a Play
  purchase is recorded with no backend configured, it logs that the
  purchase was recorded locally only.
- **`app/paywall.tsx`** — non-Android Stripe checkout: shows the user a
  "Checkout unavailable" alert with the full config explanation instead of
  attempting a fetch against `""` (which would resolve to a meaningless
  relative `/api/...` URL).
- **`app/settings.tsx`** — Stripe cancel: same loud alert ("Cancel
  unavailable") when no backend is configured. Google Play cancellations
  are unaffected — they open Play Store subscriptions.

Unit tests for this behaviour: `frontend/src/config/api.test.mjs`
(run `node --test frontend/src/config/api.test.mjs`).

## Enabling the Stripe backend (needs Matt)

Do **not** invent a production API URL, and do not put a placeholder URL in
`app.json`/`eas.json`. To use the FastAPI Stripe backend (`backend/server.py`)
in a build, Matt must:

1. Deploy the backend somewhere public and give its real HTTPS URL.
2. Set that URL as `EXPO_PUBLIC_API_BASE_URL` in the `production` (and
   `preview`, if wanted) profile in `frontend/eas.json`, or as `extra.apiUrl`
   in `frontend/app.json`.
3. Configure the backend's env (`MONGO_URL`, `DB_NAME`,
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, Stripe price IDs) — see
   `backend/.env.example`. Never commit a real `.env`.

Until then, the Stripe backend code is dead code in production builds: it is
kept (and now covered by backend tests) for the non-Android fallback and for
a future hosted deployment, not for the Play release.
