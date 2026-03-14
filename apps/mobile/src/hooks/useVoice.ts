/**
 * Voice note hooks for technician app
 *
 * useRecordVoiceNote manages local recording state via expo-av.
 * Transcription / extraction mutations throw "Not implemented" until wired.
 */

import { useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VoiceNote {
  id: string;
  job_id: string;
  audio_url: string;
  duration_seconds: number;
  transcription: string | null;
  transcription_status: 'pending' | 'processing' | 'completed' | 'failed';
  transcription_confidence: number | null;
  extracted_deficiencies?: Array<{
    description: string;
    severity: string;
    equipment: string;
  }>;
  extracted_measurements?: Array<{
    component: string;
    measurement: string;
    value: number;
    unit: string;
  }>;
  context_type: 'deficiency' | 'checklist' | 'general';
  context_id: string | null;
}

// ---------------------------------------------------------------------------
// Recording hook
// ---------------------------------------------------------------------------

/**
 * Manage voice recording via expo-av.
 *
 * TODO: Replace stub with actual expo-av Audio.Recording integration.
 *       - startRecording: request permissions, create Audio.Recording, start
 *       - stopRecording: stop recording, get URI, compute duration
 */
export function useRecordVoiceNote() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const startRecording = useCallback(async () => {
    // TODO: expo-av — Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
    setIsRecording(true);
    setAudioUri(null);
    setDuration(0);
  }, []);

  const stopRecording = useCallback(async () => {
    // TODO: expo-av — recording.stopAndUnloadAsync(), get URI from recording.getURI()
    setIsRecording(false);
    // audioUri and duration will be set from the actual recording result
  }, []);

  return { isRecording, startRecording, stopRecording, audioUri, duration };
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Transcribe a voice note via the ai-voice-transcription edge function.
 *
 * TODO: Upload audio to Supabase Storage if not already uploaded,
 *       then call edge function `ai-voice-transcription` with the audio URL.
 *       Update the voice_notes record with transcription results.
 */
export function useTranscribeVoice() {
  const mutate = useCallback(async (audioUrl: string) => {
    // TODO: Wire to Supabase edge function
    throw new Error('Not implemented');
  }, []);

  return { mutate };
}

/**
 * Extract structured data (deficiencies, measurements) from a transcription
 * using AI.
 *
 * TODO: Call Supabase edge function or client-side AI to parse transcription
 *       text and extract deficiency details and measurement values.
 */
export function useExtractFromVoice() {
  const mutate = useCallback(async (transcription: string) => {
    // TODO: Wire to Supabase edge function
    throw new Error('Not implemented');
  }, []);

  return { mutate };
}
