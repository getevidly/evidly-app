/**
 * OfflineBanner -- yellow/orange banner shown at the top of the screen
 * when the device is offline. Displays the count of items pending sync.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OfflineBannerProps {
  pendingCount: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OfflineBanner({ pendingCount }: OfflineBannerProps) {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        Offline {'\u2014'} {pendingCount} item{pendingCount !== 1 ? 's' : ''} pending sync
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
});
