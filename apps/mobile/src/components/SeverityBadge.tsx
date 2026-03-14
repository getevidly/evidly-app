/**
 * SeverityBadge -- deficiency severity pill (critical / major / minor).
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// ---------------------------------------------------------------------------
// Color mapping
// ---------------------------------------------------------------------------

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#FEE2E2', text: '#DC2626' },
  major:    { bg: '#FFEDD5', text: '#EA580C' },
  minor:    { bg: '#FEF9C3', text: '#CA8A04' },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SeverityBadgeProps {
  severity: 'critical' | 'major' | 'minor';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const colors = SEVERITY_COLORS[severity];

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.label, { color: colors.text }]}>
        {severity}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
