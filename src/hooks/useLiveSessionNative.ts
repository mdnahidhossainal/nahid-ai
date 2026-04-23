import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { NativeAudioStreamer } from '../lib/native-audio-streamer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as KeepAwake from 'expo-keep-awake';
import { Platform } from 'react-native';

export function useLiveSessionNative() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  
  const audioStreamerRef = useRef<NativeAudioStreamer | null>(null);
  const sessionRef = useRef<any>(null);
  const transcriptRef = useRef<{ role: 'user' | 'model'; text: string }[]>([]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const disconnect = useCallback(async () => {
    console.log("Disconnecting session...");
    try {
      await KeepAwake.deactivateKeepAwake();
    } catch (e) {}

    if (sessionRef.current) {
      try { await sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    if (audioStreamerRef.current) {
      try { await audioStreamerRef.current.close(); } catch (e) {}
      audioStreamerRef.current = null;
    }
    setIsConnected(false);
    setIsSpeaking(false);
    setIsConnecting(false);
  }, []);

  const connect = useCallback(async (assistantName: string, assistantVoice: string) => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);

    const apiKey = await AsyncStorage.getItem('nahid_gemini_api_key');
    if (!apiKey) {
      setError("API Key খুঁজে পাওয়া যায়নি। সেটিংসে গিয়ে কি (Key) সেট করুন।");
      setIsConnecting(false);
      return;
    }

    try {
      await KeepAwake.activateKeepAwake();
      
      // Get context from AsyncStorage
      const savedProfile = await AsyncStorage.getItem('nahid_profile');
      const userProfile = savedProfile ? JSON.parse(savedProfile) : { userName: 'Mohammad Nahid', nickName: 'বন্ধু' };
      const memoryData = (await AsyncStorage.getItem('nahid_memory')) || "";

      const ai = new GoogleGenAI({ apiKey });
      audioStreamerRef.current = new NativeAudioStreamer(16000);

      const session = (ai.live as any).connect({
        model: "gemini-3.1-flash-live-preview", 
        config: {
          systemInstruction: `You are ${assistantName}, a professional Native AI Assistant created by Mohammad Nahid.
          Identity: ${assistantName}
          User: ${userProfile.nickName}
          Current Time: ${new Date().toLocaleString()}
          
          Strict Conversational Rules:
          - Always respond in Bengali (বাংলা) naturally and concisely.
          - DO NOT use mandatory introductory phrases unless specifically asked for a formal greeting.
          - BE DIRECT: Answer questions immediately and perform tasks without fluff.
          - HONESTY: Never hallucinate. Be strictly grounded in facts.
          - TIME AWARENESS: Use the current time to be context-aware.
          ${memoryData ? `USER LONG-TERM MEMORY: ${memoryData}` : ""}`,
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: assistantVoice }
            }
          }
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            
            // Initial greeting text sent silently to trigger AI's first message
            const greetText = `আসসালামু আলাইকুম! আমি ${assistantName}। আপনাকে কীভাবে সাহায্য করতে পারি?`;
            sessionRef.current?.sendRealtimeInput({ text: greetText });

            // Start Native Recording
            audioStreamerRef.current?.startMicrophone((base64Data) => {
              if (sessionRef.current) {
                sessionRef.current.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              }
            });
          },
          onmessage: async (message: any) => {
            if (message.serverContent?.modelTurn?.parts) {
              const text = message.serverContent.modelTurn.parts.map((p: any) => p.text).join(' ');
              if (text) setTranscript(prev => [...prev, { role: 'model', text }]);
            }
            if (message.serverContent?.modelTurn) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  setIsSpeaking(true);
                  audioStreamerRef.current?.addPlaybackChunk(part.inlineData.data);
                }
              }
            }
          },
          onclose: () => disconnect(),
          onerror: (err: any) => {
            setError(err.message);
            disconnect();
          }
        }
      });

      sessionRef.current = await session;
    } catch (err: any) {
      setError("কানেকশন সেটআপ করা যায়নি।");
      disconnect();
    }
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    isSpeaking,
    isMuted,
    error,
    transcript,
    connect,
    disconnect
  };
}
