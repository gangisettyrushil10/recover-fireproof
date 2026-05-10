'use client';

import { Mic, MicOff, Square } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './Button.js';
import { cn } from '../lib/cn.js';

type RecognitionMode = 'speech-recognition' | 'media-recorder' | 'unsupported';

export interface VoiceCaptureResult {
  transcript: string | null;
  /** Raw audio recorded, only present in media-recorder fallback. */
  audioBlob: Blob | null;
}

export interface VoiceCaptureButtonProps {
  onComplete: (result: VoiceCaptureResult) => void;
  language?: string;
  className?: string;
  disabled?: boolean;
}

interface SpeechRecognitionLike {
  start: () => void;
  stop: () => void;
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceCaptureButton({
  onComplete,
  language = 'en-US',
  className,
  disabled,
}: VoiceCaptureButtonProps) {
  const [mode, setMode] = useState<RecognitionMode>('unsupported');
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef<string>('');

  useEffect(() => {
    if (getSpeechRecognition()) {
      setMode('speech-recognition');
    } else if (typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined') {
      setMode('media-recorder');
    } else {
      setMode('unsupported');
    }
  }, []);

  const start = useCallback(async () => {
    transcriptRef.current = '';
    chunksRef.current = [];

    if (mode === 'speech-recognition') {
      const Ctor = getSpeechRecognition();
      if (!Ctor) return;
      const r = new Ctor();
      r.lang = language;
      r.continuous = false;
      r.interimResults = false;
      r.onresult = (e) => {
        let text = '';
        for (let i = 0; i < e.results.length; i += 1) {
          text += e.results[i]![0].transcript;
        }
        transcriptRef.current = text.trim();
      };
      r.onend = () => {
        setRecording(false);
        onComplete({ transcript: transcriptRef.current || null, audioBlob: null });
      };
      r.onerror = () => {
        setRecording(false);
        // Fall back to media recorder on next attempt.
        setMode('media-recorder');
      };
      recognitionRef.current = r;
      try {
        r.start();
        setRecording(true);
      } catch {
        setMode('media-recorder');
      }
      return;
    }

    if (mode === 'media-recorder') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const rec = new MediaRecorder(stream);
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
          stream.getTracks().forEach((t) => t.stop());
          setRecording(false);
          onComplete({ transcript: null, audioBlob: blob });
        };
        recorderRef.current = rec;
        rec.start();
        setRecording(true);
      } catch {
        setRecording(false);
      }
    }
  }, [mode, language, onComplete]);

  const stop = useCallback(() => {
    if (mode === 'speech-recognition' && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    if (mode === 'media-recorder' && recorderRef.current) {
      recorderRef.current.stop();
    }
  }, [mode]);

  if (mode === 'unsupported') {
    return (
      <Button variant="secondary" disabled className={className}>
        <MicOff className="h-4 w-4" />
        Voice unsupported
      </Button>
    );
  }

  return (
    <Button
      type="button"
      onClick={recording ? stop : start}
      variant={recording ? 'danger' : 'secondary'}
      disabled={disabled}
      className={cn('gap-2', className)}
    >
      {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      {recording ? 'Stop' : 'Record voice note'}
    </Button>
  );
}
