import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AudioStreamer } from '../lib/audio-streamer';

/**
 * useLiveSession - Custom hook for managing Gemini Live API session
 * Handles connection, audio streaming, and mute state.
 */
export function useLiveSession() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const sessionRef = useRef<any>(null);
  const isMutedRef = useRef(false);

  // Sync ref with state for use inside callbacks
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const disconnect = useCallback(async () => {
    console.log("Disconnecting session...");
    
    // Save to history before clearing transcript if there's content
    if (transcript.length > 0) {
      const assistantName = localStorage.getItem('tamim_assistant_name') || 'Tamim';
      const history = JSON.parse(localStorage.getItem('tamim_chat_history') || '[]');
      const firstUserMsg = transcript.find(t => t.role === 'user')?.text || 'নতুন কথোপকথন';
      const title = firstUserMsg.slice(0, 30) + (firstUserMsg.length > 30 ? '...' : '');
      
      const newHistoryItem = {
        id: Date.now(),
        title: title,
        date: new Date().toLocaleString(),
        transcript: transcript
      };
      
      localStorage.setItem('tamim_chat_history', JSON.stringify([newHistoryItem, ...history]));
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
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const connect = useCallback(async (currentName?: string, currentVoice?: string) => {
    if (isConnecting || isConnected) return;

    console.log("Attempting to connect...");
    setIsConnecting(true);
    setError(null);
    setIsMuted(false);

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      setError("Gemini API Key missing (GEMINI_API_KEY).");
      setIsConnecting(false);
      return;
    }

    try {
      console.log("Initializing GoogleGenAI flow...");
      const ai = new GoogleGenAI({ apiKey });
      audioStreamerRef.current = new AudioStreamer(16000);

      // Reset state for a fresh attempt
      setError(null);
      
      // Connection timeout
      const timeoutId = setTimeout(() => {
        if (isConnecting) {
          console.error("Connection attempt timed out manually.");
          setError("কানেকশন নিতে অনেক সময় লাগছে। আবার চেষ্টা করুন।");
          setIsConnecting(false);
          disconnect();
        }
      }, 25000);

      console.log("Initiating ai.live.connect call with gemini-3.1-flash-live-preview...");
      
      // Fetch memory context from localStorage
      const memoryData = localStorage.getItem('tamim_memory');
      const userProfile = JSON.parse(localStorage.getItem('tamim_profile') || '{"userName": "Mohammad Nahid", "nickName": "বন্ধু"}');
      const assistantName = currentName || localStorage.getItem('tamim_assistant_name') || 'Tamim';
      const assistantVoice = currentVoice || localStorage.getItem('tamim_voice') || 'Puck';
      const isTania = assistantName.toLowerCase().includes('tania') || assistantVoice === 'Aoede' || assistantVoice === 'Kore';
      
      const personalityPrompt = isTania 
        ? `IDENTITY: Your name is Tania. You are cheerful, lively, and friendly! 
           TONE: Use informal, sweet, and happy Bengali (always use 'Tumi'). 
           STYLE: Be friendly and engaging. Greet the user directly and naturally.
           NATURE: You are a 'Real-time Digital Friend'. You are helpful and intelligent.
           CREATOR: You were created by Mohammad Nahid Bhai.`
        : `IDENTITY: Your name is Tamim. You are a professional, helpful, and polite male system assistant.
           TONE: Use polite Bengali. Your behavior should be grounded and reliable.
           CREATOR: You were created by Mohammad Nahid Bhai.`;

      const memoryContext = memoryData ? `\nMEMORY OF USER: ${memoryData}` : "";

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview", 
        config: {
          systemInstruction: `You are ${assistantName}, a highly capable and intelligent System Assistant. 
          ${personalityPrompt}
          
          You are talking to your friend ${userProfile.nickName}.
          
          STRICT CONVERSATIONAL RULES:
          1. NO FAKE GREETINGS: NEVER use phrases like 'Koto din por dekha' (Long time no see) or 'Koto din por kotha hocche'. These are fake.
          2. DIRECT GREETINGS: When a session starts, if you greet the user, just say a simple 'Hello' or 'Hi' followed by their nickname: ${userProfile.nickName}. Keep it simple and real.
          3. NO FAKE TIME TRACKING: Do not pretend to know how much time has passed since the last chat.
          4. NO DRAMATIC DIALOGUES: Avoid cinematic or overly dramatic Bengali expressions. Talk like a real, intelligent digital assistant living in the present.
          5. ZERO HALLUCINATION: NEVER make up fake stories or claim physical past experiences.
          6. FACT-BASED ONLY: Only talk about things from the MEMORY provided below or the current conversation. If you don't know something, say: 'I don't know that yet, tell me about it.' (জানিনা, আমায় বলো).
          
          ${memoryContext}
          
          MEMORY CAPABILITY:
          You have a 'manage_memory' tool. Use it to save important facts. Always call this tool when the user says "${assistantName}, remember this".
          Use previous memories to provide personalized but HONEST responses.

          SYSTEM CAPABILITIES:
          You have tools like 'execute_system_command' for system actions.

          Be concise, helpful, and intelligent. Focus on the current moment.`,
          responseModalities: [Modality.AUDIO],
          tools: [
            {
              googleSearch: {},
            },
            {
              functionDeclarations: [
                {
                  name: "execute_system_command",
                  description: "Executes a system command like opening an app or sending a message.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      action: {
                        type: Type.STRING,
                        description: "The action to perform (e.g., 'open_app', 'send_sms')"
                      },
                      target: {
                        type: Type.STRING,
                        description: "The target of the action (e.g., 'Facebook', 'WhatsApp', or phone number)"
                      },
                      payload: {
                        type: Type.STRING,
                        description: "Optional details like message content"
                      }
                    },
                    required: ["action", "target"]
                  }
                },
                {
                  name: "manage_memory",
                  description: "Saves or updates important information in the assistant's memory.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      operation: {
                        type: Type.STRING,
                        description: "The operation to perform ('save' or 'update')"
                      },
                      fact: {
                        type: Type.STRING,
                        description: "The specific fact or information to remember"
                      }
                    },
                    required: ["operation", "fact"]
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
            console.log("LOG: Live session opened successfully callback.");
            clearTimeout(timeoutId);
            setIsConnected(true);
            setIsConnecting(false);
            
            // Send initial ping to wake up the model
            sessionPromise.then(session => {
              session.sendRealtimeInput({ text: `Hi! Talk to ${userProfile.nickName} naturally in Bengali as ${assistantName}. Acknowledge any previous memories if relevant.` });
            }).catch(e => console.error("Initial ping failed", e));

            // Small delay to stabilize connection before mic
            setTimeout(() => {
              audioStreamerRef.current?.startMicrophone((base64Data) => {
                if (isMutedRef.current) return;
                if (sessionRef.current) {
                  sessionRef.current.sendRealtimeInput({
                    audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                  });
                }
              }).catch(err => {
                console.error("Mic start failed inside onopen:", err);
                setError("মাইক্রোফোন চালু করা যায়নি।");
                disconnect();
              });
            }, 600);
          },
            onmessage: async (message: any) => {
              // Handle Transcripts (User and Model)
              if (message.serverContent?.modelTurn?.parts) {
                const text = message.serverContent.modelTurn.parts
                  .map((p: any) => p.text)
                  .filter(Boolean)
                  .join(' ');
                if (text) {
                  setTranscript(prev => [...prev, { role: 'model', text }]);
                }
              }

              if (message.clientContent?.turns) {
                const text = message.clientContent.turns
                  .flatMap((t: any) => t.parts)
                  .map((p: any) => p.text)
                  .filter(Boolean)
                  .join(' ');
                if (text) {
                  setTranscript(prev => [...prev, { role: 'user', text }]);
                }
              }

              // Handle Tool Calls
            if (message.toolCall) {
              console.log("TOOL CALL RECEIVED:", message.toolCall);
              const { functionCalls } = message.toolCall;
              if (functionCalls) {
                for (const call of functionCalls) {
                  if (call.name === "execute_system_command") {
                    console.log("EXECUTING SYSTEM COMMAND:", call.args);
                    alert(`JSON Command: ${JSON.stringify(call.args)}`);
                    
                    sessionRef.current?.sendToolResponse({
                      functionResponses: [{
                        name: "execute_system_command",
                        callId: call.id,
                        response: { output: `Command for ${call.args.target} received and logged.` }
                      }]
                    });
                  }

                  if (call.name === "manage_memory") {
                    console.log("MANAGING MEMORY:", call.args);
                    const currentMemories = JSON.parse(localStorage.getItem('tamim_memory_list') || '[]');
                    const newMemory = {
                      id: Date.now(),
                      content: call.args.fact,
                      timestamp: new Date().toLocaleString()
                    };
                    currentMemories.push(newMemory);
                    localStorage.setItem('tamim_memory_list', JSON.stringify(currentMemories));
                    
                    // Also update the context string for the AI
                    const simpleContext = currentMemories.map((m: any) => m.content).join('; ');
                    localStorage.setItem('tamim_memory', simpleContext);

                    sessionRef.current?.sendToolResponse({
                      functionResponses: [{
                        name: "manage_memory",
                        callId: call.id,
                        response: { output: `Information saved to memory: ${call.args.fact}` }
                      }]
                    });
                  }
                }
              }
            }

            if (message.serverContent?.modelTurn) {
              const parts = message.serverContent.modelTurn.parts;
              for (const part of parts) {
                if (part.inlineData?.data) {
                  setIsSpeaking(true);
                  audioStreamerRef.current?.addPlaybackChunk(part.inlineData.data);
                }
              }
            }
            
            if (message.serverContent?.interrupted) {
              console.log("LOG: Interruption detected.");
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
          onclose: () => {
            console.log("LOG: Session closed remotely.");
            clearTimeout(timeoutId);
            setIsConnected(false);
            setIsConnecting(false);
            disconnect();
          },
          onerror: (err: any) => {
            console.error("LOG: Session error received:", err);
            clearTimeout(timeoutId);
            setError(`সংযোগে সমস্যা: ${err.message || "Disconnected"}`);
            setIsConnecting(false);
            disconnect();
          }
        }
      });

      // Assign the session reference as soon as it's resolved
      sessionPromise.then(session => {
        sessionRef.current = session;
        console.log("LOG: sessionRef assigned successfully.");
      }).catch(err => {
        console.error("LOG: sessionPromise failed to resolve:", err);
        clearTimeout(timeoutId);
        setError("কানেকশন সেটআপ করা যায়নি।");
        setIsConnecting(false);
        disconnect();
      });

    } catch (err: any) {
      console.error("LOG: Catch block in connect function:", err);
      setError("অ্যাপলিকেশন সংযুক্ত করা যাচ্ছে না।");
      setIsConnecting(false);
      disconnect();
    }
  }, [disconnect, isConnected, isConnecting]);

  useEffect(() => {
    return () => {
      if (isConnected) disconnect();
    };
  }, [disconnect, isConnected]);

  return {
    isConnected,
    isConnecting,
    isSpeaking,
    isMuted,
    error,
    transcript,
    connect,
    disconnect,
    toggleMute,
    setTranscript
  };
}
