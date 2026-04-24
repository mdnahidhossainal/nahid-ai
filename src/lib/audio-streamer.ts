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
  private initialBufferTime = 0.01; // Tiny buffer for sub-20ms latency

  constructor(private sampleRate: number = 16000) {}

  async startMicrophone(onAudioData: (base64Data: string) => void) {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    }
    
    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch (e) {
      console.warn("AudioContext resume failed:", e);
    }

    try {
      if (this.microphoneStream) {
        this.stopMicrophone(); // Ensure previous is stopped
      }
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        } 
      });

      if (!this.audioContext || !this.microphoneStream) {
        console.error("AudioStreamer: AudioContext or microphoneStream is null");
        return;
      }

      try {
        this.source = this.audioContext.createMediaStreamSource(this.microphoneStream);
      } catch (err) {
        console.error("AudioStreamer: Failed to create media stream source", err);
        return;
      }

      const bufferSize = 1024;
      const scriptNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      scriptNode.onaudioprocess = (event) => {
        if (!this.source) return; // Stop processing if disconnected
        const inputData = event.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7fff;
        }
        
        // Highly optimized Base64 conversion for real-time streaming
        const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(pcmData.buffer) as unknown as number[]));
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

  async resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
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


