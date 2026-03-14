import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';

// ── Brand tokens ──────────────────────────────────────────────
const BRAND = '#1e4d6b';
const BRAND_DARK = '#163a52';
const GOLD = '#d4af37';
const WHITE = '#ffffff';
const LIGHT_BG = '#F4F6FA';
const CARD_BG = '#ffffff';
const TEXT_PRIMARY = '#0B1628';
const TEXT_SECONDARY = '#3D5068';
const TEXT_TERTIARY = '#6B7F96';
const BORDER = '#D1D9E6';
const SUCCESS = '#16a34a';
const DANGER = '#dc2626';
const WARNING = '#f59e0b';

// ── Status colors ─────────────────────────────────────────────
const STATUS_COLORS = {
  onJob: SUCCESS,
  enRoute: '#2563eb',
  available: '#9ca3af',
  offDuty: '#d1d5db',
} as const;

// ── Placeholder data ──────────────────────────────────────────
// TODO: Replace with live data from useAdminDashboard() hook

const STATS = {
  activeJobs: 8,
  completedToday: 12,
  revenueToday: 4850,
  pendingQA: 3,
};

const TEAM_MEMBERS = [
  { id: 't1', name: 'Marcus W.', status: 'onJob' as const, lat: 34.05, lng: -118.25 },
  { id: 't2', name: 'Sarah K.', status: 'enRoute' as const, lat: 34.06, lng: -118.24 },
  { id: 't3', name: 'James R.', status: 'onJob' as const, lat: 34.04, lng: -118.26 },
  { id: 't4', name: 'Emily T.', status: 'available' as const, lat: 34.05, lng: -118.23 },
  { id: 't5', name: 'David M.', status: 'offDuty' as const, lat: 0, lng: 0 },
];

interface Alert {
  id: string;
  type: 'qa' | 'overdue' | 'clockIn' | 'insurance';
  title: string;
  message: string;
  time: string;
}

const ALERTS: Alert[] = [
  {
    id: 'a1',
    type: 'qa',
    title: 'QA Review Pending',
    message: 'Job #1042 - Mario\'s Italian Kitchen awaiting approval',
    time: '15 min ago',
  },
  {
    id: 'a2',
    type: 'overdue',
    title: 'Job Overdue',
    message: 'Job #1038 - Seaside Grill exceeded estimated time by 45 min',
    time: '32 min ago',
  },
  {
    id: 'a3',
    type: 'clockIn',
    title: 'Clock-In Issue',
    message: 'David M. has not clocked in for scheduled shift (8:00 AM)',
    time: '1h ago',
  },
  {
    id: 'a4',
    type: 'insurance',
    title: 'Insurance Expiring',
    message: 'Vehicle insurance for Unit #3 expires in 5 days',
    time: '2h ago',
  },
  {
    id: 'a5',
    type: 'qa',
    title: 'QA Review Pending',
    message: 'Job #1040 - The Rustic Table awaiting approval',
    time: '3h ago',
  },
];

const ALERT_COLORS: Record<Alert['type'], string> = {
  qa: GOLD,
  overdue: DANGER,
  clockIn: WARNING,
  insurance: '#7c3aed',
};

const ALERT_ICONS: Record<Alert['type'], string> = {
  qa: 'QA',
  overdue: '!!',
  clockIn: 'CI',
  insurance: 'INS',
};

// ── Component ─────────────────────────────────────────────────

export function AdminDashboardScreen({ navigation }: { navigation?: any }) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: Refetch dashboard data from Supabase
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setRefreshing(false);
  }, []);

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString('en-US')}`;

  const getStatusLabel = (status: keyof typeof STATUS_COLORS) => {
    switch (status) {
      case 'onJob':
        return 'On Job';
      case 'enRoute':
        return 'En Route';
      case 'available':
        return 'Available';
      case 'offDuty':
        return 'Off Duty';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
      >
        {/* ── Header ──────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>HoodOps Admin</Text>
            <Text style={styles.headerSubtitle}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.notifButton}
            onPress={() => {
              // TODO: navigation.navigate('Notifications')
            }}
          >
            <Text style={styles.notifIcon}>{'bell'}</Text>
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{ALERTS.length}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Stats Cards Row ────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{STATS.activeJobs}</Text>
            <Text style={styles.statLabel}>Active Jobs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{STATS.completedToday}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.statValueGold]}>
              {formatCurrency(STATS.revenueToday)}
            </Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
          <View style={styles.statCard}>
            <Text
              style={[
                styles.statValue,
                STATS.pendingQA > 0 && styles.statValueWarning,
              ]}
            >
              {STATS.pendingQA}
            </Text>
            <Text style={styles.statLabel}>Pending QA</Text>
          </View>
        </View>

        {/* ── Team Map Placeholder ────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Team Map</Text>
        </View>
        <View style={styles.mapPlaceholder}>
          {/* TODO: Replace with react-native-maps MapView */}
          <Text style={styles.mapPlaceholderText}>Map</Text>
          <Text style={styles.mapPlaceholderSub}>
            Team locations will appear here
          </Text>
        </View>

        {/* ── Map Legend ──────────────────────────────────── */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: STATUS_COLORS.onJob }]}
            />
            <Text style={styles.legendLabel}>On Job</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: STATUS_COLORS.enRoute },
              ]}
            />
            <Text style={styles.legendLabel}>En Route</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: STATUS_COLORS.available },
              ]}
            />
            <Text style={styles.legendLabel}>Available</Text>
          </View>
        </View>

        {/* ── Team Quick Status ───────────────────────────── */}
        <View style={styles.teamQuickRow}>
          {TEAM_MEMBERS.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={styles.teamChip}
              onPress={() => {
                // TODO: navigation.navigate('TeamStatus', { techId: member.id })
              }}
            >
              <View
                style={[
                  styles.teamChipDot,
                  { backgroundColor: STATUS_COLORS[member.status] },
                ]}
              />
              <Text style={styles.teamChipName}>{member.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Alerts Section ──────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Alerts</Text>
          <TouchableOpacity
            onPress={() => {
              // TODO: navigation.navigate('AllAlerts')
            }}
          >
            <Text style={styles.seeAllLink}>See All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.alertsScroll}
        >
          {ALERTS.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={styles.alertCard}
              activeOpacity={0.7}
              onPress={() => {
                // TODO: Navigate to relevant detail screen based on alert.type
              }}
            >
              <View style={styles.alertCardTop}>
                <View
                  style={[
                    styles.alertIconBadge,
                    { backgroundColor: ALERT_COLORS[alert.type] },
                  ]}
                >
                  <Text style={styles.alertIconText}>
                    {ALERT_ICONS[alert.type]}
                  </Text>
                </View>
                <Text style={styles.alertTime}>{alert.time}</Text>
              </View>
              <Text style={styles.alertTitle} numberOfLines={1}>
                {alert.title}
              </Text>
              <Text style={styles.alertMessage} numberOfLines={2}>
                {alert.message}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  headerSubtitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  notifButton: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIcon: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontWeight: '600',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: DANGER,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: LIGHT_BG,
  },
  notifBadgeText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: '700',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND,
    marginBottom: 2,
  },
  statValueGold: {
    color: GOLD,
    fontSize: 15,
  },
  statValueWarning: {
    color: WARNING,
  },
  statLabel: {
    fontSize: 10,
    color: TEXT_TERTIARY,
    textAlign: 'center',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND,
  },

  // Map placeholder
  mapPlaceholder: {
    height: 200,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  mapPlaceholderText: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_TERTIARY,
  },
  mapPlaceholderSub: {
    fontSize: 12,
    color: TEXT_TERTIARY,
    marginTop: 4,
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },

  // Team quick status row
  teamQuickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  teamChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 6,
  },
  teamChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  teamChipName: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },

  // Alerts
  alertsScroll: {
    gap: 12,
    paddingBottom: 4,
  },
  alertCard: {
    width: 240,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  alertCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIconText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: '700',
  },
  alertTime: {
    fontSize: 11,
    color: TEXT_TERTIARY,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    lineHeight: 17,
  },
});
