import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.poordudeholdings.estimatemobile',
  appName: 'Esti-Mate',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0f1a',
      showSpinner: true,
      spinnerColor: '#f97316',
      androidScaleType: 'CENTER_CROP',
    },
    Camera: {
      permissions: ['camera'],
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0f1a',
    },
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0f1a',
  },
};

export default config;
