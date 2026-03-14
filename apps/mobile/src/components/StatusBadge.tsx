/**
 * StatusBadge -- renders a colored pill for job / item statuses.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// ---------------------------------------------------------------------------
// Color mapping
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  scheduled:      { bg: '#DBEAFE', text: '#1E40AF' },
  pending:        { bg: '#DBEAFE', text: '#1E40AF' },
  in_progress:    { bg: '#FEF3C7', text: '#92400E' },
  active:         { bg: '#FEF3C7', text: '#92400E' },
  completed:      { bg: '#D1FAE5', text: '#065F46' },
  approved:       { bg: '#D1FAE5', text: '#065F46' },
  cancelled:      { bg: '#FEE2E2', text: '#991B1B' },
  rejected:       { bg: '#FEE2E2', text: '#991B1B' },
  needs_revision: { bg: '#FFEDD5', text: '#9A3412' },
};

const FALLBACK = { bg: '#F3F4F6', text: '#374151' };

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] ?? FALLBACK;
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg },
        isSm && styles.badgeSm,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: colors.text },
          isSm && styles.labelSm,
        ]}
        numberOfLines={1}
      >
        {status.replace(/_/g, ' ')}
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
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  labelSm: {
    fontSize: 11,
  },
});
