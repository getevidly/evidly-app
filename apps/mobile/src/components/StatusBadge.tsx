import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const STATUS_COLORS: Record<string, string> = {
  pending: '#6B7F96',
  in_progress: '#1e4d6b',
  completed: '#166534',
  approved: '#d4af37',
  rejected: '#991B1B',
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const backgroundColor = STATUS_COLORS[status] ?? '#6B7F96';
  const isSm = size === 'sm';

  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor },
        isSm ? styles.badgeSm : styles.badgeMd,
      ]}
    >
      <Text style={[styles.text, isSm ? styles.textSm : styles.textMd]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeMd: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  textSm: {
    fontSize: 11,
  },
  textMd: {
    fontSize: 13,
  },
});
