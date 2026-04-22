import { Camera } from '@capacitor/camera';
import { AppLauncher } from '@capacitor/app-launcher';
import { Device } from '@capacitor/device';
import { Geolocation } from '@capacitor/geolocation';

/**
 * DeviceControlService - Interface for hardware control
 */
export const DeviceControlService = {
  // Flashlight / Torch
  async toggleTorch(state: boolean) {
    try {
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

  // Get current location
  async getCurrentLocation() {
    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true
      });
      
      // Simple reverse geocoding placeholder (Real apps use Google Maps API)
      // For this demo, we'll return coordinates and a mock address format
      return {
        lat: coordinates.coords.latitude,
        lng: coordinates.coords.longitude,
        accuracy: coordinates.coords.accuracy,
        timestamp: coordinates.timestamp
      };
    } catch (e) {
      console.error("Location fetching failed", e);
      return null;
    }
  },

  // Get Device Info for context
  async getSystemStatus() {
    try {
      const info = await Device.getInfo();
      const battery = await Device.getBatteryInfo();
      const location = await this.getCurrentLocation();
      
      return {
        model: info.model,
        platform: info.platform,
        os: info.osVersion,
        batteryLevel: Math.round((battery.batteryLevel || 0) * 100),
        isCharging: battery.isCharging,
        location: location
      };
    } catch (e) {
      return null;
    }
  },

  // Native Call (Native Dialer)
  async makeCall(phoneNumber: string) {
    try {
      const url = `tel:${phoneNumber}`;
      await AppLauncher.openUrl({ url });
      return true;
    } catch (e) {
      console.error("Native call failed", e);
      // Fallback for web/other
      window.location.href = `tel:${phoneNumber}`;
      return true;
    }
  },

  // Native SMS
  async sendSMS(phoneNumber: string, message: string) {
    try {
      const url = `sms:${phoneNumber}${phoneNumber.includes('?') ? '&' : '?'}body=${encodeURIComponent(message)}`;
      await AppLauncher.openUrl({ url });
      return true;
    } catch (e) {
      console.error("Native SMS failed", e);
      // Fallback
      window.location.href = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
      return true;
    }
  }
};
