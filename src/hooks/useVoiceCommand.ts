import { useState, useCallback, useRef, useEffect } from 'react';
import { parseVoiceCommand, VoiceAction } from '../lib/voiceParser';

interface UseVoiceCommandOptions {
  onCommand: (action: VoiceAction) => void;
  onTranscript?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceCommand({ onCommand, onTranscript, onError }: UseVoiceCommandOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onError?.('Voice recognition not supported on this device');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript?.(transcript);
      const action = parseVoiceCommand(transcript);
      onCommand(action);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'no-speech') {
        onError?.('No speech detected \u2014 try again');
      } else if (event.error === 'not-allowed') {
        onError?.('Microphone access denied \u2014 check browser permissions');
      } else {
        onError?.('Voice recognition error \u2014 try again');
      }
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();

    // Auto-stop after 8 seconds
    setTimeout(() => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }, 8000);
  }, [onCommand, onTranscript, onError]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, isSupported, startListening, stopListening };
}
