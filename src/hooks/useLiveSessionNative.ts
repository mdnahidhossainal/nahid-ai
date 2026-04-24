import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { NativeAudioStreamer } from '../lib/native-audio-streamer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as KeepAwake from 'expo-keep-awake';
import { Platform, NativeModules } from 'react-native';

const { NahidOfflineAI } = NativeModules;

export function useLiveSessionNative() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [latestAction, setLatestAction] = useState<{ type: string; pos?: { x: number; y: number }; timestamp: number } | null>(null);
  
  const audioStreamerRef = useRef<NativeAudioStreamer | null>(null);
  const sessionRef = useRef<any>(null);
  const transcriptRef = useRef<{ role: 'user' | 'model'; text: string }[]>([]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const [engineStatus, setEngineStatus] = useState<any>(null);

  useEffect(() => {
    const checkStatus = async () => {
       if (NahidOfflineAI) {
          try {
            const status = await NahidOfflineAI.getEngineStatus();
            setEngineStatus(status);
          } catch (e) {
            setEngineStatus({ isNative: false, error: "Module present but failed to query" });
          }
       } else {
          setEngineStatus({ isNative: false, reason: "Browser Preview / Simulator Mode" });
       }
    };
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

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

  const connect = useCallback(async (assistantName: string, assistantVoice: string, forceOffline: boolean = false) => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);

    // CHECK FOR OFFLINE ENGINE START
    if (forceOffline) {
       console.log("ইনিশিয়ালাইজিং অফলাইন ইঞ্জিন...");
       try {
         const installed = await NahidOfflineAI?.isModelInstalled();
         if (!installed?.installed) {
           setError("মডেল পাওয়া যায়নি। দয়া করে সেটিংস থেকে মডেল ডাউনলোড করুন।");
           setIsConnecting(false);
           return;
         }
         await NahidOfflineAI.initializeInference();
         setIsConnected(true);
         setIsConnecting(false);
         setTranscript([{ role: 'model', text: "আসসালামু আলাইকুম! অফলাইন ইঞ্জিন সক্রিয়। আমি এখন ইন্টারনেট ছাড়াই আপনার সাথে কথা বলতে পারব।" }]);
         return;
       } catch (e: any) {
         setError(`অফলাইন ইঞ্জিন লোড হতে ব্যর্থ হয়েছে: ${e.message}`);
         setIsConnecting(false);
         return;
       }
    }

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
          tools: [
            {
              functionDeclarations: [
                {
                  name: "get_screen_content",
                  description: "Get the current screen hierarchy and content of the user's phone to see what is happening.",
                  parameters: { type: Type.OBJECT, properties: {} }
                },
                {
                  name: "perform_action",
                  description: "Perform a system action like Click, Back, Home, or Recents.",
                  parameters: { 
                    type: Type.OBJECT, 
                    properties: { 
                      type: { type: Type.STRING, description: "Action type: click, back, home, recents, notifications, quicksettings" },
                      viewId: { type: Type.STRING, description: "ID of the view to click (only for click type)" }
                    },
                    required: ["type"]
                  }
                }
              ]
            }
          ],
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
              
              // Tool Handling
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.functionCall) {
                  const { name, args, callId } = part.functionCall;
                  console.log(`Handling Tool Call: ${name}`, args);
                  
                  let result = {};
                  try {
                    if (name === "get_screen_content") {
                      result = await NahidOfflineAI.getScreenContent();
                      setLatestAction({ type: 'vision', timestamp: Date.now() });
                    } else if (name === "perform_action") {
                      result = await NahidOfflineAI.performScreenAction(args);
                      setLatestAction({ type: args.type, timestamp: Date.now() });
                    }
                  } catch (e: any) {
                    result = { error: e.message };
                  }

                  sessionRef.current?.sendRealtimeInput([{
                    functionResponse: {
                      name,
                      response: { result },
                      callId
                    }
                  }]);
                }
              }
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
            if (err.message && err.message.includes('1006')) {
              setError("সার্ভার থেকে সংযোগ বিচ্ছিন্ন! (Code: 1006)");
            } else {
              setError(err.message || "কানেকশন এরর হয়েছে");
            }
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

  const sendMessageOffline = async (text: string) => {
    if (!NahidOfflineAI) return;
    
    setTranscript(prev => [...prev, { role: 'user', text }]);
    
    try {
      // Real Gemma Formatting for local inference
      const formattedPrompt = `<start_of_turn>user\n${text}<end_of_turn>\n<start_of_turn>model\n`;
      const result = await NahidOfflineAI.generateResponse({ prompt: formattedPrompt });
      
      if (result && result.response) {
        setTranscript(prev => [...prev, { role: 'model', text: result.response }]);
      }
    } catch (e: any) {
      setError(`অফলাইন এআই ত্রুটি: ${e.message}`);
    }
  };

  return {
    isConnected,
    isConnecting,
    isSpeaking,
    isMuted,
    error,
    transcript,
    engineStatus,
    latestAction,
    connect,
    disconnect,
    sendMessageOffline,
    setTranscript,
    sendMessageOnline: useCallback((text: string) => {
      if (sessionRef.current && isConnected) {
        try {
          sessionRef.current.sendRealtimeInput({ text });
          setTranscript(prev => [...prev, { role: 'user', text }]);
          return true;
        } catch (e) {
          console.error("Failed to send online text message", e);
          return false;
        }
      }
      return false;
    }, [isConnected])
  };
}
