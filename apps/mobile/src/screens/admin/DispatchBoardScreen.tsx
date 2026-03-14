import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Modal,
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

// ── Status colors for job blocks ──────────────────────────────
const JOB_STATUS_COLORS: Record<string, string> = {
  scheduled: '#2563eb',
  in_progress: GOLD,
  completed: SUCCESS,
  cancelled: '#9ca3af',
};

// ── Placeholder data ──────────────────────────────────────────
// TODO: Replace with live data from useDispatchBoard() hook

interface DispatchJob {
  id: string;
  time: string;
  endTime: string;
  customer: string;
  address: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  serviceType: string;
}

interface Technician {
  id: string;
  name: string;
  initials: string;
  jobs: DispatchJob[];
}

const generateWeekDays = (): { key: string; label: string; dayNum: number; isToday: boolean }[] => {
  const today = new Date();
  const days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = -1; i <= 5; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      key: d.toISOString().split('T')[0],
      label: dayNames[d.getDay()],
      dayNum: d.getDate(),
      isToday: i === 0,
    });
  }
  return days;
};

const WEEK_DAYS = generateWeekDays();

const TECHNICIANS: Technician[] = [
  {
    id: 't1',
    name: 'Marcus W.',
    initials: 'MW',
    jobs: [
      {
        id: 'j1',
        time: '8:00 AM',
        endTime: '10:00 AM',
        customer: "Mario's Italian Kitchen",
        address: '1425 Main St',
        status: 'completed',
        serviceType: 'Hood Cleaning',
      },
      {
        id: 'j2',
        time: '10:30 AM',
        endTime: '12:30 PM',
        customer: 'Blue Fin Sushi',
        address: '800 Harbor Blvd',
        status: 'in_progress',
        serviceType: 'Hood Cleaning',
      },
      {
        id: 'j3',
        time: '2:00 PM',
        endTime: '4:00 PM',
        customer: 'The Rustic Table',
        address: '2200 Oak Ave',
        status: 'scheduled',
        serviceType: 'Filter Exchange',
      },
    ],
  },
  {
    id: 't2',
    name: 'Sarah K.',
    initials: 'SK',
    jobs: [
      {
        id: 'j4',
        time: '9:00 AM',
        endTime: '11:30 AM',
        customer: 'Golden Dragon',
        address: '550 Chinatown Plaza',
        status: 'completed',
        serviceType: 'Hood Cleaning',
      },
      {
        id: 'j5',
        time: '1:00 PM',
        endTime: '3:00 PM',
        customer: 'Seaside Grill',
        address: '100 Pier Way',
        status: 'scheduled',
        serviceType: 'Inspection',
      },
    ],
  },
  {
    id: 't3',
    name: 'James R.',
    initials: 'JR',
    jobs: [
      {
        id: 'j6',
        time: '7:30 AM',
        endTime: '9:30 AM',
        customer: 'Campus Dining Hall',
        address: '1 University Dr',
        status: 'completed',
        serviceType: 'Hood Cleaning',
      },
      {
        id: 'j7',
        time: '11:00 AM',
        endTime: '1:00 PM',
        customer: 'Fire & Ice BBQ',
        address: '3340 Smoke Rd',
        status: 'in_progress',
        serviceType: 'Hood Cleaning',
      },
      {
        id: 'j8',
        time: '3:00 PM',
        endTime: '5:00 PM',
        customer: "Tony's Pizza",
        address: '900 Broadway',
        status: 'scheduled',
        serviceType: 'Filter Exchange',
      },
    ],
  },
  {
    id: 't4',
    name: 'Emily T.',
    initials: 'ET',
    jobs: [
      {
        id: 'j9',
        time: '10:00 AM',
        endTime: '12:00 PM',
        customer: 'Harbor Cafe',
        address: '42 Dock St',
        status: 'scheduled',
        serviceType: 'Hood Cleaning',
      },
    ],
  },
];

const QUICK_ACTION_ITEMS = [
  { key: 'create', label: 'Create Job', icon: '+' },
  { key: 'assign', label: 'Assign Tech', icon: 'A' },
  { key: 'message', label: 'Send Message', icon: 'M' },
];

// ── Component ─────────────────────────────────────────────────

export function DispatchBoardScreen({ navigation }: { navigation?: any }) {
  const [selectedDay, setSelectedDay] = useState(
    WEEK_DAYS.find((d) => d.isToday)?.key ?? WEEK_DAYS[0].key,
  );
  const [selectedJob, setSelectedJob] = useState<DispatchJob | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const handleJobPress = (job: DispatchJob) => {
    setSelectedJob(job);
  };

  const handleQuickAction = (key: string) => {
    setShowQuickActions(false);
    // TODO: Navigate to respective screen
    // create → CreateJob, assign → AssignTech, message → SendMessage
  };

  const renderTechRow = ({ item: tech }: { item: Technician }) => (
    <View style={styles.techRow}>
      {/* Tech info column */}
      <View style={styles.techInfo}>
        <View style={styles.techAvatar}>
          <Text style={styles.techInitials}>{tech.initials}</Text>
        </View>
        <Text style={styles.techName} numberOfLines={1}>
          {tech.name}
        </Text>
        <Text style={styles.techJobCount}>{tech.jobs.length} jobs</Text>
      </View>

      {/* Job blocks horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.jobBlocksContainer}
      >
        {tech.jobs.map((job) => (
          <TouchableOpacity
            key={job.id}
            style={[
              styles.jobBlock,
              { borderLeftColor: JOB_STATUS_COLORS[job.status] },
            ]}
            activeOpacity={0.7}
            onPress={() => handleJobPress(job)}
          >
            <View style={styles.jobBlockHeader}>
              <Text style={styles.jobBlockTime}>{job.time}</Text>
              <View
                style={[
                  styles.jobBlockStatusDot,
                  { backgroundColor: JOB_STATUS_COLORS[job.status] },
                ]}
              />
            </View>
            <Text style={styles.jobBlockCustomer} numberOfLines={1}>
              {job.customer}
            </Text>
            <Text style={styles.jobBlockService} numberOfLines={1}>
              {job.serviceType}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Date Picker Row ───────────────────────────────── */}
      <View style={styles.datePickerContainer}>
        <Text style={styles.datePickerTitle}>Dispatch Board</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.datePickerScroll}
        >
          {WEEK_DAYS.map((day) => (
            <TouchableOpacity
              key={day.key}
              style={[
                styles.dayChip,
                selectedDay === day.key && styles.dayChipSelected,
                day.isToday && selectedDay !== day.key && styles.dayChipToday,
              ]}
              onPress={() => setSelectedDay(day.key)}
            >
              <Text
                style={[
                  styles.dayChipLabel,
                  selectedDay === day.key && styles.dayChipLabelSelected,
                ]}
              >
                {day.label}
              </Text>
              <Text
                style={[
                  styles.dayChipNum,
                  selectedDay === day.key && styles.dayChipNumSelected,
                ]}
              >
                {day.dayNum}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Summary Row ───────────────────────────────────── */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {TECHNICIANS.length} technicians {'  |  '}
          {TECHNICIANS.reduce((sum, t) => sum + t.jobs.length, 0)} jobs
        </Text>
      </View>

      {/* ── Tech Rows ─────────────────────────────────────── */}
      <FlatList
        data={TECHNICIANS}
        keyExtractor={(item) => item.id}
        renderItem={renderTechRow}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* ── Quick Actions FAB ─────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setShowQuickActions(true)}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* ── Quick Actions Modal ───────────────────────────── */}
      <Modal
        visible={showQuickActions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuickActions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowQuickActions(false)}
        >
          <View style={styles.quickActionsSheet}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            {QUICK_ACTION_ITEMS.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={styles.quickActionRow}
                onPress={() => handleQuickAction(action.key)}
              >
                <View style={styles.quickActionIconCircle}>
                  <Text style={styles.quickActionIconText}>{action.icon}</Text>
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.quickActionCancel}
              onPress={() => setShowQuickActions(false)}
            >
              <Text style={styles.quickActionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Job Detail Modal ──────────────────────────────── */}
      <Modal
        visible={selectedJob !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedJob(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedJob(null)}
        >
          <View style={styles.jobDetailSheet}>
            {selectedJob && (
              <>
                <View style={styles.jobDetailHandle} />
                <View style={styles.jobDetailHeader}>
                  <Text style={styles.jobDetailCustomer}>
                    {selectedJob.customer}
                  </Text>
                  <View
                    style={[
                      styles.jobDetailStatusBadge,
                      {
                        backgroundColor:
                          JOB_STATUS_COLORS[selectedJob.status] + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.jobDetailStatusText,
                        { color: JOB_STATUS_COLORS[selectedJob.status] },
                      ]}
                    >
                      {selectedJob.status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.jobDetailAddress}>
                  {selectedJob.address}
                </Text>
                <View style={styles.jobDetailRow}>
                  <Text style={styles.jobDetailLabel}>Time:</Text>
                  <Text style={styles.jobDetailValue}>
                    {selectedJob.time} - {selectedJob.endTime}
                  </Text>
                </View>
                <View style={styles.jobDetailRow}>
                  <Text style={styles.jobDetailLabel}>Service:</Text>
                  <Text style={styles.jobDetailValue}>
                    {selectedJob.serviceType}
                  </Text>
                </View>
                <View style={styles.jobDetailActions}>
                  <TouchableOpacity
                    style={styles.jobDetailActionBtn}
                    onPress={() => {
                      // TODO: Navigate to full job detail screen
                      setSelectedJob(null);
                    }}
                  >
                    <Text style={styles.jobDetailActionBtnText}>
                      View Full Details
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.jobDetailReassignBtn}
                    onPress={() => {
                      // TODO: Open reassign technician picker
                      setSelectedJob(null);
                    }}
                  >
                    <Text style={styles.jobDetailReassignBtnText}>
                      Reassign
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },

  // Date picker
  datePickerContainer: {
    backgroundColor: BRAND,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: WHITE,
    marginBottom: 12,
  },
  datePickerScroll: {
    gap: 8,
  },
  dayChip: {
    width: 52,
    height: 64,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipSelected: {
    backgroundColor: WHITE,
  },
  dayChipToday: {
    borderWidth: 1,
    borderColor: GOLD,
  },
  dayChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  dayChipLabelSelected: {
    color: BRAND,
  },
  dayChipNum: {
    fontSize: 18,
    fontWeight: '700',
    color: WHITE,
  },
  dayChipNumSelected: {
    color: BRAND,
  },

  // Summary row
  summaryRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: CARD_BG,
  },
  summaryText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },

  // List
  listContent: {
    paddingBottom: 100,
  },
  separator: {
    height: 1,
    backgroundColor: BORDER,
  },

  // Tech row
  techRow: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    paddingVertical: 12,
  },
  techInfo: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  techAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  techInitials: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
  },
  techName: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  techJobCount: {
    fontSize: 10,
    color: TEXT_TERTIARY,
  },

  // Job blocks
  jobBlocksContainer: {
    gap: 8,
    paddingRight: 16,
    paddingVertical: 4,
  },
  jobBlock: {
    width: 140,
    backgroundColor: LIGHT_BG,
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
  },
  jobBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobBlockTime: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  jobBlockStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  jobBlockCustomer: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  jobBlockService: {
    fontSize: 10,
    color: TEXT_TERTIARY,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 28,
    color: WHITE,
    fontWeight: '300',
    lineHeight: 30,
  },

  // Modal overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },

  // Quick actions sheet
  quickActionsSheet: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 16,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  quickActionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: '700',
  },
  quickActionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  quickActionCancel: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  quickActionCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_TERTIARY,
  },

  // Job detail sheet
  jobDetailSheet: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingTop: 12,
  },
  jobDetailHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: BORDER,
    alignSelf: 'center',
    marginBottom: 16,
  },
  jobDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobDetailCustomer: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    flex: 1,
  },
  jobDetailStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  jobDetailStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  jobDetailAddress: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginBottom: 16,
  },
  jobDetailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  jobDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_TERTIARY,
    width: 70,
  },
  jobDetailValue: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    flex: 1,
  },
  jobDetailActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  jobDetailActionBtn: {
    flex: 1,
    backgroundColor: BRAND,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  jobDetailActionBtnText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '700',
  },
  jobDetailReassignBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: BRAND,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  jobDetailReassignBtnText: {
    color: BRAND,
    fontSize: 14,
    fontWeight: '700',
  },
});
