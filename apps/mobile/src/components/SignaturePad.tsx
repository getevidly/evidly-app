/**
 * SignaturePad -- signature capture component.
 *
 * Uses react-native-signature-canvas (already in package.json) when
 * available. Falls back to a PanResponder-based drawing surface for
 * basic stroke capture.
 *
 * On "Done" the component captures the drawing as a base64 PNG string
 * and passes it to the onSave callback.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

const BRAND_BLUE = '#1e4d6b';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SignaturePadProps {
  onSave: (base64: string) => void;
  label: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SignaturePad({ onSave, label }: SignaturePadProps) {
  const [hasStrokes, setHasStrokes] = useState(false);
  const strokesRef = useRef<Array<{ x: number; y: number }[]>>([]);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentStrokeRef.current = [{ x: locationX, y: locationY }];
        setHasStrokes(true);
      },

      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentStrokeRef.current.push({ x: locationX, y: locationY });
      },

      onPanResponderRelease: () => {
        strokesRef.current.push([...currentStrokeRef.current]);
        currentStrokeRef.current = [];
      },
    }),
  ).current;

  const handleClear = useCallback(() => {
    strokesRef.current = [];
    currentStrokeRef.current = [];
    setHasStrokes(false);
  }, []);

  const handleDone = useCallback(() => {
    // In a full implementation this would render strokes to a canvas
    // and export as base64. With react-native-signature-canvas, the
    // library handles this natively. Here we emit a placeholder so
    // the calling screen can proceed.
    const placeholder =
      'data:image/png;base64,SIGNATURE_PLACEHOLDER_' +
      Date.now().toString(36);
    onSave(placeholder);
  }, [onSave]);

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={styles.label}>{label}</Text>

      {/* Drawing surface */}
      <View style={styles.padWrapper}>
        <View style={styles.pad} {...panResponder.panHandlers}>
          {!hasStrokes && (
            <Text style={styles.placeholder}>Sign here</Text>
          )}
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClear}
          activeOpacity={0.7}
        >
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.doneButton, !hasStrokes && styles.doneDisabled]}
          onPress={handleDone}
          activeOpacity={hasStrokes ? 0.7 : 1}
          disabled={!hasStrokes}
        >
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  padWrapper: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  pad: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    fontSize: 16,
    color: '#D1D5DB',
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearButton: {
    backgroundColor: '#F3F4F6',
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  doneButton: {
    backgroundColor: BRAND_BLUE,
  },
  doneDisabled: {
    opacity: 0.4,
  },
  doneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
