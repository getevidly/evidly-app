import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';

// ── Brand tokens ──────────────────────────────────────────────
const BRAND = '#1e4d6b';
const GOLD = '#d4af37';
const WHITE = '#ffffff';
const LIGHT_BG = '#F4F6FA';
const CARD_BG = '#ffffff';
const TEXT_PRIMARY = '#0B1628';
const TEXT_SECONDARY = '#3D5068';
const TEXT_TERTIARY = '#6B7F96';
const BORDER = '#D1D9E6';
const SUCCESS = '#16a34a';

// ── Status colors ─────────────────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  scheduled: { bg: '#E0EAFF', text: BRAND, label: 'Scheduled' },
  en_route: { bg: '#FFF7E0', text: '#92400e', label: 'En Route' },
  in_progress: { bg: GOLD, text: TEXT_PRIMARY, label: 'In Progress' },
  completed: { bg: '#DCFCE7', text: SUCCESS, label: 'Completed' },
  cancelled: { bg: '#FEE2E2', text: '#dc2626', label: 'Cancelled' },
};

// ── Placeholder data ─────────────────────────────────────────
// TODO: Replace with useJobs(selectedDate) hook
interface Job {
  id: string;
  customer: string;
  address: string;
  time: string;
  status: string;
  equipmentCount: number;
}

const DEMO_JOBS: Job[] = [
  {
    id: 'job-101',
    customer: "Mario's Italian Kitchen",
    address: '1425 Main St, Suite B',
    time: '8:00 AM',
    status: 'completed',
    equipmentCount: 3,
  },
  {
    id: 'job-102',
    customer: 'Blue Fin Sushi',
    address: '800 Harbor Blvd',
    time: '10:30 AM',
    status: 'completed',
    equipmentCount: 2,
  },
  {
    id: 'job-103',
    customer: 'Taco Loco',
    address: '2200 Pacific Coast Hwy',
    time: '1:30 PM',
    status: 'in_progress',
    equipmentCount: 4,
  },
  {
    id: 'job-104',
    customer: 'Golden Dragon',
    address: '550 E Broadway',
    time: '3:00 PM',
    status: 'scheduled',
    equipmentCount: 2,
  },
  {
    id: 'job-105',
    customer: 'The Breakfast Club',
    address: '1100 Wilshire Blvd',
    time: '4:30 PM',
    status: 'scheduled',
    equipmentCount: 1,
  },
];

// ── Date helpers ──────────────────────────────────────────────
function formatDate(date: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-US', opts);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function JobsListScreen({ navigation }: { navigation?: any }) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs] = useState<Job[]>(DEMO_JOBS);

  const isToday =
    selectedDate.toDateString() === today.toDateString();
  const isTomorrow =
    selectedDate.toDateString() === addDays(today, 1).toDateString();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // TODO: Fetch jobs from API for selectedDate
    setTimeout(() => setRefreshing(false), 1000);
  }, [selectedDate]);

  const handleJobPress = (jobId: string) => {
    // TODO: navigation.navigate('JobDetail', { jobId })
  };

  const renderJobCard = ({ item }: { item: Job }) => {
    const status = STATUS_STYLES[item.status] ?? STATUS_STYLES.scheduled;
    return (
      <TouchableOpacity
        style={styles.jobCard}
        activeOpacity={0.7}
        onPress={() => handleJobPress(item.id)}
      >
        <View style={styles.jobCardRow}>
          <View style={styles.jobCardLeft}>
            <Text style={styles.jobTime}>{item.time}</Text>
          </View>
          <View style={styles.jobCardCenter}>
            <Text style={styles.jobCustomer} numberOfLines={1}>
              {item.customer}
            </Text>
            <Text style={styles.jobAddress} numberOfLines={1}>
              {item.address}
            </Text>
            <Text style={styles.jobEquipment}>
              {item.equipmentCount} unit{item.equipmentCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.jobCardRight}>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusBadgeText, { color: status.text }]}>
                {status.label}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Date picker ─────────────────────────────────── */}
      <View style={styles.datePicker}>
        <TouchableOpacity
          style={[styles.dateTab, isToday && styles.dateTabActive]}
          onPress={() => setSelectedDate(today)}
        >
          <Text style={[styles.dateTabText, isToday && styles.dateTabTextActive]}>
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dateTab, isTomorrow && styles.dateTabActive]}
          onPress={() => setSelectedDate(addDays(today, 1))}
        >
          <Text style={[styles.dateTabText, isTomorrow && styles.dateTabTextActive]}>
            Tomorrow
          </Text>
        </TouchableOpacity>
        <View style={styles.dateLabel}>
          <Text style={styles.dateLabelText}>{formatDate(selectedDate)}</Text>
        </View>
      </View>

      {/* ── Jobs count ──────────────────────────────────── */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {jobs.length} job{jobs.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* ── Jobs list ───────────────────────────────────── */}
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJobCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Jobs Scheduled</Text>
            <Text style={styles.emptySubtitle}>
              No jobs for {formatDate(selectedDate)}.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },

  // Date picker
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  dateTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  dateTabActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  dateTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  dateTabTextActive: {
    color: WHITE,
  },
  dateLabel: {
    marginLeft: 'auto',
  },
  dateLabelText: {
    fontSize: 13,
    color: TEXT_TERTIARY,
    fontWeight: '500',
  },

  // Count
  countRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  countText: {
    fontSize: 13,
    color: TEXT_TERTIARY,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // Job card
  jobCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  jobCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobCardLeft: {
    width: 64,
  },
  jobTime: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND,
  },
  jobCardCenter: {
    flex: 1,
    paddingRight: 8,
  },
  jobCustomer: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  jobAddress: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: 2,
  },
  jobEquipment: {
    fontSize: 11,
    color: TEXT_TERTIARY,
  },
  jobCardRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 64,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
});
