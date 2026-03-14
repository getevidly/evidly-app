/**
 * StatCard -- compact stats display card with optional icon and accent color.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

const BRAND_BLUE = '#1e4d6b';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatCard({ label, value, icon, color = BRAND_BLUE }: StatCardProps) {
  return (
    <View style={styles.card}>
      {icon ? (
        <View style={[styles.iconContainer, { backgroundColor: color + '18' }]}>
          <Text style={[styles.icon, { color }]}>{icon}</Text>
        </View>
      ) : null}

      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 20,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
});
