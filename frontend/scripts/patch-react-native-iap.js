/**
 * Postinstall patch for react-native-iap:
 *
 * 1. Removes the Amazon product flavor from build.gradle
 *    (AGP 8.x cannot resolve the variant ambiguity even with
 *    missingDimensionStrategy, so we strip amazon and leave only play).
 *
 * 2. Fixes `currentActivity` in RNIapModule.kt for New Architecture.
 *    The synthetic property `currentActivity` was removed from
 *    ReactContextBaseJavaModule in RN 0.80+. Replace every bare reference
 *    with `reactApplicationContext.currentActivity`, the correct accessor.
 */
const fs = require('fs');
const path = require('path');

const iapAndroid = path.join(
  __dirname,
  '../node_modules/react-native-iap/android'
);

// ── Patch 1: remove Amazon product flavor ─────────────────────────────────────
const buildGradlePath = path.join(iapAndroid, 'build.gradle');

if (!fs.existsSync(buildGradlePath)) {
  console.log('[patch-iap] react-native-iap/android/build.gradle not found, skipping');
  process.exit(0);
}

let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

if (!buildGradle.includes('amazon')) {
  console.log('[patch-iap] Flavor patch already applied, skipping');
} else {
  buildGradle = buildGradle.replace(/\s*amazon\s*\{\s*\n\s*dimension\s+"store"\s*\n\s*\}/g, '');
  buildGradle = buildGradle.replace(/[ \t]*amazonImplementation[^\n]+\n/g, '');
  fs.writeFileSync(buildGradlePath, buildGradle);
  console.log('[patch-iap] Patched build.gradle: removed amazon product flavor');
}

// ── Patch 2: fix currentActivity for New Architecture ─────────────────────────
const rniapModulePath = path.join(
  iapAndroid,
  'src/play/java/com/dooboolab/rniap/RNIapModule.kt'
);

if (!fs.existsSync(rniapModulePath)) {
  console.log('[patch-iap] RNIapModule.kt not found, skipping currentActivity patch');
  process.exit(0);
}

let rniapModule = fs.readFileSync(rniapModulePath, 'utf8');

if (rniapModule.includes('reactApplicationContext.currentActivity')) {
  console.log('[patch-iap] currentActivity patch already applied, skipping');
} else {
  // Replace every standalone `currentActivity` (not already preceded by a dot)
  // with `reactApplicationContext.currentActivity`. The nullable Activity? is
  // consistent with how the property was typed before; existing null-checks in
  // the module continue to work unchanged.
  rniapModule = rniapModule.replace(
    /(?<!\.)\bcurrentActivity\b/g,
    'reactApplicationContext.currentActivity'
  );
  fs.writeFileSync(rniapModulePath, rniapModule);
  console.log('[patch-iap] Patched RNIapModule.kt: replaced currentActivity with reactApplicationContext.currentActivity');
}
