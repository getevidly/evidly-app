import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Job {
  id: string;
  customer: string;
  address: string;
  serviceType: string;
  status: string;
  time: string;
  technicianName?: string;
}

interface JobCardProps {
  job: Job;
  onPress: () => void;
}

const SERVICE_TYPE_COLORS: Record<string, string> = {
  cleaning: '#1e4d6b',
  inspection: '#d4af37',
  repair: '#991B1B',
  installation: '#166534',
  maintenance: '#6B21A8',
};

const STATUS_DOT_COLORS: Record<string, string> = {
  pending: '#6B7F96',
  in_progress: '#1e4d6b',
  completed: '#166534',
  cancelled: '#991B1B',
  scheduled: '#d4af37',
};

export function JobCard({ job, onPress }: JobCardProps) {
  const serviceColor =
    SERVICE_TYPE_COLORS[job.serviceType.toLowerCase()] ?? '#1e4d6b';
  const statusDotColor =
    STATUS_DOT_COLORS[job.status.toLowerCase()] ?? '#6B7F96';

  const serviceLabel = job.serviceType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <View style={styles.customerSection}>
          <View style={styles.statusRow}>
            <View
              style={[styles.statusDot, { backgroundColor: statusDotColor }]}
            />
            <Text style={styles.customer} numberOfLines={1}>
              {job.customer}
            </Text>
          </View>
          <Text style={styles.address} numberOfLines={1}>
            {job.address}
          </Text>
        </View>
        <Text style={styles.time}>{job.time}</Text>
      </View>

      <View style={styles.bottomRow}>
        <View style={[styles.serviceTypeBadge, { backgroundColor: serviceColor }]}>
          <Text style={styles.serviceTypeText}>{serviceLabel}</Text>
        </View>
        {job.technicianName != null && (
          <Text style={styles.technician}>{job.technicianName}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  customerSection: {
    flex: 1,
    marginRight: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  customer: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1628',
    flex: 1,
  },
  address: {
    fontSize: 13,
    color: '#6B7F96',
    marginLeft: 16,
  },
  time: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D5068',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceTypeBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  serviceTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  technician: {
    fontSize: 12,
    color: '#6B7F96',
    fontWeight: '500',
  },
});
