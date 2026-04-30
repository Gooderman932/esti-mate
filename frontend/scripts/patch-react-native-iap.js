/**
 * Postinstall patch: removes the Amazon product flavor from react-native-iap.
 *
 * react-native-iap ships with two Android product flavors (amazon + play).
 * AGP 8.x cannot resolve the variant ambiguity even with missingDimensionStrategy,
 * so we strip the amazon flavor entirely — leaving only play.
 */
const fs = require('fs');
const path = require('path');

const buildGradlePath = path.join(
  __dirname,
  '../node_modules/react-native-iap/android/build.gradle'
);

if (!fs.existsSync(buildGradlePath)) {
  console.log('[patch-iap] react-native-iap/android/build.gradle not found, skipping');
  process.exit(0);
}

let content = fs.readFileSync(buildGradlePath, 'utf8');

if (!content.includes('amazon')) {
  console.log('[patch-iap] Already patched, skipping');
  process.exit(0);
}

// Remove the amazon product flavor block
content = content.replace(/\s*amazon\s*\{\s*\n\s*dimension\s+"store"\s*\n\s*\}/g, '');

// Remove the amazonImplementation dependency line
content = content.replace(/[ \t]*amazonImplementation[^\n]+\n/g, '');

fs.writeFileSync(buildGradlePath, content);
console.log('[patch-iap] Patched react-native-iap: removed amazon product flavor');
