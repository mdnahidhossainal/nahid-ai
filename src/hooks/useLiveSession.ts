import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AudioStreamer } from '@/lib/audio-streamer';
import { auth, saveSessionToCloud, addMemoryToCloud, updateSessionTitle } from '@/services/firebase';
import { DeviceControlService } from '@/services/device';

/**
 * useLiveSession - Custom hook for managing Gemini Live API session
 */
export function useLiveSession() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const sessionRef = useRef<any>(null);
  const isMutedRef = useRef(false);
  const transcriptRef = useRef<{ role: 'user' | 'model'; text: string }[]>([]);
  const currentSessionIdRef = useRef<string | null>(null);
  const hasGeneratedTitleRef = useRef(false);

  // Sync refs with state
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    transcriptRef.current = transcript;
    currentSessionIdRef.current = currentSessionId;

    // Trigger auto-titling if we have enough context and don't have a title yet
    if (transcript.length >= 2 && !hasGeneratedTitleRef.current && auth.currentUser && currentSessionId) {
      generateAndSaveTitle();
    }

    // Auto-save session periodically or on change
    if (transcript.length > 0 && auth.currentUser) {
      saveSession();
    }
  }, [transcript, currentSessionId]);

  const saveSession = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const sessionData = {
      title: hasGeneratedTitleRef.current ? undefined : "নতুন কথোপকথন",
      transcript: transcriptRef.current,
      date: new Date().toLocaleString()
    };
    
    try {
      const id = await saveSessionToCloud(uid, sessionData, currentSessionIdRef.current || undefined);
      if (!currentSessionIdRef.current) {
        setCurrentSessionId(id);
        currentSessionIdRef.current = id;
      }
    } catch (e) {
      console.error("Auto-save failed", e);
    }
  };

  const generateAndSaveTitle = async () => {
    if (hasGeneratedTitleRef.current || !currentSessionId || !auth.currentUser) return;
    hasGeneratedTitleRef.current = true;
    
    // Simple but effective title generation logic
    const firstFew = transcriptRef.current.slice(0, 4).map(t => t.text).join(' ');
    const apiKey = localStorage.getItem('nahid_gemini_api_key') || (import.meta as any).env?.VITE_GEMINI_API_KEY;
    
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Based on these messages from a chat, create a short (max 5 words) catchy title in Bengali. Messages: "${firstFew}"`;
        const response = await ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: prompt
        });
        const title = response.text.trim().replace(/["']/g, '');
        
        if (title && auth.currentUser) {
          await updateSessionTitle(auth.currentUser.uid, currentSessionId, title);
        }
      } catch (e) {
        console.error("Title generation failed", e);
        hasGeneratedTitleRef.current = false; // allow retry
      }
    }
  };

  const disconnect = useCallback(async () => {
    console.log("Disconnecting session...");
    
    const currentTranscript = transcriptRef.current;
    if (currentTranscript.length > 0) {
      // Local Backup
      const history = JSON.parse(localStorage.getItem('nahid_chat_history') || '[]');
      const firstUserMsg = currentTranscript.find(t => t.role === 'user')?.text || 'নতুন কথোপকথন';
      const title = firstUserMsg.slice(0, 30) + (firstUserMsg.length > 30 ? '...' : '');
      
      const newHistoryItem = {
        id: currentSessionIdRef.current || Date.now(),
        title: title,
        date: new Date().toLocaleString(),
        transcript: currentTranscript
      };
      
      localStorage.setItem('nahid_chat_history', JSON.stringify([newHistoryItem, ...history]));
    }

    if (sessionRef.current) {
      try {
        await sessionRef.current.close();
      } catch (e) {
        console.warn("Session close error:", e);
      }
      sessionRef.current = null;
    }
    if (audioStreamerRef.current) {
      try {
        await audioStreamerRef.current.close();
      } catch (e) {
        console.warn("AudioStreamer close error:", e);
      }
      audioStreamerRef.current = null;
    }
    setIsConnected(false);
    setIsSpeaking(false);
    setIsConnecting(false);
    
    // Do NOT clear sessionId or transcript here if we want to allow quick reconnect/resume check
    // Actually, usually disconnect means "end session" in the UI. 
    // If the user selects a new session, App.tsx will call connect() with it.
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const connect = useCallback(async (currentName?: string, currentVoice?: string, resumeSession?: any) => {
    if (isConnecting || isConnected) return;

    console.log("LOG: Attempting to connect to Gemini Live...");
    setIsConnecting(true);
    setError(null);
    setIsMuted(false);
    
    if (resumeSession) {
      setCurrentSessionId(resumeSession.id || resumeSession.id?.toString() || null);
      currentSessionIdRef.current = resumeSession.id || resumeSession.id?.toString() || null;
      setTranscript(resumeSession.transcript || []);
      hasGeneratedTitleRef.current = !!resumeSession.title && resumeSession.title !== "নতুন কথোপকথন";
    } else {
      setCurrentSessionId(null);
      currentSessionIdRef.current = null;
      setTranscript([]);
      hasGeneratedTitleRef.current = false;
    }

    const apiKey = localStorage.getItem('nahid_gemini_api_key') || (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      setError("Gemini API Key খুঁজে পাওয়া যায়নি।");
      setIsConnecting(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      audioStreamerRef.current = new AudioStreamer(16000);
      
      // Connection timeout... (keep existing logic)
      const timeoutId = setTimeout(() => {
        if (isConnecting) {
          setError("কানেকশন নিতে অনেক সময় লাগছে। আবার চেষ্টা করুন।");
          setIsConnecting(false);
          disconnect();
        }
      }, 25000);

      // Previous History Context for Resuming
      const prevContext = resumeSession?.transcript ? 
        `PREVIOUS CONVERSATION CONTEXT:\n${resumeSession.transcript.map((t: any) => `${t.role}: ${t.text}`).join('\n')}\n\nPlease resume smoothly from the last message.` : "";

      const memoryData = localStorage.getItem('nahid_memory');
      let userProfile = { userName: "Mohammad Nahid", nickName: "বন্ধু" };
      try {
        const savedProfile = localStorage.getItem('nahid_profile');
        if (savedProfile) userProfile = JSON.parse(savedProfile);
      } catch (e) {}

      const assistantName = currentName || localStorage.getItem('nahid_assistant_name') || 'Nahid AI';
      const assistantVoice = currentVoice || localStorage.getItem('nahid_voice') || 'Puck';
      
      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview", 
        config: {
          systemInstruction: `Identity: ${assistantName}. 
          Friend: ${userProfile.nickName}. 
          Creator: Mohammad Nahid.
          Rules:
          1. Always start with 'আসসালামু আলাইকুম'.
          2. Use Bengali naturally.
          ${prevContext}
          ${memoryData ? `\nUSER INFO: ${memoryData}` : ""}`,
          responseModalities: [Modality.AUDIO],
          tools: [
            { googleSearch: {} },
            {
              functionDeclarations: [
                {
                  name: "execute_system_command",
                  description: "Executes a system command.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      action: { type: Type.STRING },
                      target: { type: Type.STRING },
                      payload: { type: Type.STRING }
                    },
                    required: ["action", "target"]
                  }
                }
              ]
            }
          ],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: assistantVoice }
            }
          }
        },
        callbacks: {
          onopen: () => {
            clearTimeout(timeoutId);
            setIsConnected(true);
            setIsConnecting(false);
            
            sessionPromise.then(session => {
              const greetText = resumeSession ? `আসসালামু আলাইকুম! আমরা যেখানে শেষ করেছিলাম সেখান থেকে শুরু করি?` : `আসসালামু আলাইকুম! Talk to ${userProfile.nickName} naturally in Bengali as ${assistantName}.`;
              session.sendRealtimeInput({ text: greetText });
            });

            setTimeout(() => {
              audioStreamerRef.current?.startMicrophone((base64Data) => {
                if (!isMutedRef.current && sessionRef.current) {
                  sessionRef.current.sendRealtimeInput({
                    audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                  });
                }
              }).catch(disconnect);
            }, 600);
          },
          onmessage: async (message: any) => {
            // Handle Transcripts (User and Model)
            if (message.serverContent?.modelTurn?.parts) {
              const text = message.serverContent.modelTurn.parts.map((p: any) => p.text).filter(Boolean).join(' ');
              if (text) setTranscript(prev => [...prev, { role: 'model', text }]);
            }

            if (message.clientContent?.turns) {
              const text = message.clientContent.turns.flatMap((t: any) => t.parts).map((p: any) => p.text).filter(Boolean).join(' ');
              if (text) setTranscript(prev => [...prev, { role: 'user', text }]);
            }

            // Handle Tool Calls
            if (message.toolCall) {
              console.log("TOOL CALL RECEIVED:", message.toolCall);
              const { functionCalls } = message.toolCall;
              if (functionCalls) {
                for (const call of functionCalls) {
                  if (call.name === "execute_system_command") {
                    console.log("EXECUTING SYSTEM COMMAND:", call.args);
                    const { action, target, payload } = call.args;

                    // Handle Hardware/Device actions
                    if (action === 'toggle_torch' || action === 'open_app' || action === 'get_device_status' || action === 'get_location' || action === 'make_call' || action === 'send_sms') {
                      let hardwareResult: any = null;
                      
                      if (action === 'toggle_torch') {
                        hardwareResult = await DeviceControlService.toggleTorch(payload === 'on');
                      } else if (action === 'open_app') {
                        hardwareResult = await DeviceControlService.openApp(target);
                      } else if (action === 'get_device_status') {
                        hardwareResult = await DeviceControlService.getSystemStatus();
                      } else if (action === 'get_location') {
                        hardwareResult = await DeviceControlService.getCurrentLocation();
                      } else if (action === 'make_call') {
                        hardwareResult = await DeviceControlService.makeCall(target);
                      } else if (action === 'send_sms') {
                        hardwareResult = await DeviceControlService.sendSMS(target, payload || "");
                      }

                      sessionRef.current?.sendToolResponse({
                        functionResponses: [{
                          name: "execute_system_command",
                          id: call.id,
                          response: { output: hardwareResult ? `Operation successful: ${JSON.stringify(hardwareResult)}` : "Operation failed or permission denied." }
                        }]
                      });
                      continue;
                    }
                    
                    // Action: send_whatsapp
                    if (action === 'send_whatsapp') {
                      const url = `https://wa.me/${target}?text=${encodeURIComponent(payload || "")}`;
                      window.open(url, '_blank');
                      
                      sessionRef.current?.sendToolResponse({
                        functionResponses: [{
                          name: "execute_system_command",
                          id: call.id,
                          response: { output: "WhatsApp opened with native link." }
                        }]
                      });
                      continue;
                    }
                  }
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
            
            if (message.serverContent?.interrupted) {
              audioStreamerRef.current?.stopPlayback();
              setIsSpeaking(false);
            }

            if (message.serverContent?.turnComplete) {
              setTimeout(() => {
                if (!audioStreamerRef.current?.hasPendingPlayback()) {
                    setIsSpeaking(false);
                }
              }, 1000);
            }
          },
          onclose: (event: any) => {
            clearTimeout(timeoutId);
            setIsConnected(false);
            setIsConnecting(false);
            if (event?.code !== 1000 && event?.code !== 1005) {
              setError(`সার্ভার থেকে সংযোগ বিচ্ছিন্ন। (Code: ${event?.code})`);
              disconnect();
            }
          },
          onerror: (err: any) => {
            clearTimeout(timeoutId);
            setError(`সংযোগে সমস্যা: ${err.message || 'অজানা ত্রুটি'}`);
            setIsConnecting(false);
            disconnect();
          }
        }
      });

      sessionPromise.then(session => {
        sessionRef.current = session;
      }).catch(err => {
        setError("কানেকশন সেটআপ করা যায়নি।");
        setIsConnecting(false);
        disconnect();
      });

    } catch (err: any) {
      setError("অ্যাপলিকেশন সংযুক্ত করা যাচ্ছে না।");
      setIsConnecting(false);
      disconnect();
    }
  }, [disconnect, isConnected, isConnecting]);

  useEffect(() => {
    return () => { if (isConnected) disconnect(); };
  }, [disconnect, isConnected]);

  return {
    isConnected,
    isConnecting,
    isSpeaking,
    isMuted,
    error,
    transcript,
    currentSessionId,
    connect,
    disconnect,
    toggleMute,
    setTranscript
  };
}
