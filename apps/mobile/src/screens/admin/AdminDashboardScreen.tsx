import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

/* ------------------------------------------------------------------ */
/*  Demo data                                                         */
/* ------------------------------------------------------------------ */

const STATS = [
  { label: 'Active Jobs', value: 12, accent: '#1e4d6b' },
  { label: 'Techs in Field', value: 6, accent: '#2a6a8f' },
  { label: 'Pending QA', value: 4, accent: '#d4af37' },
  { label: 'Deficiencies Today', value: 3, accent: '#c0392b' },
];

interface ActivityItem {
  id: string;
  text: string;
  time: string;
  type: 'job' | 'qa' | 'deficiency' | 'team';
}

const RECENT_ACTIVITY: ActivityItem[] = [
  {
    id: '1',
    text: 'Mike R. completed KEC at Marriott Downtown',
    time: '12 min ago',
    type: 'job',
  },
  {
    id: '2',
    text: 'QA report submitted for Hilton Airport',
    time: '34 min ago',
    type: 'qa',
  },
  {
    id: '3',
    text: 'Deficiency flagged: grease buildup at Chipotle #4412',
    time: '1 hr ago',
    type: 'deficiency',
  },
  {
    id: '4',
    text: 'Sarah T. checked in at Panera Bread University',
    time: '1.5 hr ago',
    type: 'team',
  },
  {
    id: '5',
    text: 'New job scheduled: FSI at Wingstop #221',
    time: '2 hr ago',
    type: 'job',
  },
];

const TEAM_SUMMARY = [
  { label: 'On Job', count: 4, color: '#27ae60' },
  { label: 'Traveling', count: 1, color: '#f1c40f' },
  { label: 'Available', count: 1, color: '#2980b9' },
  { label: 'Off', count: 2, color: '#95a5a6' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function activityDotColor(type: ActivityItem['type']): string {
  switch (type) {
    case 'job':
      return '#1e4d6b';
    case 'qa':
      return '#d4af37';
    case 'deficiency':
      return '#c0392b';
    case 'team':
      return '#2a6a8f';
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function AdminDashboardScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Stat Cards */}
      <View style={styles.statsGrid}>
        {STATS.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <View style={[styles.statAccent, { backgroundColor: stat.accent }]} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Team Status Summary Bar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Team Status</Text>
        <View style={styles.teamBar}>
          {TEAM_SUMMARY.map((seg) => (
            <View key={seg.label} style={styles.teamSegment}>
              <View style={[styles.teamDot, { backgroundColor: seg.color }]} />
              <Text style={styles.teamSegLabel}>{seg.label}</Text>
              <Text style={styles.teamSegCount}>{seg.count}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recent Activity Feed */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {RECENT_ACTIVITY.map((item) => (
          <View key={item.id} style={styles.activityRow}>
            <View
              style={[
                styles.activityDot,
                { backgroundColor: activityDotColor(item.type) },
              ]}
            />
            <View style={styles.activityTextWrap}>
              <Text style={styles.activityText}>{item.text}</Text>
              <Text style={styles.activityTime}>{item.time}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Dispatch Board</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGold]}>
            <Text style={styles.actionBtnTextGold}>QA Review</Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 24,
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

  /* Stat Cards */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: 16,
  },
  statCard: {
    width: '46%',
    backgroundColor: '#0B1628',
    borderRadius: 12,
    padding: 16,
    margin: '2%',
    overflow: 'hidden',
  },
  statAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7F96',
    marginTop: 4,
  },

  /* Sections */
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0B1628',
    marginBottom: 12,
  },

  /* Team bar */
  teamBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D9E6',
  },
  teamSegment: {
    alignItems: 'center',
  },
  teamDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  teamSegLabel: {
    fontSize: 11,
    color: '#6B7F96',
  },
  teamSegCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0B1628',
    marginTop: 2,
  },

  /* Activity */
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D1D9E6',
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 12,
  },
  activityTextWrap: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#0B1628',
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7F96',
    marginTop: 4,
  },

  /* Quick Actions */
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1e4d6b',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionBtnGold: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  actionBtnTextGold: {
    color: '#d4af37',
    fontSize: 14,
    fontWeight: '600',
  },
});
