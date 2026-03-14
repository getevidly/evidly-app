/**
 * JobCard -- summary card for job lists (technician schedule, admin dispatch).
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { StatusBadge } from './StatusBadge';

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

const BRAND_BLUE = '#1e4d6b';
const BRAND_GOLD = '#d4af37';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Job {
  id: string;
  customer_name: string;
  customer_address: string;
  scheduled_time: string;
  status: string;
  service_types: string[];
}

interface JobCardProps {
  job: Job;
  onPress: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JobCard({ job, onPress }: JobCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header row: customer name + status */}
      <View style={styles.headerRow}>
        <Text style={styles.customerName} numberOfLines={1}>
          {job.customer_name}
        </Text>
        <StatusBadge status={job.status} size="sm" />
      </View>

      {/* Address */}
      <Text style={styles.address} numberOfLines={2}>
        {job.customer_address}
      </Text>

      {/* Time */}
      <Text style={styles.time}>{job.scheduled_time}</Text>

      {/* Service type pills */}
      <View style={styles.pillRow}>
        {job.service_types.map((svc) => (
          <View key={svc} style={styles.pill}>
            <Text style={styles.pillText}>{svc}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
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
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND_BLUE,
    flex: 1,
    marginRight: 8,
  },
  address: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
    lineHeight: 18,
  },
  time: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    backgroundColor: BRAND_GOLD + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND_GOLD,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
