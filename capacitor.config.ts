import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saman.inventory',
  appName: 'SAMAN Inventory',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
