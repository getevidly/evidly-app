import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Modal,
  ScrollView,
  TextInput,
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

// ── Severity config ───────────────────────────────────────────
const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#fef2f2', text: DANGER },
  major: { bg: '#fff7ed', text: '#ea580c' },
  minor: { bg: '#fffbeb', text: WARNING },
};

// ── Placeholder data ──────────────────────────────────────────
// TODO: Replace with live data from useQAQueue() hook

interface Photo {
  id: string;
  label: string;
  // TODO: Replace with actual uri from Supabase storage
  placeholder: string;
}

interface Deficiency {
  id: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  location: string;
}

interface QAJob {
  id: string;
  jobNumber: string;
  customer: string;
  address: string;
  technician: string;
  completedAt: string;
  checklistStats: { passed: number; failed: number; total: number };
  photos: Photo[];
  deficiencies: Deficiency[];
}

const QA_QUEUE: QAJob[] = [
  {
    id: 'qa1',
    jobNumber: '#1042',
    customer: "Mario's Italian Kitchen",
    address: '1425 Main St, Suite B',
    technician: 'Marcus W.',
    completedAt: '11:45 AM',
    checklistStats: { passed: 18, failed: 2, total: 20 },
    photos: [
      { id: 'p1', label: 'Before - Hood exterior', placeholder: 'Before Hood' },
      { id: 'p2', label: 'After - Hood exterior', placeholder: 'After Hood' },
      { id: 'p3', label: 'Before - Ductwork', placeholder: 'Before Duct' },
      { id: 'p4', label: 'After - Ductwork', placeholder: 'After Duct' },
      { id: 'p5', label: 'Fan belt condition', placeholder: 'Fan Belt' },
      { id: 'p6', label: 'Grease containment', placeholder: 'Grease' },
    ],
    deficiencies: [
      {
        id: 'd1',
        description: 'Fan belt showing significant wear, recommend replacement within 30 days',
        severity: 'major',
        location: 'Exhaust Fan #1',
      },
      {
        id: 'd2',
        description: 'Minor grease accumulation on hinge access panel',
        severity: 'minor',
        location: 'Hood - North side',
      },
    ],
  },
  {
    id: 'qa2',
    jobNumber: '#1040',
    customer: 'The Rustic Table',
    address: '2200 Oak Ave',
    technician: 'Sarah K.',
    completedAt: '10:20 AM',
    checklistStats: { passed: 20, failed: 0, total: 20 },
    photos: [
      { id: 'p7', label: 'Before - Hood', placeholder: 'Before Hood' },
      { id: 'p8', label: 'After - Hood', placeholder: 'After Hood' },
      { id: 'p9', label: 'Filter condition', placeholder: 'Filters' },
      { id: 'p10', label: 'Access panel', placeholder: 'Panel' },
    ],
    deficiencies: [],
  },
  {
    id: 'qa3',
    jobNumber: '#1039',
    customer: 'Golden Dragon',
    address: '550 Chinatown Plaza',
    technician: 'James R.',
    completedAt: '9:15 AM',
    checklistStats: { passed: 16, failed: 4, total: 20 },
    photos: [
      { id: 'p11', label: 'Before - Hood 1', placeholder: 'Before Hood 1' },
      { id: 'p12', label: 'After - Hood 1', placeholder: 'After Hood 1' },
      { id: 'p13', label: 'Before - Hood 2', placeholder: 'Before Hood 2' },
      { id: 'p14', label: 'After - Hood 2', placeholder: 'After Hood 2' },
      { id: 'p15', label: 'Grease trap', placeholder: 'Grease Trap' },
    ],
    deficiencies: [
      {
        id: 'd3',
        description: 'Excessive carbon buildup in ductwork section 3, requires additional cleaning pass',
        severity: 'critical',
        location: 'Ductwork - Section 3',
      },
      {
        id: 'd4',
        description: 'Grease trap overflow sensor not functioning',
        severity: 'major',
        location: 'Grease Trap',
      },
      {
        id: 'd5',
        description: 'Access panel latch loose',
        severity: 'minor',
        location: 'Hood 2 - Access Panel',
      },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────

export function QAReviewScreen({ navigation }: { navigation?: any }) {
  const [selectedJob, setSelectedJob] = useState<QAJob | null>(null);
  const [enlargedPhoto, setEnlargedPhoto] = useState<Photo | null>(null);
  const [comment, setComment] = useState('');

  const handleApprove = (jobId: string) => {
    // TODO: Call Supabase to mark job QA status as 'approved'
    // Update job record: supabase.from('jobs').update({ qa_status: 'approved', qa_reviewed_at: now }).eq('id', jobId)
    setSelectedJob(null);
    setComment('');
  };

  const handleRequestRevision = (jobId: string) => {
    // TODO: Call Supabase to mark job QA status as 'revision_requested'
    // Include comment as revision note
    // Send push notification to technician
    setSelectedJob(null);
    setComment('');
  };

  const renderQueueItem = ({ item: job }: { item: QAJob }) => {
    const hasDeficiencies = job.deficiencies.length > 0;

    return (
      <TouchableOpacity
        style={styles.queueCard}
        activeOpacity={0.7}
        onPress={() => setSelectedJob(job)}
      >
        <View style={styles.queueCardTop}>
          <View style={styles.queueCardLeft}>
            <Text style={styles.jobNumber}>{job.jobNumber}</Text>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>Pending Review</Text>
            </View>
          </View>
          <Text style={styles.completedTime}>{job.completedAt}</Text>
        </View>

        <Text style={styles.queueCustomer}>{job.customer}</Text>
        <Text style={styles.queueTech}>Tech: {job.technician}</Text>

        {/* Photo thumbnails preview */}
        <View style={styles.thumbnailRow}>
          {job.photos.slice(0, 4).map((photo) => (
            <View key={photo.id} style={styles.thumbnail}>
              <Text style={styles.thumbnailText}>
                {photo.placeholder.charAt(0)}
              </Text>
            </View>
          ))}
          {job.photos.length > 4 && (
            <View style={styles.thumbnailMore}>
              <Text style={styles.thumbnailMoreText}>
                +{job.photos.length - 4}
              </Text>
            </View>
          )}
        </View>

        {/* Checklist + deficiency summary */}
        <View style={styles.queueSummaryRow}>
          <View style={styles.queueSummaryItem}>
            <Text style={styles.queueSummaryLabel}>Checklist:</Text>
            <Text style={styles.queueSummaryValue}>
              {job.checklistStats.passed}/{job.checklistStats.total} passed
            </Text>
          </View>
          {hasDeficiencies && (
            <View style={styles.queueSummaryItem}>
              <Text
                style={[styles.queueSummaryValue, { color: DANGER }]}
              >
                {job.deficiencies.length} deficienc{job.deficiencies.length === 1 ? 'y' : 'ies'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>QA Review</Text>
        <View style={styles.pendingCountBadge}>
          <Text style={styles.pendingCountText}>{QA_QUEUE.length} Pending</Text>
        </View>
      </View>

      {/* ── Queue List ────────────────────────────────────── */}
      <FlatList
        data={QA_QUEUE}
        keyExtractor={(item) => item.id}
        renderItem={renderQueueItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.cardGap} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>All caught up!</Text>
            <Text style={styles.emptyStateSub}>No jobs pending QA review</Text>
          </View>
        }
      />

      {/* ── QA Review Detail Modal ────────────────────────── */}
      <Modal
        visible={selectedJob !== null}
        animationType="slide"
        onRequestClose={() => {
          setSelectedJob(null);
          setComment('');
        }}
      >
        {selectedJob && (
          <SafeAreaView style={styles.detailSafeArea}>
            {/* Detail header */}
            <View style={styles.detailHeader}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedJob(null);
                  setComment('');
                }}
              >
                <Text style={styles.detailBackText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.detailHeaderTitle}>
                QA Review {selectedJob.jobNumber}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView
              style={styles.detailScroll}
              contentContainerStyle={styles.detailContent}
            >
              {/* Job info */}
              <View style={styles.detailInfoCard}>
                <Text style={styles.detailCustomer}>
                  {selectedJob.customer}
                </Text>
                <Text style={styles.detailAddress}>
                  {selectedJob.address}
                </Text>
                <View style={styles.detailInfoRow}>
                  <Text style={styles.detailInfoLabel}>Technician:</Text>
                  <Text style={styles.detailInfoValue}>
                    {selectedJob.technician}
                  </Text>
                </View>
                <View style={styles.detailInfoRow}>
                  <Text style={styles.detailInfoLabel}>Completed:</Text>
                  <Text style={styles.detailInfoValue}>
                    {selectedJob.completedAt}
                  </Text>
                </View>
              </View>

              {/* Photo gallery */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>
                  Photos ({selectedJob.photos.length})
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photoGallery}
                >
                  {selectedJob.photos.map((photo) => (
                    <TouchableOpacity
                      key={photo.id}
                      style={styles.photoCard}
                      activeOpacity={0.8}
                      onPress={() => setEnlargedPhoto(photo)}
                    >
                      {/* TODO: Replace with <Image source={{ uri: photo.uri }} /> */}
                      <View style={styles.photoPlaceholder}>
                        <Text style={styles.photoPlaceholderText}>
                          {photo.placeholder}
                        </Text>
                      </View>
                      <Text style={styles.photoLabel} numberOfLines={1}>
                        {photo.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Checklist summary */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Checklist Summary</Text>
                <View style={styles.checklistSummaryCard}>
                  <View style={styles.checklistStatRow}>
                    <View style={styles.checklistStat}>
                      <Text
                        style={[
                          styles.checklistStatValue,
                          { color: SUCCESS },
                        ]}
                      >
                        {selectedJob.checklistStats.passed}
                      </Text>
                      <Text style={styles.checklistStatLabel}>Passed</Text>
                    </View>
                    <View style={styles.checklistStat}>
                      <Text
                        style={[
                          styles.checklistStatValue,
                          {
                            color:
                              selectedJob.checklistStats.failed > 0
                                ? DANGER
                                : TEXT_TERTIARY,
                          },
                        ]}
                      >
                        {selectedJob.checklistStats.failed}
                      </Text>
                      <Text style={styles.checklistStatLabel}>Failed</Text>
                    </View>
                    <View style={styles.checklistStat}>
                      <Text style={styles.checklistStatValue}>
                        {selectedJob.checklistStats.total}
                      </Text>
                      <Text style={styles.checklistStatLabel}>Total</Text>
                    </View>
                  </View>
                  {/* Pass rate bar */}
                  <View style={styles.passRateBarBg}>
                    <View
                      style={[
                        styles.passRateBarFill,
                        {
                          width: `${Math.round(
                            (selectedJob.checklistStats.passed /
                              selectedJob.checklistStats.total) *
                              100,
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.passRateLabel}>
                    {Math.round(
                      (selectedJob.checklistStats.passed /
                        selectedJob.checklistStats.total) *
                        100,
                    )}
                    % pass rate
                  </Text>
                </View>
              </View>

              {/* Deficiencies */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>
                  Deficiencies ({selectedJob.deficiencies.length})
                </Text>
                {selectedJob.deficiencies.length === 0 ? (
                  <View style={styles.noDeficiencies}>
                    <Text style={styles.noDeficienciesText}>
                      No deficiencies reported
                    </Text>
                  </View>
                ) : (
                  selectedJob.deficiencies.map((def) => (
                    <View key={def.id} style={styles.deficiencyCard}>
                      <View style={styles.deficiencyHeader}>
                        <Text style={styles.deficiencyLocation}>
                          {def.location}
                        </Text>
                        <View
                          style={[
                            styles.severityBadge,
                            {
                              backgroundColor:
                                SEVERITY_COLORS[def.severity].bg,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.severityBadgeText,
                              {
                                color:
                                  SEVERITY_COLORS[def.severity].text,
                              },
                            ]}
                          >
                            {def.severity.charAt(0).toUpperCase() +
                              def.severity.slice(1)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.deficiencyDesc}>
                        {def.description}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              {/* Comment input */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>
                  Reviewer Comments
                </Text>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add comments or notes for the technician..."
                  placeholderTextColor={TEXT_TERTIARY}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={comment}
                  onChangeText={setComment}
                />
              </View>

              {/* Action buttons */}
              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleApprove(selectedJob.id)}
                >
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.revisionButton}
                  onPress={() => handleRequestRevision(selectedJob.id)}
                >
                  <Text style={styles.revisionButtonText}>
                    Request Revision
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* ── Enlarged Photo Modal ──────────────────────────── */}
      <Modal
        visible={enlargedPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEnlargedPhoto(null)}
      >
        <TouchableOpacity
          style={styles.photoEnlargeOverlay}
          activeOpacity={1}
          onPress={() => setEnlargedPhoto(null)}
        >
          <View style={styles.photoEnlargeContainer}>
            {/* TODO: Replace with <Image source={{ uri: enlargedPhoto.uri }} /> */}
            <View style={styles.photoEnlargePlaceholder}>
              <Text style={styles.photoEnlargePlaceholderText}>
                {enlargedPhoto?.placeholder}
              </Text>
            </View>
            <Text style={styles.photoEnlargeLabel}>
              {enlargedPhoto?.label}
            </Text>
            <TouchableOpacity
              style={styles.photoEnlargeClose}
              onPress={() => setEnlargedPhoto(null)}
            >
              <Text style={styles.photoEnlargeCloseText}>Close</Text>
            </TouchableOpacity>
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
  pendingCountBadge: {
    backgroundColor: GOLD,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  pendingCountText: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },

  // List
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  cardGap: {
    height: 12,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  emptyStateSub: {
    fontSize: 14,
    color: TEXT_TERTIARY,
  },

  // Queue card
  queueCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  queueCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  queueCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jobNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: WARNING,
  },
  completedTime: {
    fontSize: 12,
    color: TEXT_TERTIARY,
  },
  queueCustomer: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  queueTech: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginBottom: 10,
  },

  // Thumbnails
  thumbnailRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: LIGHT_BG,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailText: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_TERTIARY,
  },
  thumbnailMore: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: BRAND_DARK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailMoreText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
  },

  // Summary row
  queueSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  queueSummaryItem: {
    flexDirection: 'row',
    gap: 4,
  },
  queueSummaryLabel: {
    fontSize: 12,
    color: TEXT_TERTIARY,
  },
  queueSummaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },

  // ── Detail Modal Styles ────────────────────────────────
  detailSafeArea: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },
  detailHeader: {
    backgroundColor: BRAND,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  detailBackText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '600',
  },
  detailHeaderTitle: {
    color: WHITE,
    fontSize: 17,
    fontWeight: '700',
  },
  detailScroll: {
    flex: 1,
  },
  detailContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Detail info card
  detailInfoCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  detailCustomer: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  detailAddress: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginBottom: 12,
  },
  detailInfoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_TERTIARY,
    width: 90,
  },
  detailInfoValue: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    flex: 1,
  },

  // Section
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 10,
  },

  // Photo gallery
  photoGallery: {
    gap: 10,
  },
  photoCard: {
    width: 140,
  },
  photoPlaceholder: {
    width: 140,
    height: 105,
    backgroundColor: LIGHT_BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: TEXT_TERTIARY,
    fontWeight: '600',
    textAlign: 'center',
  },
  photoLabel: {
    fontSize: 11,
    color: TEXT_SECONDARY,
  },

  // Checklist summary
  checklistSummaryCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  checklistStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  checklistStat: {
    alignItems: 'center',
  },
  checklistStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: BRAND,
  },
  checklistStatLabel: {
    fontSize: 12,
    color: TEXT_TERTIARY,
    marginTop: 2,
  },
  passRateBarBg: {
    height: 6,
    backgroundColor: BORDER,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  passRateBarFill: {
    height: 6,
    backgroundColor: SUCCESS,
    borderRadius: 3,
  },
  passRateLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },

  // Deficiencies
  noDeficiencies: {
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  noDeficienciesText: {
    fontSize: 14,
    color: SUCCESS,
    fontWeight: '600',
  },
  deficiencyCard: {
    backgroundColor: CARD_BG,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 8,
  },
  deficiencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  deficiencyLocation: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deficiencyDesc: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 19,
  },

  // Comment input
  commentInput: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    fontSize: 14,
    color: TEXT_PRIMARY,
    minHeight: 100,
  },

  // Action buttons
  detailActions: {
    gap: 12,
    marginTop: 4,
  },
  approveButton: {
    backgroundColor: SUCCESS,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  approveButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
  revisionButton: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FB923C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  revisionButtonText: {
    color: '#EA580C',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Photo enlarge modal ────────────────────────────────
  photoEnlargeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoEnlargeContainer: {
    width: '90%',
    alignItems: 'center',
  },
  photoEnlargePlaceholder: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: LIGHT_BG,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEnlargePlaceholderText: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_TERTIARY,
  },
  photoEnlargeLabel: {
    color: WHITE,
    fontSize: 14,
    marginTop: 10,
  },
  photoEnlargeClose: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  photoEnlargeCloseText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '600',
  },
});
