import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

interface UseWakeWordOptions {
  wakeWord: string;
  onWake: () => void;
  enabled: boolean;
}

export function useWakeWord({ wakeWord, onWake, enabled }: UseWakeWordOptions) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const hasWokenRef = useRef(false);

  const startListening = useCallback(() => {
    if (!enabled || isListening) return;

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn("Speech Recognition not supported in this browser.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'bn-BD'; // Support Bengali for wake word

      recognition.onstart = () => {
        setIsListening(true);
        console.log("Wake word listener started for:", wakeWord);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript.toLowerCase())
          .join('');

        console.log("Listening for wake word... current:", transcript);
        
        if (transcript.includes(wakeWord.toLowerCase()) && !hasWokenRef.current) {
          console.log("WAKE WORD DETECTED!");
          hasWokenRef.current = true;
          onWake();
          recognition.stop();
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        hasWokenRef.current = false;
        // Auto-restart if still enabled
        if (enabled && !hasWokenRef.current) {
          setTimeout(startListening, 1000);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error("Failed to start speech recognition", e);
    }
  }, [enabled, isListening, wakeWord, onWake]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      startListening();
    } else {
      stopListening();
    }
    return () => stopListening();
  }, [enabled, wakeWord, startListening, stopListening]);

  return { isListening };
}
