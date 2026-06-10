/**
 * Expo config plugin for react-native-iap
 *
 * Injects the Play Store flavor dimension strategy into android/app/build.gradle
 * so the Google Play Billing variant of react-native-iap is selected.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withRNIAP(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes("missingDimensionStrategy 'store'")) {
      return config;
    }
    config.modResults.contents = config.modResults.contents.replace(
      /defaultConfig \{/,
      "defaultConfig {\n        missingDimensionStrategy 'store', 'play'"
    );
    return config;
  });
};
