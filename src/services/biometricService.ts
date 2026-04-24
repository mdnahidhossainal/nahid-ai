import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

class BiometricService {
  private isWeb = Capacitor.getPlatform() === 'web';

  async isAvailable(): Promise<boolean> {
    if (this.isWeb) return false;
    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (e) {
      console.warn('Biometric not supported on this platform/device');
      return false;
    }
  }

  async getBiometryType(): Promise<BiometryType | null> {
    if (this.isWeb) return null;
    try {
      const result = await NativeBiometric.isAvailable();
      return result.biometryType || null;
    } catch (e) {
      return null;
    }
  }

  async authenticate(reason: string = 'অ্যাক্সেস যাচাই করার জন্য আপনার বায়োমেট্রিক দিন'): Promise<boolean> {
    if (this.isWeb) return false;
    try {
      await NativeBiometric.verifyIdentity({
        reason,
        title: 'Authentication Required',
        subtitle: 'Please verify your identity',
        description: 'Use your fingerprint or face to continue',
      });
      return true;
    } catch (e: any) {
      if (e.message?.includes('not implemented')) {
        console.warn('Biometric verifyIdentity not implemented on this platform');
      } else {
        console.error('Biometric authentication failed', e);
      }
      return false;
    }
  }

  // Support for persistent credentials (optional enhancement)
  async setCredentials(username: string, password: string): Promise<void> {
    if (this.isWeb) return;
    try {
      await NativeBiometric.setCredentials({
        username,
        password,
        server: 'nahid-ai-app',
      });
    } catch (e) {}
  }

  async getCredentials(): Promise<{ username: string; password: string } | null> {
    if (this.isWeb) return null;
    try {
      return await NativeBiometric.getCredentials({
        server: 'nahid-ai-app',
      });
    } catch (e) {
      return null;
    }
  }

  async deleteCredentials(): Promise<void> {
    if (this.isWeb) return;
    try {
      await NativeBiometric.deleteCredentials({
        server: 'nahid-ai-app',
      });
    } catch (e) {}
  }
}

export const biometricService = new BiometricService();
