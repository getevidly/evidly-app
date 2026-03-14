import { useState } from 'react';

interface VoiceNote {
  id: string;
  job_id: string;
  uri: string;
  duration_seconds: number;
  transcription?: string;
  created_at: string;
}

const DEMO_VOICE_NOTES: VoiceNote[] = [
  {
    id: 'vn1',
    job_id: 'j1',
    uri: 'https://placeholder.com/voice-note-1.m4a',
    duration_seconds: 34,
    transcription: 'Heavy grease buildup observed in the vertical duct section above the main hood. Recommending customer increase cleaning frequency from quarterly to monthly. Access panel hinge on the east side needs replacement.',
    created_at: '2026-03-15T09:05:00Z',
  },
];

export function useVoice() {
  const [voiceNotes] = useState<VoiceNote[]>(DEMO_VOICE_NOTES);

  return {
    voiceNotes,
    startRecording: async (_jobId: string) => {
      throw new Error('Not implemented in demo mode');
    },
    stopRecording: async () => {
      throw new Error('Not implemented in demo mode');
    },
    getTranscription: async (_voiceNoteId: string) => {
      throw new Error('Not implemented in demo mode');
    },
    loading: false,
  };
}
