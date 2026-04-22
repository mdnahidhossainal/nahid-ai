import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';

class BiometricService {
  async isAvailable(): Promise<boolean> {
    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (e) {
      console.error('Biometric is not available', e);
      return false;
    }
  }

  async getBiometryType(): Promise<BiometryType | null> {
    try {
      const result = await NativeBiometric.isAvailable();
      return result.biometryType || null;
    } catch (e) {
      return null;
    }
  }

  async authenticate(reason: string = 'অ্যাক্সেস যাচাই করার জন্য আপনার বায়োমেট্রিক দিন'): Promise<boolean> {
    try {
      await NativeBiometric.verifyIdentity({
        reason,
        title: 'Authentication Required',
        subtitle: 'Please verify your identity',
        description: 'Use your fingerprint or face to continue',
      });
      return true;
    } catch (e) {
      console.error('Biometric authentication failed', e);
      return false;
    }
  }

  // Support for persistent credentials (optional enhancement)
  async setCredentials(username: string, password: string): Promise<void> {
    await NativeBiometric.setCredentials({
      username,
      password,
      server: 'nahid-ai-app',
    });
  }

  async getCredentials(): Promise<{ username: string; password: string } | null> {
    try {
      return await NativeBiometric.getCredentials({
        server: 'nahid-ai-app',
      });
    } catch (e) {
      return null;
    }
  }

  async deleteCredentials(): Promise<void> {
    await NativeBiometric.deleteCredentials({
      server: 'nahid-ai-app',
    });
  }
}

export const biometricService = new BiometricService();
