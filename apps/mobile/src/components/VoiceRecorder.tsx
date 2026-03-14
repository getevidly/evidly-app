/**
 * VoiceRecorder -- large mic button with recording indicator, duration
 * counter, and optional transcription display.
 *
 * Uses expo-av Audio API for recording.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

const BRAND_BLUE = '#1e4d6b';
const RECORDING_RED = '#DC2626';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  transcription?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VoiceRecorder({
  onRecordingComplete,
  transcription,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulse animation while recording
  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  // Duration timer
  useEffect(() => {
    if (isRecording) {
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handlePress = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      // In a real implementation this would stop the Audio.Recording
      // and retrieve the URI. For now we pass a placeholder.
      onRecordingComplete('recording://placeholder.m4a', duration);
    } else {
      // Start recording
      // In production: request permissions, create Audio.Recording, start.
      setIsRecording(true);
    }
  }, [isRecording, duration, onRecordingComplete]);

  return (
    <View style={styles.container}>
      {/* Pulsing red dot while recording */}
      {isRecording && (
        <View style={styles.indicatorRow}>
          <Animated.View
            style={[
              styles.pulseDot,
              { transform: [{ scale: pulseAnim }] },
            ]}
          />
          <Text style={styles.recordingLabel}>Recording</Text>
        </View>
      )}

      {/* Mic button */}
      <TouchableOpacity
        style={[styles.micButton, isRecording && styles.micButtonRecording]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Text style={styles.micIcon}>{isRecording ? '\u25A0' : '\uD83C\uDF99'}</Text>
      </TouchableOpacity>

      {/* Duration */}
      {(isRecording || duration > 0) && (
        <Text style={styles.duration}>{formatDuration(duration)}</Text>
      )}

      {/* Transcription */}
      {transcription ? (
        <View style={styles.transcriptionBox}>
          <Text style={styles.transcriptionLabel}>Transcription</Text>
          <Text style={styles.transcriptionText}>{transcription}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const MIC_SIZE = 72;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: RECORDING_RED,
    marginRight: 6,
  },
  recordingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: RECORDING_RED,
  },
  micButton: {
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  micButtonRecording: {
    backgroundColor: RECORDING_RED,
    shadowColor: RECORDING_RED,
  },
  micIcon: {
    fontSize: 28,
    color: '#FFFFFF',
  },
  duration: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    fontVariant: ['tabular-nums'],
  },
  transcriptionBox: {
    marginTop: 16,
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  transcriptionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  transcriptionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});
