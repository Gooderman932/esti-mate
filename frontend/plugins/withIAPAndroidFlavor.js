const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withIAPAndroidFlavor(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes("missingDimensionStrategy 'store', 'play'")) {
      return config;
    }
    config.modResults.contents = contents.replace(
      /defaultConfig\s*\{/,
      `defaultConfig {\n            missingDimensionStrategy 'store', 'play'`
    );
    return config;
  });
};
