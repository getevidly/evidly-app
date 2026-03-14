import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  trend?: string;
}

export function StatCard({ icon, label, value, trend }: StatCardProps) {
  const trendIsPositive = trend?.startsWith('+') || trend?.startsWith('↑');
  const trendIsNegative = trend?.startsWith('-') || trend?.startsWith('↓');

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        {trend != null && (
          <Text
            style={[
              styles.trend,
              trendIsPositive && styles.trendPositive,
              trendIsNegative && styles.trendNegative,
            ]}
          >
            {trend}
          </Text>
        )}
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 24,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0B1628',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: '#6B7F96',
    fontWeight: '500',
  },
  trend: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7F96',
  },
  trendPositive: {
    color: '#166534',
  },
  trendNegative: {
    color: '#991B1B',
  },
});
