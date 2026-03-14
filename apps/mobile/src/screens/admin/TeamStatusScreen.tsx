import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  Linking,
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

// ── Status config ─────────────────────────────────────────────
type TechStatus = 'on_job' | 'en_route' | 'available' | 'off_duty';

const STATUS_CONFIG: Record<
  TechStatus,
  { label: string; color: string; bgColor: string }
> = {
  on_job: { label: 'On Job', color: SUCCESS, bgColor: '#dcfce7' },
  en_route: { label: 'En Route', color: '#2563eb', bgColor: '#dbeafe' },
  available: { label: 'Available', color: '#6b7280', bgColor: '#f3f4f6' },
  off_duty: { label: 'Off Duty', color: '#9ca3af', bgColor: '#f9fafb' },
};

// ── Placeholder data ──────────────────────────────────────────
// TODO: Replace with live data from useTeamStatus() hook + Supabase realtime

interface TechMember {
  id: string;
  name: string;
  initials: string;
  phone: string;
  status: TechStatus;
  currentJob: {
    customer: string;
    address: string;
    startTime: string;
  } | null;
  todayProgress: {
    jobsCompleted: number;
    totalJobs: number;
    photos: number;
    deficiencies: number;
  };
  lastUpdated: string;
}

const TEAM: TechMember[] = [
  {
    id: 't1',
    name: 'Marcus Williams',
    initials: 'MW',
    phone: '+15551234567',
    status: 'on_job',
    currentJob: {
      customer: "Mario's Italian Kitchen",
      address: '1425 Main St, Suite B',
      startTime: '10:30 AM',
    },
    todayProgress: {
      jobsCompleted: 2,
      totalJobs: 5,
      photos: 14,
      deficiencies: 3,
    },
    lastUpdated: '2 min ago',
  },
  {
    id: 't2',
    name: 'Sarah Kim',
    initials: 'SK',
    phone: '+15559876543',
    status: 'en_route',
    currentJob: {
      customer: 'Seaside Grill',
      address: '100 Pier Way',
      startTime: '1:00 PM',
    },
    todayProgress: {
      jobsCompleted: 1,
      totalJobs: 3,
      photos: 8,
      deficiencies: 1,
    },
    lastUpdated: '5 min ago',
  },
  {
    id: 't3',
    name: 'James Rodriguez',
    initials: 'JR',
    phone: '+15555551234',
    status: 'on_job',
    currentJob: {
      customer: 'Fire & Ice BBQ',
      address: '3340 Smoke Rd',
      startTime: '11:00 AM',
    },
    todayProgress: {
      jobsCompleted: 1,
      totalJobs: 4,
      photos: 22,
      deficiencies: 5,
    },
    lastUpdated: '1 min ago',
  },
  {
    id: 't4',
    name: 'Emily Torres',
    initials: 'ET',
    phone: '+15558887777',
    status: 'available',
    currentJob: null,
    todayProgress: {
      jobsCompleted: 0,
      totalJobs: 2,
      photos: 0,
      deficiencies: 0,
    },
    lastUpdated: '12 min ago',
  },
  {
    id: 't5',
    name: 'David Martinez',
    initials: 'DM',
    phone: '+15554443333',
    status: 'off_duty',
    currentJob: null,
    todayProgress: {
      jobsCompleted: 0,
      totalJobs: 0,
      photos: 0,
      deficiencies: 0,
    },
    lastUpdated: '3h ago',
  },
];

// ── Component ─────────────────────────────────────────────────

export function TeamStatusScreen({ navigation }: { navigation?: any }) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: Refetch team data from Supabase realtime channel
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setRefreshing(false);
  }, []);

  const handleCall = (phone: string) => {
    // TODO: Use Linking.openURL(`tel:${phone}`)
    Linking.openURL(`tel:${phone}`).catch(() => {
      // Fallback — phone dialer not available (simulator, etc.)
    });
  };

  const handleMessage = (techId: string) => {
    // TODO: Navigate to in-app messaging or open SMS
    // navigation.navigate('Message', { techId })
  };

  const renderTechCard = ({ item: tech }: { item: TechMember }) => {
    const statusConfig = STATUS_CONFIG[tech.status];
    const progress = tech.todayProgress;
    const progressPercent =
      progress.totalJobs > 0
        ? Math.round((progress.jobsCompleted / progress.totalJobs) * 100)
        : 0;

    return (
      <View style={styles.techCard}>
        {/* ── Top row: Avatar, Name, Status ──────────────── */}
        <View style={styles.techCardTop}>
          <View style={styles.techAvatarRow}>
            <View style={styles.techAvatar}>
              <Text style={styles.techInitials}>{tech.initials}</Text>
              {/* Real-time indicator dot */}
              <View
                style={[
                  styles.statusIndicatorDot,
                  { backgroundColor: statusConfig.color },
                ]}
              />
            </View>
            <View style={styles.techNameBlock}>
              <Text style={styles.techName}>{tech.name}</Text>
              <Text style={styles.lastUpdated}>Updated {tech.lastUpdated}</Text>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusConfig.bgColor },
            ]}
          >
            <View
              style={[
                styles.statusBadgeDot,
                { backgroundColor: statusConfig.color },
              ]}
            />
            <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* ── Current Job (if on_job or en_route) ────────── */}
        {tech.currentJob && (
          <View style={styles.currentJobSection}>
            <Text style={styles.currentJobLabel}>
              {tech.status === 'en_route' ? 'Heading to:' : 'Currently at:'}
            </Text>
            <Text style={styles.currentJobCustomer}>
              {tech.currentJob.customer}
            </Text>
            <Text style={styles.currentJobAddress}>
              {tech.currentJob.address}
            </Text>
            <Text style={styles.currentJobTime}>
              Started: {tech.currentJob.startTime}
            </Text>
          </View>
        )}

        {/* ── Today's Progress ────────────────────────────── */}
        <View style={styles.progressSection}>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
            <Text style={styles.progressBarLabel}>
              {progress.jobsCompleted} of {progress.totalJobs} jobs
            </Text>
          </View>
          <View style={styles.progressStats}>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatValue}>{progress.photos}</Text>
              <Text style={styles.progressStatLabel}>Photos</Text>
            </View>
            <View style={styles.progressStat}>
              <Text
                style={[
                  styles.progressStatValue,
                  progress.deficiencies > 0 && styles.progressStatValueDanger,
                ]}
              >
                {progress.deficiencies}
              </Text>
              <Text style={styles.progressStatLabel}>Deficiencies</Text>
            </View>
          </View>
        </View>

        {/* ── Action Buttons ──────────────────────────────── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleCall(tech.phone)}
          >
            <Text style={styles.actionButtonIcon}>C</Text>
            <Text style={styles.actionButtonText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleMessage(tech.id)}
          >
            <Text style={styles.actionButtonIcon}>M</Text>
            <Text style={styles.actionButtonText}>Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Count by status for the header summary
  const statusCounts = TEAM.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Team Status</Text>
        <View style={styles.headerCounts}>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <View key={key} style={styles.headerCountItem}>
              <View
                style={[
                  styles.headerCountDot,
                  { backgroundColor: config.color },
                ]}
              />
              <Text style={styles.headerCountText}>
                {statusCounts[key] || 0}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Real-time indicator ───────────────────────────── */}
      <View style={styles.realtimeBanner}>
        <View style={styles.realtimeDot} />
        <Text style={styles.realtimeText}>Live updates active</Text>
      </View>

      {/* ── Tech List ─────────────────────────────────────── */}
      <FlatList
        data={TEAM}
        keyExtractor={(item) => item.id}
        renderItem={renderTechCard}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.cardGap} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
      />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },

  // Header
  header: {
    backgroundColor: CARD_BG,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  headerCounts: {
    flexDirection: 'row',
    gap: 12,
  },
  headerCountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerCountDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },

  // Realtime banner
  realtimeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#ecfdf5',
    gap: 6,
  },
  realtimeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SUCCESS,
  },
  realtimeText: {
    fontSize: 11,
    color: SUCCESS,
    fontWeight: '500',
  },

  // List
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  cardGap: {
    height: 12,
  },

  // Tech card
  techCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  techCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  techAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  techAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  techInitials: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
  statusIndicatorDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: CARD_BG,
  },
  techNameBlock: {
    flex: 1,
  },
  techName: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  lastUpdated: {
    fontSize: 11,
    color: TEXT_TERTIARY,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Current job
  currentJobSection: {
    backgroundColor: LIGHT_BG,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  currentJobLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_TERTIARY,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentJobCustomer: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  currentJobAddress: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginBottom: 2,
  },
  currentJobTime: {
    fontSize: 12,
    color: TEXT_TERTIARY,
  },

  // Progress
  progressSection: {
    marginBottom: 12,
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: BORDER,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: BRAND,
    borderRadius: 3,
  },
  progressBarLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  progressStats: {
    flexDirection: 'row',
    gap: 20,
  },
  progressStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND,
  },
  progressStatValueDanger: {
    color: DANGER,
  },
  progressStatLabel: {
    fontSize: 12,
    color: TEXT_TERTIARY,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  actionButtonIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND,
  },
});
