/**
 * AudioStreamer handles microphone input capture and audio playback.
 * It uses the Web Audio API to process PCM data at the required sample rates.
 */

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private microphoneStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private playbackQueue: Int16Array[] = [];
  private activeNodes: AudioBufferSourceNode[] = [];
  private isProcessingPlayback = false;
  private nextStartTime = 0;
  private initialBufferTime = 0.05; // Further reduced for lower latency

  constructor(private sampleRate: number = 16000) {}

  async startMicrophone(onAudioData: (base64Data: string) => void) {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    try {
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        } 
      });
      this.source = this.audioContext.createMediaStreamSource(this.microphoneStream);

      const bufferSize = 2048; // Slightly larger buffer for stability
      const scriptNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      scriptNode.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7fff;
        }
        
        // Fast conversion using TextDecoder or chunking, but for PCM btoa(String.fromCharCode) is standard
        // Modern approach:
        const buffer = pcmData.buffer;
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        onAudioData(base64);
      };

      this.source.connect(scriptNode);
      scriptNode.connect(this.audioContext.destination);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      throw err;
    }
  }

  stopMicrophone() {
    this.microphoneStream?.getTracks().forEach(track => track.stop());
    this.source?.disconnect();
    this.source = null;
  }

  async addPlaybackChunk(base64Data: string) {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    this.playbackQueue.push(int16);
    
    if (!this.isProcessingPlayback) {
      this.processPlayback();
    }
  }

  private async processPlayback() {
    if (this.playbackQueue.length === 0 || !this.audioContext) {
      this.isProcessingPlayback = false;
      return;
    }

    this.isProcessingPlayback = true;

    while (this.playbackQueue.length > 0) {
      const chunk = this.playbackQueue.shift()!;
      const float32 = new Float32Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) {
        float32[i] = chunk[i] / 0x7fff;
      }

      const buffer = this.audioContext.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);

      const currentTime = this.audioContext.currentTime;
      
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + this.initialBufferTime;
      }

      source.start(this.nextStartTime);
      this.activeNodes.push(source);
      
      source.onended = () => {
        this.activeNodes = this.activeNodes.filter(n => n !== source);
      };

      this.nextStartTime += buffer.duration;
    }

    this.isProcessingPlayback = false;
  }

  stopPlayback() {
    // AGGRESSIVELY stop all nodes
    this.activeNodes.forEach(node => {
      try {
        node.stop();
        node.onended = null;
        node.disconnect();
      } catch (e) {
        // Ignored
      }
    });
    this.activeNodes = [];
    this.playbackQueue = [];
    this.nextStartTime = 0;
    this.isProcessingPlayback = false;
  }

  hasPendingPlayback() {
    return this.playbackQueue.length > 0 || this.activeNodes.length > 0;
  }

  async close() {
    this.stopMicrophone();
    this.stopPlayback();
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }
}


