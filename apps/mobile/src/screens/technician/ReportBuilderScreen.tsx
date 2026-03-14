import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionKey =
  | 'grease_levels'
  | 'hood_data'
  | 'filter_data'
  | 'duct_data'
  | 'fan_mechanical'
  | 'fan_electrical'
  | 'solid_fuel'
  | 'post_cleaning'
  | 'fire_safety';

interface SectionProgress {
  key: SectionKey;
  label: string;
  nfpaRef: string;
  completed: boolean;
  fieldCount: number;
  filledCount: number;
}

interface ReportSystem {
  id: string;
  system_number: number;
  location_name: string;
  sections: SectionProgress[];
  deficiency_count: number;
  photo_count: number;
}

interface ReportInfo {
  id: string;
  certificate_id: string;
  service_type: string;
  service_date: string;
  frequency: string;
  next_due: string;
  customer_name: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

const DEMO_REPORT: ReportInfo = {
  id: 'sr1',
  certificate_id: 'SR-2026-0441',
  service_type: 'KEC Cleaning',
  service_date: 'Mar 14, 2026',
  frequency: 'Quarterly',
  next_due: 'Jun 14, 2026',
  customer_name: 'Oceanview Bistro',
  status: 'in_progress',
};

const SECTION_DEFS: { key: SectionKey; label: string; nfpaRef: string; fieldCount: number }[] = [
  { key: 'grease_levels', label: 'Grease Levels', nfpaRef: 'NFPA 96 §11.4', fieldCount: 7 },
  { key: 'hood_data', label: 'Hood', nfpaRef: 'NFPA 96 §11.3', fieldCount: 5 },
  { key: 'filter_data', label: 'Filters', nfpaRef: 'NFPA 96 §11.5', fieldCount: 3 },
  { key: 'duct_data', label: 'Ductwork', nfpaRef: 'NFPA 96 §7.3', fieldCount: 4 },
  { key: 'fan_mechanical', label: 'Fan - Mechanical', nfpaRef: 'NFPA 96 §7.8', fieldCount: 6 },
  { key: 'fan_electrical', label: 'Fan - Electrical', nfpaRef: 'NFPA 96 §7.9', fieldCount: 3 },
  { key: 'solid_fuel', label: 'Solid Fuel', nfpaRef: 'NFPA 96 §14', fieldCount: 3 },
  { key: 'post_cleaning', label: 'Post Cleaning', nfpaRef: 'NFPA 96 §11.6', fieldCount: 8 },
  { key: 'fire_safety', label: 'Fire Safety', nfpaRef: 'NFPA 96 §10', fieldCount: 5 },
];

function buildSections(filledMap: Record<SectionKey, number>): SectionProgress[] {
  return SECTION_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    nfpaRef: def.nfpaRef,
    fieldCount: def.fieldCount,
    filledCount: filledMap[def.key] ?? 0,
    completed: (filledMap[def.key] ?? 0) >= def.fieldCount,
  }));
}

const DEMO_SYSTEMS: ReportSystem[] = [
  {
    id: 'sys1',
    system_number: 1,
    location_name: 'Main Hood Line',
    sections: buildSections({
      grease_levels: 7,
      hood_data: 5,
      filter_data: 3,
      duct_data: 2,
      fan_mechanical: 4,
      fan_electrical: 0,
      solid_fuel: 0,
      post_cleaning: 0,
      fire_safety: 0,
    }),
    deficiency_count: 2,
    photo_count: 14,
  },
  {
    id: 'sys2',
    system_number: 2,
    location_name: 'Prep Area Hood',
    sections: buildSections({
      grease_levels: 3,
      hood_data: 0,
      filter_data: 0,
      duct_data: 0,
      fan_mechanical: 0,
      fan_electrical: 0,
      solid_fuel: 0,
      post_cleaning: 0,
      fire_safety: 0,
    }),
    deficiency_count: 1,
    photo_count: 4,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSystemCompletion(system: ReportSystem): number {
  const totalFields = system.sections.reduce((s, sec) => s + sec.fieldCount, 0);
  const filledFields = system.sections.reduce((s, sec) => s + sec.filledCount, 0);
  if (totalFields === 0) return 0;
  return Math.round((filledFields / totalFields) * 100);
}

function getOverallCompletion(systems: ReportSystem[]): number {
  const totalFields = systems.reduce(
    (sum, sys) => sum + sys.sections.reduce((s, sec) => s + sec.fieldCount, 0),
    0,
  );
  const filledFields = systems.reduce(
    (sum, sys) => sum + sys.sections.reduce((s, sec) => s + sec.filledCount, 0),
    0,
  );
  if (totalFields === 0) return 0;
  return Math.round((filledFields / totalFields) * 100);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportBuilderScreen() {
  const [systems] = useState<ReportSystem[]>(DEMO_SYSTEMS);
  const overallPct = getOverallCompletion(systems);

  const handleSystemTap = (system: ReportSystem) => {
    Alert.alert(
      'Open System',
      `Navigating to SystemInspection for System #${system.system_number} — ${system.location_name} (demo).`,
    );
  };

  const handleAddSystem = () => {
    Alert.alert(
      'Add System',
      'Add a new hood / equipment system to this report (demo).',
    );
  };

  const handleReviewSubmit = () => {
    Alert.alert(
      'Review & Submit',
      'Navigating to ReportReview for final review (demo).',
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerServiceType}>{DEMO_REPORT.service_type}</Text>
        <Text style={styles.headerCertificate}>{DEMO_REPORT.certificate_id}</Text>
        <View style={styles.overallBar}>
          <View style={styles.overallBarTrack}>
            <View style={[styles.overallBarFill, { width: `${overallPct}%` }]} />
          </View>
          <Text style={styles.overallBarText}>{overallPct}% Complete</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Report Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Report Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Customer</Text>
            <Text style={styles.infoValue}>{DEMO_REPORT.customer_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Service Date</Text>
            <Text style={styles.infoValue}>{DEMO_REPORT.service_date}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Frequency</Text>
            <Text style={styles.infoValue}>{DEMO_REPORT.frequency}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Next Due</Text>
            <Text style={styles.infoValue}>{DEMO_REPORT.next_due}</Text>
          </View>
        </View>

        {/* Section Progress Overview */}
        <Text style={styles.sectionHeading}>Section Progress</Text>
        <View style={styles.sectionOverviewCard}>
          {SECTION_DEFS.map((sec) => {
            const allComplete = systems.every((sys) => {
              const found = sys.sections.find((s) => s.key === sec.key);
              return found ? found.completed : false;
            });
            const anyStarted = systems.some((sys) => {
              const found = sys.sections.find((s) => s.key === sec.key);
              return found ? found.filledCount > 0 : false;
            });
            return (
              <View key={sec.key} style={styles.sectionOverviewRow}>
                <View
                  style={[
                    styles.sectionStatusDot,
                    allComplete
                      ? styles.sectionDotComplete
                      : anyStarted
                        ? styles.sectionDotPartial
                        : styles.sectionDotPending,
                  ]}
                >
                  {allComplete && <Text style={styles.checkText}>{'✓'}</Text>}
                </View>
                <Text
                  style={[
                    styles.sectionOverviewLabel,
                    allComplete && styles.sectionOverviewLabelDone,
                  ]}
                >
                  {sec.label}
                </Text>
                <Text style={styles.sectionNfpaRef}>{sec.nfpaRef}</Text>
              </View>
            );
          })}
        </View>

        {/* Systems List */}
        <Text style={styles.sectionHeading}>
          Systems ({systems.length})
        </Text>

        {systems.map((system) => {
          const pct = getSystemCompletion(system);
          const completedSections = system.sections.filter((s) => s.completed).length;
          return (
            <TouchableOpacity
              key={system.id}
              style={styles.systemCard}
              onPress={() => handleSystemTap(system)}
              activeOpacity={0.7}
            >
              {/* System header */}
              <View style={styles.systemCardHeader}>
                <View style={styles.systemNumberBadge}>
                  <Text style={styles.systemNumberText}>
                    #{system.system_number}
                  </Text>
                </View>
                <View style={styles.systemHeaderText}>
                  <Text style={styles.systemName}>{system.location_name}</Text>
                  <Text style={styles.systemMeta}>
                    {completedSections}/{system.sections.length} sections
                  </Text>
                </View>
                <Text style={styles.systemPct}>{pct}%</Text>
              </View>

              {/* Progress bar */}
              <View style={styles.systemProgressTrack}>
                <View
                  style={[styles.systemProgressFill, { width: `${pct}%` }]}
                />
              </View>

              {/* Section chips */}
              <View style={styles.sectionChipsRow}>
                {system.sections.map((sec) => (
                  <View
                    key={sec.key}
                    style={[
                      styles.sectionChip,
                      sec.completed
                        ? styles.sectionChipComplete
                        : sec.filledCount > 0
                          ? styles.sectionChipPartial
                          : styles.sectionChipPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sectionChipText,
                        sec.completed && styles.sectionChipTextComplete,
                      ]}
                    >
                      {sec.label}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Counts row */}
              <View style={styles.systemCountsRow}>
                {system.deficiency_count > 0 && (
                  <View style={styles.deficiencyBadge}>
                    <Text style={styles.deficiencyBadgeText}>
                      {system.deficiency_count} deficienc{system.deficiency_count === 1 ? 'y' : 'ies'}
                    </Text>
                  </View>
                )}
                <Text style={styles.photoCount}>
                  {system.photo_count} photos
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Add System */}
        <TouchableOpacity
          style={styles.addSystemButton}
          onPress={handleAddSystem}
        >
          <Text style={styles.addSystemIcon}>+</Text>
          <Text style={styles.addSystemText}>Add System</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.reviewButton}
          onPress={handleReviewSubmit}
        >
          <Text style={styles.reviewButtonText}>Review & Submit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  header: {
    backgroundColor: '#1e4d6b',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerServiceType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d4af37',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerCertificate: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  overallBar: {
    marginTop: 14,
  },
  overallBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  overallBarFill: {
    height: 6,
    backgroundColor: '#d4af37',
    borderRadius: 3,
  },
  overallBarText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
    textAlign: 'right',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B1628',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7F96',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0B1628',
  },

  // Section Heading
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1628',
    marginTop: 24,
    marginBottom: 10,
  },

  // Section Progress Overview
  sectionOverviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionOverviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
  },
  sectionStatusDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionDotComplete: {
    backgroundColor: '#059669',
  },
  sectionDotPartial: {
    backgroundColor: '#d4af37',
  },
  sectionDotPending: {
    backgroundColor: '#E8EDF5',
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionOverviewLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#0B1628',
  },
  sectionOverviewLabelDone: {
    color: '#059669',
  },
  sectionNfpaRef: {
    fontSize: 10,
    color: '#6B7F96',
  },

  // System Card
  systemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#1e4d6b',
  },
  systemCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  systemNumberBadge: {
    backgroundColor: '#0B1628',
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  systemNumberText: {
    color: '#d4af37',
    fontSize: 13,
    fontWeight: '700',
  },
  systemHeaderText: {
    flex: 1,
  },
  systemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1628',
  },
  systemMeta: {
    fontSize: 12,
    color: '#6B7F96',
    marginTop: 2,
  },
  systemPct: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e4d6b',
  },
  systemProgressTrack: {
    height: 4,
    backgroundColor: '#E8EDF5',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  systemProgressFill: {
    height: 4,
    backgroundColor: '#1e4d6b',
    borderRadius: 2,
  },
  sectionChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },
  sectionChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sectionChipComplete: {
    backgroundColor: 'rgba(5,150,105,0.10)',
  },
  sectionChipPartial: {
    backgroundColor: 'rgba(212,175,55,0.12)',
  },
  sectionChipPending: {
    backgroundColor: '#F4F6FA',
  },
  sectionChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7F96',
  },
  sectionChipTextComplete: {
    color: '#059669',
  },
  systemCountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
  },
  deficiencyBadge: {
    backgroundColor: 'rgba(220,38,38,0.10)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  deficiencyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  photoCount: {
    fontSize: 12,
    color: '#6B7F96',
  },

  // Add System
  addSystemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#D1D9E6',
    borderStyle: 'dashed',
    marginTop: 4,
    gap: 8,
  },
  addSystemIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e4d6b',
  },
  addSystemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e4d6b',
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  reviewButton: {
    backgroundColor: '#1e4d6b',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
