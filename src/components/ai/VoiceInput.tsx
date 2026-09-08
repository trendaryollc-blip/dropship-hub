"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onCommand?: (command: string) => void;
  onStateChange?: (listening: boolean) => void;
  disabled?: boolean;
}

const VOICE_COMMANDS: Record<string, string> = {
  "new session": "/new",
  "new chat": "/new",
  "clear chat": "/clear",
  "clear conversation": "/clear",
  "show report": "/report",
  "generate report": "/report",
  "show forecast": "/forecast",
  "show help": "/help",
  "what can you do": "/help",
};

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export default function VoiceInput({ onTranscript, onCommand, onStateChange, disabled = false }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onCommandRef = useRef(onCommand);
  const onStateChangeRef = useRef(onStateChange);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setIsSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimTranscript(interim);
      setError(null);

      if (final) {
        // ─── Voice Command Detection ──────────────────────────────
        const lower = final.toLowerCase().trim();
        const matchedCommand = Object.entries(VOICE_COMMANDS).find(([phrase]) => lower.includes(phrase));
        if (matchedCommand && onCommandRef.current) {
          onCommandRef.current(matchedCommand[1]);
        } else {
          onTranscriptRef.current(final);
        }
        setIsListening(false);
        setInterimTranscript("");
        onStateChangeRef.current?.(false);
      }
    };

    recognition.onerror = (event: Event) => {
      const errorEvent = event as { error?: string };
      setIsListening(false);
      setInterimTranscript("");
      onStateChangeRef.current?.(false);

      if (errorEvent.error === "not-allowed") {
        setError("Microphone access denied");
      } else if (errorEvent.error === "no-speech") {
        setError("No speech detected");
      } else {
        setError("Voice recognition error");
      }

      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
      onStateChangeRef.current?.(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimTranscript("");
      onStateChangeRef.current?.(false);
    } else {
      try {
        setError(null);
        recognitionRef.current.start();
        setIsListening(true);
        onStateChangeRef.current?.(true);
      } catch {
        // Already started
      }
    }
  }, [isListening]);

  if (!isSupported) return null;

  return (
    <div className="relative">
      <button
        onClick={toggleListening}
        disabled={disabled}
        className={`p-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
          isListening
            ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/25"
            : error
            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
            : "bg-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.1]"
        }`}
        title={isListening ? "Stop listening" : error ? error : "Voice input (speak your command)"}
        aria-label={isListening ? "Stop listening" : "Voice input"}
      >
        {isListening ? (
          <MicOff className="h-4 w-4" />
        ) : error ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>

      {/* Interim transcript popup */}
      {interimTranscript && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-2 rounded-xl bg-background border border-white/[0.1] shadow-xl text-xs text-muted-foreground whitespace-nowrap max-w-[280px] truncate animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-1 rounded-full bg-accent animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
            <span className="text-foreground/80">{interimTranscript}</span>
          </div>
        </div>
      )}

      {/* Error popup */}
      {error && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 whitespace-nowrap animate-in fade-in">
          {error}
        </div>
      )}
    </div>
  );
}
