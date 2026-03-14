import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface OfflineBannerProps {
  pendingCount: number;
}

export function OfflineBanner({ pendingCount }: OfflineBannerProps) {
  if (pendingCount <= 0) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.syncIcon}>🔄</Text>
      <Text style={styles.text}>
        You're offline — {pendingCount} {pendingCount === 1 ? 'change' : 'changes'} pending sync
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  syncIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  text: {
    color: '#0B1628',
    fontSize: 13,
    fontWeight: '600',
  },
});
