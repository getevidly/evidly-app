import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface SignaturePadProps {
  onSignatureCapture: (uri: string) => void;
  label?: string;
}

export function SignaturePad({
  onSignatureCapture,
  label = 'Signature',
}: SignaturePadProps) {
  const [hasSigned, setHasSigned] = useState(false);

  const handleSign = () => {
    setHasSigned(true);
    const placeholderUri = `file://signature_${Date.now()}.png`;
    onSignatureCapture(placeholderUri);
  };

  const handleClear = () => {
    setHasSigned(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={[styles.padArea, hasSigned && styles.padAreaSigned]}
        onPress={handleSign}
        activeOpacity={0.8}
      >
        {hasSigned ? (
          <Text style={styles.signedText}>Signature captured</Text>
        ) : (
          <>
            <Text style={styles.placeholderIcon}>✍️</Text>
            <Text style={styles.placeholderText}>Tap here to sign</Text>
          </>
        )}
      </TouchableOpacity>

      {hasSigned && (
        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0B1628',
    marginBottom: 8,
  },
  padArea: {
    height: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D9E6',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  padAreaSigned: {
    borderColor: '#1e4d6b',
    borderStyle: 'solid',
    backgroundColor: '#F0F7FA',
  },
  placeholderIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#6B7F96',
    fontWeight: '500',
  },
  signedText: {
    fontSize: 14,
    color: '#1e4d6b',
    fontWeight: '600',
  },
  clearButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#EEF1F7',
  },
  clearButtonText: {
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '600',
  },
});
