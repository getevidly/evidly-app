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
const WARNING = '#f59e0b';

// ── Job progress steps ────────────────────────────────────────
const JOB_STEPS = [
  'Pre-Inspection',
  'Service',
  'Post-Inspection',
  'Report',
  'Signatures',
] as const;

type StepStatus = 'completed' | 'current' | 'upcoming';

// ── Placeholder data ─────────────────────────────────────────
// TODO: Replace with useJob(jobId) hook pulling from API / offline cache
const DEMO_JOB = {
  id: 'job-103',
  jobNumber: 'HO-2026-0347',
  status: 'in_progress',
  currentStep: 1, // 0-indexed: Service phase
  customer: {
    businessName: 'Taco Loco',
    address: '2200 Pacific Coast Hwy, Long Beach, CA 90806',
    meetingLocation: 'Back kitchen door — ask for Manager Rosa',
    contactName: 'Rosa Martinez',
    contactPhone: '(562) 555-0142',
    previousNotes:
      'Last visit: grease buildup on secondary hood. Fan belt showed wear.',
  },
  equipment: [
    { id: 'eq-1', name: 'Primary Exhaust Hood', type: 'Type I', qrScanned: true },
    { id: 'eq-2', name: 'Secondary Exhaust Hood', type: 'Type I', qrScanned: false },
    { id: 'eq-3', name: 'Grease Trap', type: '50 gal', qrScanned: false },
    { id: 'eq-4', name: 'Fire Suppression', type: 'Ansul R-102', qrScanned: true },
  ],
  preInspection: { completed: 8, total: 12 },
  postInspection: { completed: 0, total: 10 },
  photos: { before: 4, during: 2, after: 0 },
  deficiencies: { critical: 0, major: 1, minor: 2 },
  reportReady: false,
  signatures: { tech: false, customer: false },
  timerSeconds: 2654, // ~44 min
};

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getStepStatus(stepIndex: number, currentStep: number): StepStatus {
  if (stepIndex < currentStep) return 'completed';
  if (stepIndex === currentStep) return 'current';
  return 'upcoming';
}

export function JobDetailScreen({
  route,
  navigation,
}: {
  route?: { params?: { jobId?: string } };
  navigation?: any;
}) {
  const jobId = route?.params?.jobId ?? DEMO_JOB.id;
  const [job] = useState(DEMO_JOB);
  const [timerRunning, setTimerRunning] = useState(true);

  // TODO: useEffect timer interval to update timerSeconds

  const handleStartComplete = () => {
    if (job.status === 'in_progress') {
      // TODO: Call completeJob API
    } else {
      // TODO: Call startJob API
    }
  };

  const allChecklistsDone =
    job.preInspection.completed === job.preInspection.total &&
    job.postInspection.completed === job.postInspection.total;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* ── Header ────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.jobNumber}>{job.jobNumber}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>In Progress</Text>
          </View>
        </View>

        {/* ── Customer Card ─────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer</Text>
          <Text style={styles.customerName}>{job.customer.businessName}</Text>
          <Text style={styles.customerDetail}>{job.customer.address}</Text>
          <Text style={styles.customerMeeting}>{job.customer.meetingLocation}</Text>

          <View style={styles.customerActions}>
            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={() => {
                // TODO: Open maps with job.customer.address
              }}
            >
              <Text style={styles.actionBtnOutlineText}>Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={() => {
                // TODO: Linking.openURL(`tel:${job.customer.contactPhone}`)
              }}
            >
              <Text style={styles.actionBtnOutlineText}>
                Call {job.customer.contactName}
              </Text>
            </TouchableOpacity>
          </View>

          {job.customer.previousNotes && (
            <View style={styles.previousNotes}>
              <Text style={styles.previousNotesLabel}>Previous Visit Notes</Text>
              <Text style={styles.previousNotesText}>
                {job.customer.previousNotes}
              </Text>
            </View>
          )}
        </View>

        {/* ── Job Progress Indicator ────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Progress</Text>
          <View style={styles.progressRow}>
            {JOB_STEPS.map((step, index) => {
              const status = getStepStatus(index, job.currentStep);
              return (
                <View key={step} style={styles.progressStep}>
                  <View
                    style={[
                      styles.progressDot,
                      status === 'completed' && styles.progressDotCompleted,
                      status === 'current' && styles.progressDotCurrent,
                      status === 'upcoming' && styles.progressDotUpcoming,
                    ]}
                  />
                  <Text
                    style={[
                      styles.progressLabel,
                      status === 'current' && styles.progressLabelCurrent,
                    ]}
                    numberOfLines={1}
                  >
                    {step}
                  </Text>
                  {index < JOB_STEPS.length - 1 && (
                    <View
                      style={[
                        styles.progressLine,
                        status === 'completed' && styles.progressLineCompleted,
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Action Card 1: Pre-Inspection Checklist ───── */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => {
            // TODO: navigation.navigate('Checklist', { jobId, phase: 'pre' })
          }}
        >
          <View style={styles.actionCardHeader}>
            <Text style={styles.cardTitle}>Pre-Inspection Checklist</Text>
            <Text style={styles.progressFraction}>
              {job.preInspection.completed}/{job.preInspection.total}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${(job.preInspection.completed / job.preInspection.total) * 100}%`,
                },
              ]}
            />
          </View>
          <TouchableOpacity style={styles.cardActionBtn}>
            <Text style={styles.cardActionBtnText}>
              {job.preInspection.completed > 0 ? 'Continue' : 'Start'}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* ── Action Card 2: Equipment List ─────────────── */}
        <View style={styles.card}>
          <View style={styles.actionCardHeader}>
            <Text style={styles.cardTitle}>Equipment</Text>
            <TouchableOpacity
              onPress={() => {
                // TODO: Open QR scanner
              }}
            >
              <Text style={styles.qrScanText}>Scan QR</Text>
            </TouchableOpacity>
          </View>
          {job.equipment.map((eq) => (
            <View key={eq.id} style={styles.equipmentRow}>
              <View style={styles.equipmentInfo}>
                <Text style={styles.equipmentName}>{eq.name}</Text>
                <Text style={styles.equipmentType}>{eq.type}</Text>
              </View>
              <View
                style={[
                  styles.qrBadge,
                  eq.qrScanned ? styles.qrBadgeScanned : styles.qrBadgePending,
                ]}
              >
                <Text
                  style={[
                    styles.qrBadgeText,
                    eq.qrScanned
                      ? styles.qrBadgeTextScanned
                      : styles.qrBadgeTextPending,
                  ]}
                >
                  {eq.qrScanned ? 'Scanned' : 'Pending'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Action Card 3: Photo Documentation ────────── */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => {
            // TODO: navigation.navigate('PhotoCapture', { jobId })
          }}
        >
          <View style={styles.actionCardHeader}>
            <Text style={styles.cardTitle}>Photo Documentation</Text>
            <TouchableOpacity style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.photoCountsRow}>
            <View style={styles.photoCount}>
              <Text style={styles.photoCountValue}>{job.photos.before}</Text>
              <Text style={styles.photoCountLabel}>Before</Text>
            </View>
            <View style={styles.photoCount}>
              <Text style={styles.photoCountValue}>{job.photos.during}</Text>
              <Text style={styles.photoCountLabel}>During</Text>
            </View>
            <View style={styles.photoCount}>
              <Text style={styles.photoCountValue}>{job.photos.after}</Text>
              <Text style={styles.photoCountLabel}>After</Text>
            </View>
          </View>
          {/* TODO: Photo grid preview thumbnails */}
        </TouchableOpacity>

        {/* ── Action Card 4: Deficiencies ───────────────── */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => {
            // TODO: navigation.navigate('Deficiencies', { jobId })
          }}
        >
          <View style={styles.actionCardHeader}>
            <Text style={styles.cardTitle}>Deficiencies</Text>
            <TouchableOpacity style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.deficiencyCountsRow}>
            <View style={[styles.severityBadge, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.severityBadgeText, { color: DANGER }]}>
                {job.deficiencies.critical} Critical
              </Text>
            </View>
            <View style={[styles.severityBadge, { backgroundColor: '#FFF7ED' }]}>
              <Text style={[styles.severityBadgeText, { color: '#ea580c' }]}>
                {job.deficiencies.major} Major
              </Text>
            </View>
            <View style={[styles.severityBadge, { backgroundColor: '#FEFCE8' }]}>
              <Text style={[styles.severityBadgeText, { color: '#ca8a04' }]}>
                {job.deficiencies.minor} Minor
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Action Card 5: Post-Inspection Checklist ──── */}
        <TouchableOpacity
          style={[styles.card, job.currentStep < 2 && styles.cardLocked]}
          activeOpacity={job.currentStep >= 2 ? 0.7 : 1}
          onPress={() => {
            if (job.currentStep >= 2) {
              // TODO: navigation.navigate('Checklist', { jobId, phase: 'post' })
            }
          }}
        >
          <View style={styles.actionCardHeader}>
            <Text style={styles.cardTitle}>Post-Inspection Checklist</Text>
            {job.currentStep < 2 && (
              <Text style={styles.lockedText}>Locked</Text>
            )}
            {job.currentStep >= 2 && (
              <Text style={styles.progressFraction}>
                {job.postInspection.completed}/{job.postInspection.total}
              </Text>
            )}
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${
                    job.postInspection.total > 0
                      ? (job.postInspection.completed / job.postInspection.total) * 100
                      : 0
                  }%`,
                },
              ]}
            />
          </View>
          {job.currentStep >= 2 && (
            <TouchableOpacity style={styles.cardActionBtn}>
              <Text style={styles.cardActionBtnText}>
                {job.postInspection.completed > 0 ? 'Continue' : 'Start'}
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* ── Action Card 6: Generate Report ────────────── */}
        <View style={[styles.card, !allChecklistsDone && styles.cardLocked]}>
          <Text style={styles.cardTitle}>Generate Report</Text>
          <Text style={styles.cardSubtitle}>
            {allChecklistsDone
              ? 'All checklists complete. Ready to generate.'
              : 'Complete pre and post checklists to enable.'}
          </Text>
          <View style={styles.reportActions}>
            <TouchableOpacity
              style={[
                styles.actionBtnOutline,
                !allChecklistsDone && styles.actionBtnDisabled,
              ]}
              disabled={!allChecklistsDone}
              onPress={() => {
                // TODO: navigation.navigate('ReportGenerator', { jobId })
              }}
            >
              <Text style={styles.actionBtnOutlineText}>Preview</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtnFilled,
                !allChecklistsDone && styles.actionBtnDisabled,
              ]}
              disabled={!allChecklistsDone}
              onPress={() => {
                // TODO: navigation.navigate('ReportGenerator', { jobId })
              }}
            >
              <Text style={styles.actionBtnFilledText}>Generate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Action Card 7: Collect Signatures ─────────── */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => {
            // TODO: navigation.navigate('Signature', { jobId })
          }}
        >
          <Text style={styles.cardTitle}>Collect Signatures</Text>
          <View style={styles.sigRow}>
            <View style={styles.sigItem}>
              <View
                style={[
                  styles.sigDot,
                  job.signatures.tech ? styles.sigDotDone : styles.sigDotPending,
                ]}
              />
              <Text style={styles.sigLabel}>Technician</Text>
            </View>
            <View style={styles.sigItem}>
              <View
                style={[
                  styles.sigDot,
                  job.signatures.customer
                    ? styles.sigDotDone
                    : styles.sigDotPending,
                ]}
              />
              <Text style={styles.sigLabel}>Customer</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Bottom spacer for action bar */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── Bottom Action Bar ───────────────────────────── */}
      <View style={styles.bottomBar}>
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Job Timer</Text>
          <Text style={styles.timerValue}>{formatTimer(job.timerSeconds)}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.bottomActionBtn,
            job.status === 'in_progress'
              ? styles.bottomActionComplete
              : styles.bottomActionStart,
          ]}
          onPress={handleStartComplete}
        >
          <Text style={styles.bottomActionBtnText}>
            {job.status === 'in_progress' ? 'Complete Job' : 'Start Job'}
          </Text>
        </TouchableOpacity>
      </View>
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
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  jobNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  statusBadge: {
    backgroundColor: GOLD,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },

  // Card
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardLocked: {
    opacity: 0.5,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginBottom: 12,
  },

  // Customer
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  customerDetail: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginBottom: 4,
  },
  customerMeeting: {
    fontSize: 12,
    color: GOLD,
    fontWeight: '600',
    marginBottom: 12,
  },
  customerActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  previousNotes: {
    backgroundColor: LIGHT_BG,
    borderRadius: 8,
    padding: 10,
  },
  previousNotesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_TERTIARY,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  previousNotesText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    lineHeight: 18,
  },

  // Progress dots
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  progressDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginBottom: 6,
  },
  progressDotCompleted: {
    backgroundColor: SUCCESS,
  },
  progressDotCurrent: {
    backgroundColor: GOLD,
    borderWidth: 3,
    borderColor: '#fde68a',
  },
  progressDotUpcoming: {
    backgroundColor: BORDER,
  },
  progressLabel: {
    fontSize: 9,
    color: TEXT_TERTIARY,
    textAlign: 'center',
  },
  progressLabelCurrent: {
    color: TEXT_PRIMARY,
    fontWeight: '700',
  },
  progressLine: {
    position: 'absolute',
    top: 9,
    left: '60%',
    right: '-40%',
    height: 2,
    backgroundColor: BORDER,
  },
  progressLineCompleted: {
    backgroundColor: SUCCESS,
  },

  // Action card header
  actionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressFraction: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND,
  },
  lockedText: {
    fontSize: 12,
    color: TEXT_TERTIARY,
    fontWeight: '600',
  },

  // Progress bar
  progressBar: {
    height: 6,
    backgroundColor: LIGHT_BG,
    borderRadius: 3,
    marginTop: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: BRAND,
    borderRadius: 3,
  },

  // Card action button
  cardActionBtn: {
    backgroundColor: BRAND,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cardActionBtnText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '700',
  },

  // Equipment
  equipmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_BG,
  },
  equipmentInfo: {},
  equipmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  equipmentType: {
    fontSize: 12,
    color: TEXT_TERTIARY,
  },
  qrScanText: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND,
  },
  qrBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  qrBadgeScanned: {
    backgroundColor: '#DCFCE7',
  },
  qrBadgePending: {
    backgroundColor: '#FFF7ED',
  },
  qrBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  qrBadgeTextScanned: {
    color: SUCCESS,
  },
  qrBadgeTextPending: {
    color: WARNING,
  },

  // Photos
  photoCountsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  photoCount: {
    alignItems: 'center',
  },
  photoCountValue: {
    fontSize: 20,
    fontWeight: '700',
    color: BRAND,
  },
  photoCountLabel: {
    fontSize: 11,
    color: TEXT_TERTIARY,
  },
  addBtn: {
    backgroundColor: BRAND,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addBtnText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '700',
  },

  // Deficiencies
  deficiencyCountsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  severityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Report actions
  reportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: BRAND,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnOutlineText: {
    color: BRAND,
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtnFilled: {
    flex: 1,
    backgroundColor: BRAND,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnFilledText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnDisabled: {
    opacity: 0.4,
  },

  // Signatures
  sigRow: {
    flexDirection: 'row',
    gap: 24,
  },
  sigItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sigDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  sigDotDone: {
    backgroundColor: SUCCESS,
  },
  sigDotPending: {
    backgroundColor: BORDER,
  },
  sigLabel: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 28, // safe area
  },
  timerContainer: {
    marginRight: 16,
  },
  timerLabel: {
    fontSize: 10,
    color: TEXT_TERTIARY,
    textTransform: 'uppercase',
  },
  timerValue: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    fontVariant: ['tabular-nums'],
  },
  bottomActionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bottomActionStart: {
    backgroundColor: BRAND,
  },
  bottomActionComplete: {
    backgroundColor: SUCCESS,
  },
  bottomActionBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
});
