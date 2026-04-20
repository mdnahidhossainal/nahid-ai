import { Modality } from "@google/genai";

export interface LiveConfig {
  model: string;
  systemInstruction?: string;
  responseModalities?: Modality[];
  speechConfig?: {
    voiceConfig?: {
      prebuiltVoiceConfig?: {
        voiceName: string;
      };
    };
  };
}

export interface LiveServerMessage {
  serverContent?: {
    modelTurn?: {
      parts: Array<{
        inlineData: {
          data: string;
          mimeType: string;
        };
      }>;
    };
    interrupted?: boolean;
    turnComplete?: boolean;
  };
  realtimeInput?: {
    mediaChunks?: Array<{
      mimeType: string;
      data: string;
    }>;
  };
}
