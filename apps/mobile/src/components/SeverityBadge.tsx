import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Severity = 'critical' | 'major' | 'minor';

interface SeverityBadgeProps {
  severity: Severity;
}

const SEVERITY_CONFIG: Record<Severity, { bg: string; text: string }> = {
  critical: { bg: '#DC2626', text: '#FFFFFF' },
  major: { bg: '#F59E0B', text: '#000000' },
  minor: { bg: '#6B7F96', text: '#FFFFFF' },
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>
        {severity.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
