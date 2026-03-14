import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string) => void;
}

export function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRecording) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
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
      animation.start();

      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);

      return () => {
        animation.stop();
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      pulseAnim.setValue(1);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording, pulseAnim]);

  const formatTime = useCallback((totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleStartRecording = () => {
    setSeconds(0);
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    const placeholderUri = `file://recording_${Date.now()}.m4a`;
    onRecordingComplete(placeholderUri);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.timer}>{formatTime(seconds)}</Text>

      {isRecording ? (
        <TouchableOpacity
          style={styles.stopButton}
          onPress={handleStopRecording}
          activeOpacity={0.7}
        >
          <Animated.View
            style={[styles.pulseRing, { opacity: pulseAnim }]}
          />
          <View style={styles.stopSquare} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.recordButton}
          onPress={handleStartRecording}
          activeOpacity={0.7}
        >
          <View style={styles.recordInner} />
        </TouchableOpacity>
      )}

      <Text style={styles.label}>
        {isRecording ? 'Recording... Tap to stop' : 'Tap to record'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  timer: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0B1628',
    marginBottom: 20,
    fontVariant: ['tabular-nums'],
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DC2626',
  },
  stopButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
  },
  stopSquare: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  label: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7F96',
    fontWeight: '500',
  },
});
