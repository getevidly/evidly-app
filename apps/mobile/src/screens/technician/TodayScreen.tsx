import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
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

// ── Placeholder data ─────────────────────────────────────────
// TODO: Replace with data from useTechProfile() / useJobs() hooks
const TECH_NAME = 'Marcus';
const IS_CLOCKED_IN = true;
const CLOCK_DURATION = '3h 42m';
const GPS_LOCATION = 'Downtown Service Area';
const STATS = {
  jobsCompleted: 2,
  totalJobs: 5,
  photosTaken: 14,
  deficienciesLogged: 3,
  pendingSync: 0,
};
const CURRENT_JOB = {
  id: 'job-101',
  customer: 'Mario\'s Italian Kitchen',
  address: '1425 Main St, Suite B',
  time: '1:30 PM',
  status: 'in_progress' as const,
};
const NEXT_JOB = {
  id: 'job-102',
  customer: 'Blue Fin Sushi',
  address: '800 Harbor Blvd',
  time: '3:00 PM',
  status: 'scheduled' as const,
};

// ── Quick action items ───────────────────────────────────────
const QUICK_ACTIONS = [
  { key: 'photo', label: 'Quick Photo', icon: '📷' },
  { key: 'voice', label: 'Voice Note', icon: '🎙️' },
  { key: 'issue', label: 'Report Issue', icon: '⚠️' },
  { key: 'checklist', label: 'Checklists', icon: '✅' },
];

export function TodayScreen({ navigation }: { navigation?: any }) {
  const [clockedIn, setClockedIn] = useState(IS_CLOCKED_IN);
  // TODO: Replace with real offline detection hook
  const isOffline = false;
  // TODO: Replace with real notification count
  const notificationCount = 3;

  const handleClockToggle = () => {
    // TODO: Call clock in/out API with GPS coordinates
    setClockedIn((prev) => !prev);
  };

  const handleStartJob = (jobId: string) => {
    // TODO: navigation.navigate('JobDetail', { jobId })
  };

  const handleQuickAction = (key: string) => {
    // TODO: Navigate to respective screen
    // photo → PhotoCapture, voice → VoiceNote, issue → ReportIssue, checklist → Checklist
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* ── Header ────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Good afternoon,</Text>
            <Text style={styles.techName}>{TECH_NAME}</Text>
          </View>
          <View style={styles.headerRight}>
            {isOffline && (
              <View style={styles.offlineBadge}>
                <Text style={styles.offlineBadgeText}>Offline</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.bellButton}
              onPress={() => {
                // TODO: navigation.navigate('Notifications')
              }}
            >
              <Text style={styles.bellIcon}>🔔</Text>
              {notificationCount > 0 && (
                <View style={styles.notifDot}>
                  <Text style={styles.notifDotText}>{notificationCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Clock In / Out Card ───────────────────────── */}
        <TouchableOpacity
          style={[
            styles.clockCard,
            clockedIn ? styles.clockCardActive : styles.clockCardInactive,
          ]}
          onPress={handleClockToggle}
          activeOpacity={0.8}
        >
          <Text style={styles.clockLabel}>
            {clockedIn ? 'Clocked In' : 'Clocked Out'}
          </Text>
          <Text style={styles.clockDuration}>
            {clockedIn ? CLOCK_DURATION : 'Tap to Clock In'}
          </Text>
          <Text style={styles.clockGps}>{GPS_LOCATION}</Text>
        </TouchableOpacity>

        {/* ── Today's Stats ─────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {STATS.jobsCompleted}/{STATS.totalJobs}
            </Text>
            <Text style={styles.statLabel}>Jobs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{STATS.photosTaken}</Text>
            <Text style={styles.statLabel}>Photos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{STATS.deficienciesLogged}</Text>
            <Text style={styles.statLabel}>Deficiencies</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, STATS.pendingSync > 0 && styles.syncPending]}>
              {STATS.pendingSync === 0 ? 'Synced' : STATS.pendingSync}
            </Text>
            <Text style={styles.statLabel}>Sync</Text>
          </View>
        </View>

        {/* ── Current Job Card ──────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Current Job</Text>
        </View>
        <View style={styles.jobCard}>
          <View style={styles.jobCardHeader}>
            <Text style={styles.jobCustomer}>{CURRENT_JOB.customer}</Text>
            <View style={styles.statusBadgeActive}>
              <Text style={styles.statusBadgeActiveText}>In Progress</Text>
            </View>
          </View>
          <Text style={styles.jobAddress}>{CURRENT_JOB.address}</Text>
          <Text style={styles.jobTime}>{CURRENT_JOB.time}</Text>
          <View style={styles.jobActions}>
            <TouchableOpacity
              style={styles.jobActionBtn}
              onPress={() => {
                // TODO: Open maps with address
              }}
            >
              <Text style={styles.jobActionBtnText}>Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.jobActionBtn}
              onPress={() => {
                // TODO: Open phone dialer
              }}
            >
              <Text style={styles.jobActionBtnText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.jobPrimaryBtn}
              onPress={() => handleStartJob(CURRENT_JOB.id)}
            >
              <Text style={styles.jobPrimaryBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Next Job Card ─────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Next Job</Text>
        </View>
        <View style={styles.jobCard}>
          <View style={styles.jobCardHeader}>
            <Text style={styles.jobCustomer}>{NEXT_JOB.customer}</Text>
            <View style={styles.statusBadgeScheduled}>
              <Text style={styles.statusBadgeScheduledText}>Scheduled</Text>
            </View>
          </View>
          <Text style={styles.jobAddress}>{NEXT_JOB.address}</Text>
          <Text style={styles.jobTime}>{NEXT_JOB.time}</Text>
          <View style={styles.jobActions}>
            <TouchableOpacity
              style={styles.jobActionBtn}
              onPress={() => {
                // TODO: Open maps
              }}
            >
              <Text style={styles.jobActionBtnText}>Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.jobActionBtn}
              onPress={() => {
                // TODO: Open dialer
              }}
            >
              <Text style={styles.jobActionBtnText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.jobPrimaryBtn}
              onPress={() => handleStartJob(NEXT_JOB.id)}
            >
              <Text style={styles.jobPrimaryBtnText}>Start Job</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Quick Actions Grid ────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={styles.quickActionCard}
              onPress={() => handleQuickAction(action.key)}
            >
              <Text style={styles.quickActionIcon}>{action.icon}</Text>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────
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
    marginBottom: 16,
  },
  headerLeft: {},
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greeting: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  techName: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  offlineBadge: {
    backgroundColor: DANGER,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineBadgeText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: '600',
  },
  bellButton: {
    position: 'relative',
    padding: 8,
  },
  bellIcon: {
    fontSize: 22,
  },
  notifDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: DANGER,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDotText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: '700',
  },

  // Clock card
  clockCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  clockCardActive: {
    backgroundColor: BRAND,
  },
  clockCardInactive: {
    backgroundColor: TEXT_TERTIARY,
  },
  clockLabel: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  clockDuration: {
    color: WHITE,
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  clockGps: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
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
  statLabel: {
    fontSize: 11,
    color: TEXT_TERTIARY,
  },
  syncPending: {
    color: GOLD,
  },

  // Section header
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },

  // Job card
  jobCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobCustomer: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    flex: 1,
  },
  jobAddress: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginBottom: 2,
  },
  jobTime: {
    fontSize: 13,
    color: TEXT_TERTIARY,
    marginBottom: 12,
  },
  statusBadgeActive: {
    backgroundColor: GOLD,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeActiveText: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadgeScheduled: {
    backgroundColor: '#E0EAFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeScheduledText: {
    color: BRAND,
    fontSize: 11,
    fontWeight: '600',
  },
  jobActions: {
    flexDirection: 'row',
    gap: 8,
  },
  jobActionBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  jobActionBtnText: {
    fontSize: 13,
    color: BRAND,
    fontWeight: '600',
  },
  jobPrimaryBtn: {
    flex: 1,
    backgroundColor: BRAND,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  jobPrimaryBtnText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
  },

  // Quick actions grid
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
});
