import { Camera } from '@capacitor/camera';
import { AppLauncher } from '@capacitor/app-launcher';
import { Device } from '@capacitor/device';

/**
 * DeviceControlService - Interface for hardware control
 */
export const DeviceControlService = {
  // Flashlight / Torch
  async toggleTorch(state: boolean) {
    try {
      // Flashlight isn't a direct standard Capacitor API in all versions, 
      // often handled via camera plugin or specific flashlight plugins.
      console.log(`Hardware: Torch ${state ? 'ON' : 'OFF'}`);
      return true;
    } catch (e) {
      console.error("Torch control failed", e);
      return false;
    }
  },

  // Open external apps
  async openApp(appName: string) {
    try {
      let scheme = '';
      if (appName.toLowerCase().includes('facebook')) scheme = 'fb://';
      if (appName.toLowerCase().includes('whatsapp')) scheme = 'whatsapp://';
      if (appName.toLowerCase().includes('settings')) scheme = 'com.android.settings';

      if (scheme) {
        const canOpen = await AppLauncher.canOpenUrl({ url: scheme });
        if (canOpen) {
          await AppLauncher.openUrl({ url: scheme });
          return true;
        }
      }
      console.log(`Hardware: Attempting to launch ${appName}`);
      return false;
    } catch (e) {
      return false;
    }
  },

  // Get Device Info for context
  async getSystemStatus() {
    try {
      const info = await Device.getInfo();
      const battery = await Device.getBatteryInfo();
      return {
        model: info.model,
        platform: info.platform,
        os: info.osVersion,
        batteryLevel: Math.round((battery.batteryLevel || 0) * 100),
        isCharging: battery.isCharging
      };
    } catch (e) {
      return null;
    }
  }
};
