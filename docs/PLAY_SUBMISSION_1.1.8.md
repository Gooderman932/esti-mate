# Esti-Mate Pro 1.1.8 (versionCode 104) — Google Play submission

Package: `com.poordudeholdings.estimatemobile`

## Why this update

Google Play requires every app update submitted after the 2026 deadline
(extension window ended Nov 1, 2026) to:

| Requirement | This build | How verified |
|---|---|---|
| Target Android 16 (API 36) | `targetSdkVersion 36`, `compileSdkVersion 36` | Expo SDK 54 / React Native 0.81 defaults; checked in generated `android/build.gradle` and a local `bundleRelease` |
| Play Billing Library 8+ | `com.android.billingclient:billing-ktx:8.3.0` | via `react-native-iap` 14.7 → `openiap-google` 1.3.28 |

## What changed in 1.1.8

- Version bump: 1.1.7 (103) → 1.1.8 (104).
- Billing: pending purchases are no longer granted or acknowledged until paid.
- Billing: when Google Play reports no active subscription, a cached Pro or
  Enterprise entitlement from Google Play drops back to Free (it used to stay unlocked
  after a cancellation or refund).
- Production and preview builds no longer call the placeholder
  `api.estimate.example.com`. Android uses Google Play Billing on the device
  and sends no user data to a developer server.
- Removed permissions: `RECORD_AUDIO` (the app never records audio) and
  `SYSTEM_ALERT_WINDOW`.
- Removed the unused Stripe native SDK from the Android app.
- Expo SDK 54 packages aligned to the expected patch versions; duplicate React
  Navigation copies removed; `react-native-nitro-modules` (needed by billing)
  declared explicitly. `expo-doctor`: 18/18 checks pass.
- App icons made exactly 512×512 (they were 512×513).
- GitHub EAS workflows fixed (`secrets` can't be used in a job-level `if`).

## Release notes (paste into "What's new", en-US)

```
Updated for Android 16 and the latest Google Play Billing.
Subscriptions now update correctly when a plan is canceled, expires, or a payment is still pending.
Removed unused microphone and overlay permissions.
Stability and dependency updates.
```

## Build (on your computer)

```bash
cd ~/esti-mate && git fetch origin && git checkout release/1.1.8-play-api36 && git pull
cd frontend && npm ci
npx expo-doctor
EAS_SKIP_AUTO_FINGERPRINT=1 eas build --platform android --profile production
```

EAS signs with the upload key registered in Play Console
(App integrity → App signing → Upload key certificate). If Play reports a
certificate mismatch, check that SHA-1 against `eas credentials -p android`
before trying anything else.

Merge PR into `main` after the internal-track checks below pass.

## Play Console steps

1. Test and release → Internal testing → Create new release → upload the `.aab`.
2. Confirm the bundle shows version code 104 and target SDK 36.
3. Paste the release notes above → Save → Review release → Roll out.
4. Install from the internal test link on a real device and run the checks below.
5. Promote the same release to Closed or Production testing once the checks pass.

### Policy items to re-check before you promote to Production

- Permissions: the bundle should request only `CAMERA`, `INTERNET`,
  `VIBRATE`, `BILLING`, plus legacy storage (needed by the photo picker on
  Android 12 and older; ignored on Android 13+). No microphone.
- Data safety: this build sends no user data to developer servers (Google
  Play processes payments). If your current form still lists data that the old
  backend received, update it to match.
- Feature graphic and screenshots must show the real app UI (an earlier
  update was rejected under the Metadata policy for the feature graphic).
- Subscriptions `pro_monthly` and `enterprise_monthly` must be Active with a
  base plan.

## On-device checks (internal track build)

- [ ] App launches without crashing, and all tabs open.
- [ ] Create an estimate, add a photo with the camera and from the gallery, and export or share the PDF.
- [ ] Auto-measure camera screen opens and asks only for camera access (no microphone prompt).
- [ ] Paywall lists Pro and Enterprise prices from Google Play.
- [ ] A license-tester purchase unlocks the tier. Restore Purchases works after reinstalling.
- [ ] After canceling in Play test subscriptions and letting the plan expire, reopening the app returns it to Free.
