import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aurawav.player',
  appName: 'AURA.WAV',
  webDir: 'dist',
  bundledWebRuntime: false,
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
    scheme: 'AURA.WAV',
    backgroundColor: '#0A0A0E',
  },
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    // Custom native bridge plugins configured here
  }
};

export default config;
