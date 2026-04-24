import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
const cacheDir = (FileSystem as any).cacheDirectory;
const encodingBase64 = (FileSystem as any).EncodingType?.Base64;
import { Buffer } from 'buffer';

export class NativeAudioStreamer {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private isRecording = false;
  private sampleRate: number;

  constructor(sampleRate: number = 16000) {
    this.sampleRate = sampleRate;
  }

  async startMicrophone(onAudioChunk: (base64Data: string) => void) {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') throw new Error('Microphone permission not granted');

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync({
        android: {
          extension: '.pcm',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: this.sampleRate,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.MIN,
          sampleRate: this.sampleRate,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {} as any
      });

      this.recording.setOnRecordingStatusUpdate(async (status) => {
        if (status.canRecord && status.isRecording) {
            // Real-time chunking in Expo is tricky without native modules, 
            // but we can simulate it or use specialized libraries for Replit.
            // For now, we use a basic implementation.
        }
      });

      await this.recording.startAsync();
      this.isRecording = true;
    } catch (error) {
      console.error('Failed to start native microphone', error);
      throw error;
    }
  }

  async stopMicrophone() {
    if (this.recording) {
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
    }
    this.isRecording = false;
  }

  async addPlaybackChunk(base64Data: string) {
    // In Expo, playing raw PCM chunks in real-time requires a buffer-to-file or specialized bridge.
    // We will use a Buffer mechanism to play the response from Gemini.
    try {
        const fileUri = `${cacheDir}chunk_${Date.now()}.wav`;
        await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: encodingBase64 });
        
        const { sound } = await Audio.Sound.createAsync({ uri: fileUri });
        this.sound = sound;
        await sound.playAsync();
        
        // Clean up after play
        sound.setOnPlaybackStatusUpdate((status) => {
           if (status.isLoaded && status.didJustFinish) {
              FileSystem.deleteAsync(fileUri).catch(() => {});
              sound.unloadAsync();
           }
        });
    } catch (e) {
        console.error("Playback failed", e);
    }
  }

  async stopPlayback() {
    if (this.sound) {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
    }
  }

  async close() {
    await this.stopMicrophone();
    await this.stopPlayback();
  }
}
