/**
 * Postinstall patch: fixes react-native-iap for React Native 0.80+ new architecture.
 *
 * Patch 1 (build.gradle): removes the Amazon product flavor.
 *   react-native-iap ships with two Android product flavors (amazon + play).
 *   AGP 8.x cannot resolve the variant ambiguity even with missingDimensionStrategy,
 *   so we strip the amazon flavor entirely — leaving only play.
 *
 * Patch 2 (RNIapModule.kt): fixes `currentActivity` unresolved reference.
 *   RN 0.80 removed `currentActivity` from ReactContextBaseJavaModule.
 *   Replace with `reactContext.currentActivity` and add `!!` where needed
 *   inside the lambda that captures the already-null-checked Activity.
 */
const fs = require('fs');
const path = require('path');

// --- Patch 1: build.gradle ---

const buildGradlePath = path.join(
  __dirname,
  '../node_modules/react-native-iap/android/build.gradle'
);

if (!fs.existsSync(buildGradlePath)) {
  console.log('[patch-iap] react-native-iap/android/build.gradle not found, skipping');
} else {
  let content = fs.readFileSync(buildGradlePath, 'utf8');

  if (content.includes('amazonImplementation')) {
    content = content.replace(/\s*amazon\s*\{\s*\n\s*dimension\s+"store"\s*\n\s*\}/g, '');
    content = content.replace(/[ \t]*amazonImplementation[^\n]+\n/g, '');
    fs.writeFileSync(buildGradlePath, content);
    console.log('[patch-iap] Patched build.gradle: removed amazon product flavor');
  } else {
    console.log('[patch-iap] build.gradle already patched, skipping');
  }
}

// --- Patch 2: RNIapModule.kt ---

const ktPath = path.join(
  __dirname,
  '../node_modules/react-native-iap/android/src/play/java/com/dooboolab/rniap/RNIapModule.kt'
);

if (!fs.existsSync(ktPath)) {
  console.log('[patch-iap] RNIapModule.kt not found, skipping');
} else {
  let kt = fs.readFileSync(ktPath, 'utf8');
  let changed = false;

  // Fix 1: `currentActivity` → `reactContext.currentActivity`
  // (currentActivity was removed from ReactContextBaseJavaModule in RN 0.80)
  if (kt.includes('val activity = currentActivity')) {
    kt = kt.replace(
      'val activity = currentActivity',
      'val activity = reactContext.currentActivity'
    );
    changed = true;
  }

  // Fix 2: inside the ensureConnection lambda, Kotlin can't smart-cast `activity`
  // across the lambda boundary even after the null check above, so use `!!`.
  if (kt.includes('billingClient.launchBillingFlow(activity, flowParams)')) {
    kt = kt.replace(
      'billingClient.launchBillingFlow(activity, flowParams)',
      'billingClient.launchBillingFlow(activity!!, flowParams)'
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(ktPath, kt);
    console.log('[patch-iap] Patched RNIapModule.kt: fixed currentActivity for new architecture');
  } else {
    console.log('[patch-iap] RNIapModule.kt already patched, skipping');
  }
}
