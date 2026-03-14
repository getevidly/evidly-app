import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type TechStatus = 'on_job' | 'traveling' | 'available' | 'off';

interface TechnicianStatus {
  id: string;
  name: string;
  initials: string;
  status: TechStatus;
  location: string;
  hoursToday: number;
  lastCheckIn: string;
}

/* ------------------------------------------------------------------ */
/*  Demo data                                                         */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<
  TechStatus,
  { label: string; color: string; bgColor: string }
> = {
  on_job: { label: 'On Job', color: '#27ae60', bgColor: '#eafaf1' },
  traveling: { label: 'Traveling', color: '#f1c40f', bgColor: '#fef9e7' },
  available: { label: 'Available', color: '#2980b9', bgColor: '#ebf5fb' },
  off: { label: 'Off', color: '#95a5a6', bgColor: '#f2f3f4' },
};

const TECHNICIANS: TechnicianStatus[] = [
  {
    id: 't1',
    name: 'Mike Rodriguez',
    initials: 'MR',
    status: 'on_job',
    location: 'Marriott Downtown - KEC',
    hoursToday: 4.5,
    lastCheckIn: '11:42 AM',
  },
  {
    id: 't2',
    name: 'Sarah Thompson',
    initials: 'ST',
    status: 'on_job',
    location: 'Chipotle #4412 - KEC',
    hoursToday: 5.0,
    lastCheckIn: '11:58 AM',
  },
  {
    id: 't3',
    name: 'James Lee',
    initials: 'JL',
    status: 'traveling',
    location: 'En route to Shake Shack Mall',
    hoursToday: 3.0,
    lastCheckIn: '11:15 AM',
  },
  {
    id: 't4',
    name: 'Ana Garcia',
    initials: 'AG',
    status: 'on_job',
    location: 'Wingstop #221 - FSI',
    hoursToday: 4.0,
    lastCheckIn: '11:30 AM',
  },
  {
    id: 't5',
    name: 'David Kim',
    initials: 'DK',
    status: 'available',
    location: 'Warehouse HQ',
    hoursToday: 2.5,
    lastCheckIn: '10:45 AM',
  },
  {
    id: 't6',
    name: 'Rachel Nguyen',
    initials: 'RN',
    status: 'off',
    location: '--',
    hoursToday: 0,
    lastCheckIn: 'Yesterday 5:12 PM',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function TeamStatusScreen() {
  const onJobCount = TECHNICIANS.filter((t) => t.status === 'on_job').length;
  const travelingCount = TECHNICIANS.filter((t) => t.status === 'traveling').length;
  const availableCount = TECHNICIANS.filter((t) => t.status === 'available').length;
  const offCount = TECHNICIANS.filter((t) => t.status === 'off').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Team Status</Text>
        <Text style={styles.headerSubtitle}>Real-time technician tracking</Text>
      </View>

      {/* Summary strip */}
      <View style={styles.summaryStrip}>
        {[
          { label: 'On Job', count: onJobCount, color: STATUS_CONFIG.on_job.color },
          { label: 'Traveling', count: travelingCount, color: STATUS_CONFIG.traveling.color },
          { label: 'Available', count: availableCount, color: STATUS_CONFIG.available.color },
          { label: 'Off', count: offCount, color: STATUS_CONFIG.off.color },
        ].map((item) => (
          <View key={item.label} style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: item.color }]} />
            <Text style={styles.summaryCount}>{item.count}</Text>
            <Text style={styles.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Technician list */}
      <View style={styles.listSection}>
        {TECHNICIANS.map((tech) => {
          const cfg = STATUS_CONFIG[tech.status];
          return (
            <View key={tech.id} style={styles.card}>
              {/* Top row: avatar + name + status badge */}
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{tech.initials}</Text>
                </View>
                <View style={styles.cardNameWrap}>
                  <Text style={styles.cardName}>{tech.name}</Text>
                  <Text style={styles.cardLocation}>{tech.location}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bgColor }]}>
                  <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
                  <Text style={[styles.statusLabel, { color: cfg.color }]}>
                    {cfg.label}
                  </Text>
                </View>
              </View>

              {/* Bottom row: hours + last check-in */}
              <View style={styles.cardBottom}>
                <View style={styles.cardMeta}>
                  <Text style={styles.metaLabel}>Hours Today</Text>
                  <Text style={styles.metaValue}>
                    {tech.hoursToday.toFixed(1)} hrs
                  </Text>
                </View>
                <View style={styles.cardMeta}>
                  <Text style={styles.metaLabel}>Last Check-in</Text>
                  <Text style={styles.metaValue}>{tech.lastCheckIn}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  content: {
    paddingBottom: 32,
  },

  /* Header */
  header: {
    backgroundColor: '#07111F',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7F96',
    marginTop: 4,
  },

  /* Summary strip */
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#D1D9E6',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0B1628',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7F96',
    marginTop: 2,
  },

  /* List */
  listSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D1D9E6',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1e4d6b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardNameWrap: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0B1628',
  },
  cardLocation: {
    fontSize: 12,
    color: '#6B7F96',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBottom: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
  },
  cardMeta: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: '#6B7F96',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0B1628',
    marginTop: 2,
  },
});
