import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AudioStreamer } from '@/lib/audio-streamer';
import { auth, saveSessionToCloud, addMemoryToCloud, updateSessionTitle } from '@/services/firebase';
import { DeviceControlService } from '@/services/device';
import { App } from '@capacitor/app';
import { KeepAwake } from '@capacitor-community/keep-awake';

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
  const isConnectedRef = useRef(false);
  const isInterruptedRef = useRef(false);
  const transcriptRef = useRef<{ role: 'user' | 'model'; text: string }[]>([]);
  const currentSessionIdRef = useRef<string | null>(null);
  const hasGeneratedTitleRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveRef = useRef(Date.now());

  // Sync refs with state
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

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
    
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    try {
      await KeepAwake.allowSleep();
    } catch (e) {}

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

    // Reset interruption flag on manual connect
    isInterruptedRef.current = false;
    reconnectAttemptsRef.current = 0;

    console.log("LOG: Attempting to connect to Gemini Live...");
    setIsConnecting(true);
    setError(null);
    setIsMuted(false);

    // 1. Request/Verify Permissions FIRST
    try {
      // Small delay to ensure any previous dialogs are cleared
      await new Promise(r => setTimeout(r, 100));
      
      // Request Microphone (Standard Web/Capacitor check)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
      if (!stream) {
        setError("মাইক্রোফোন ব্যবহারের অনুমতি নেই। অনুগ্রহ করে পারমিশন চেক করুন।");
        setIsConnecting(false);
        return;
      }
      stream.getTracks().forEach(t => t.stop());

      // Try for Notifications if possible (Capacitor doesn't block but good practice)
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    } catch (e) {
      console.warn("Permission pre-check failed:", e);
    }

    // 2. Enable "Foreground" (Keep Awake) behavior
    try {
      await KeepAwake.keepAwake();
    } catch (e) {
      console.warn("KeepAwake failed:", e);
    }
    
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
      const voiceInput = currentVoice || localStorage.getItem('nahid_voice') || 'Puck';
      
      const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
      const validatedVoice = validVoices.includes(voiceInput) ? voiceInput : 'Zephyr';

      console.log(`LOG: Connecting with voice: ${validatedVoice}, as: ${assistantName}`);

      const sessionPromise = (ai.live as any).connect({
        model: "gemini-3.1-flash-live-preview", 
        config: {
          systemInstruction: `You are ${assistantName}, a professional Native AI Assistant created by Mohammad Nahid.
          Identity: ${assistantName}
          User: ${userProfile.nickName}
          Current Time: ${new Date().toLocaleString()}
          Capabilities: 
          - You can strictly control the user's mobile device via tools.
          - Use 'execute_system_command' for:
            * Opening apps (action: 'open_app', target: 'facebook', 'youtube', 'settings', etc.)
            * Sending SMS (action: 'send_sms', target: [phone], payload: [message])
            * Making calls (action: 'make_call', target: [phone])
            * Searching the web (action: 'search_web', payload: [query])
            * Toggling flashlight (action: 'toggle_torch', payload: 'on'/'off')
          Strict Conversational Rules:
          - Always respond in Bengali (বাংলা) naturally and concisely.
          - DO NOT use mandatory introductory phrases or "Assalamu Alaikum" at the start of every message.
          - BE DIRECT: Answer questions immediately and perform tasks without fluff.
          - HONESTY: Never hallucinate or claim the user said something they didn't. Be strictly grounded in the current CHAT HISTORY.
          - TIME AWARENESS: Use the provided 'Current Time' to understand how long it has been since the last message in CHAT HISTORY. Do not say "after a long time" if it was just minutes.
          - MEMORY: Refer back to previous points in the current session accurately.
          - If the user asks to open an app, send a message, or search, ALWAYS use the tool immediately.
          ${prevContext ? `CHAT HISTORY (Most Recent First): ${prevContext}` : ""}
          ${memoryData ? `USER LONG-TERM MEMORY: ${memoryData}` : ""}`,
          responseModalities: [Modality.AUDIO],
          voice_activity_detection: {
            voice_config: {
              pre_speak_duration: "0.1s",
              post_speak_duration: "0.5s"
            }
          },
          tools: [
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
              prebuiltVoiceConfig: { voiceName: validatedVoice }
            }
          }
        },
        callbacks: {
          onopen: () => {
            clearTimeout(timeoutId);
            setIsConnected(true);
            setIsConnecting(false);
            lastActiveRef.current = Date.now();

            // Heartbeat Logic - Send a tiny silent audio or ping every 5 seconds to keep socket alive
            heartbeatRef.current = setInterval(() => {
              if (sessionRef.current && isConnectedRef.current) {
                // Send an empty text input as heartbeat
                try {
                  sessionRef.current.sendRealtimeInput({ text: "" });
                  console.log("HEARTBEAT: Sent ping to keep socket alive");
                } catch (e) {
                  console.warn("Heartbeat failed", e);
                }
              }
            }, 5000);
            
          const greetText = resumeSession ? `Hi! আমরা যেখানে শেষ করেছিলাম সেখান থেকে শুরু করি?` : `Hi! আমি ${assistantName}, আপনার ব্যক্তিগত এআই। আমি তৈরি হয়েছি মোহাম্মদ নাহিদ-এর মাধ্যমে। আমাকে যেকোনো প্রশ্ন করতে পারেন।`;
          
          setTimeout(() => {
            sessionPromise.then(session => {
              if (isConnectedRef.current) {
                session.sendRealtimeInput({ text: greetText });
              }
            });
          }, 1000);

          setTimeout(() => {
            audioStreamerRef.current?.startMicrophone((base64Data) => {
              if (!isMutedRef.current && sessionRef.current && isConnectedRef.current) {
                try {
                  sessionRef.current.sendRealtimeInput({
                    audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                  });
                } catch (e) {
                  console.error("Audio streaming error:", e);
                }
              }
            }).catch(err => {
              console.error("Mic start failed", err);
              disconnect();
            });
          }, 1500);
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
                    let hardwareResult: any = null;
                    let handled = false;

                    if (action === 'toggle_torch') {
                      hardwareResult = await DeviceControlService.toggleTorch(payload === 'on');
                      handled = true;
                    } else if (action === 'open_app') {
                      hardwareResult = await DeviceControlService.openApp(target);
                      handled = true;
                    } else if (action === 'get_device_status') {
                      hardwareResult = await DeviceControlService.getSystemStatus();
                      handled = true;
                    } else if (action === 'get_location') {
                      hardwareResult = await DeviceControlService.getCurrentLocation();
                      handled = true;
                    } else if (action === 'make_call') {
                      hardwareResult = await DeviceControlService.makeCall(target);
                      handled = true;
                    } else if (action === 'send_sms') {
                      hardwareResult = await DeviceControlService.sendSMS(target, payload || "");
                      handled = true;
                    } else if (action === 'search_web') {
                      hardwareResult = await DeviceControlService.searchWeb(payload || target || "");
                      handled = true;
                    } else if (action === 'send_whatsapp') {
                      const url = `https://wa.me/${target}?text=${encodeURIComponent(payload || "")}`;
                      window.open(url, '_blank');
                      hardwareResult = "WhatsApp link opened";
                      handled = true;
                    }

                    if (handled) {
                      sessionRef.current?.sendToolResponse({
                        functionResponses: [{
                          name: "execute_system_command",
                          id: call.id,
                          response: { output: hardwareResult !== null ? `Operation successful: ${action}` : "Operation failed." }
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
    const handleAppStateChange = async ({ isActive }: { isActive: boolean }) => {
      console.log('App State Change:', isActive ? 'Active' : 'Inactive');
      
      if (!isActive) {
        // App is backgrounded or a system dialog (permission) is visible
        if (isConnectedRef.current) {
          console.log("App backgrounded, keeping session alive if possible...");
          isInterruptedRef.current = true;
          lastActiveRef.current = Date.now();
        }
      } else {
        // App is back in focus
        if (isInterruptedRef.current || !isConnectedRef.current) {
          console.log("App resumed. Checking session health...");
          isInterruptedRef.current = false;
          
          // Re-resume audio context if suspended
          if (audioStreamerRef.current) {
             try {
                await audioStreamerRef.current.resume();
             } catch (e) {}
          }

          // Silent Keep-Alive check: If focus was lost for more than 10 seconds and we are disconnected
          // or if the socket appears stale, we hard reconnect.
          const timeSinceLastActivity = Date.now() - lastActiveRef.current;
          
          if (!isConnectedRef.current && timeSinceLastActivity < 600000) { // Reconnect if less than 10 mins idle
            console.log("Session lost during focus change (possibly system dialog). Silent Reconnecting...");
            setTimeout(() => {
               connect(undefined, undefined, { id: currentSessionIdRef.current, transcript: transcriptRef.current });
            }, 300);
          }
        }
      }
    };

    const listener = App.addListener('appStateChange', handleAppStateChange);
    return () => { listener.then(l => l.remove()); };
  }, [connect]);

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
