import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Modal,
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
const DANGER = '#dc2626';
const WARNING = '#f59e0b';
const MINOR_YELLOW = '#ca8a04';

// ── Types ─────────────────────────────────────────────────────
type Severity = 'critical' | 'major' | 'minor';

interface Deficiency {
  id: string;
  photoUri: string | null;
  description: string;
  severity: Severity;
  status: 'open' | 'acknowledged' | 'resolved';
  equipment: string;
  component: string;
  nfpaReference: string;
  recommendedAction: string;
  estimatedCost: number | null;
  greaseDepth: number | null;
  areaAffected: string | null;
  voiceTranscription: string | null;
}

const SEVERITY_STYLES: Record<Severity, { bg: string; text: string; label: string }> = {
  critical: { bg: '#FEE2E2', text: DANGER, label: 'Critical' },
  major: { bg: '#FFF7ED', text: '#ea580c', label: 'Major' },
  minor: { bg: '#FEFCE8', text: MINOR_YELLOW, label: 'Minor' },
};

// ── Placeholder data ─────────────────────────────────────────
// TODO: Replace with useDeficiencies(jobId) hook
const DEMO_DEFICIENCIES: Deficiency[] = [
  {
    id: 'def-1',
    photoUri: null,
    description: 'Grease buildup exceeds 1/4 inch on secondary hood plenum',
    severity: 'major',
    status: 'open',
    equipment: 'Secondary Exhaust Hood',
    component: 'Plenum',
    nfpaReference: 'NFPA 96 §11.4',
    recommendedAction: 'Deep clean and apply degreaser. Schedule follow-up in 30 days.',
    estimatedCost: 350,
    greaseDepth: 0.3,
    areaAffected: '4 sq ft',
    voiceTranscription: null,
  },
  {
    id: 'def-2',
    photoUri: null,
    description: 'Fan belt shows cracking and wear',
    severity: 'minor',
    status: 'open',
    equipment: 'Primary Exhaust Hood',
    component: 'Exhaust Fan',
    nfpaReference: 'NFPA 96 §7.8',
    recommendedAction: 'Replace fan belt at next scheduled maintenance.',
    estimatedCost: 120,
    greaseDepth: null,
    areaAffected: null,
    voiceTranscription: null,
  },
  {
    id: 'def-3',
    photoUri: null,
    description: 'Grease filter not seated properly in track',
    severity: 'minor',
    status: 'acknowledged',
    equipment: 'Primary Exhaust Hood',
    component: 'Baffle Filters',
    nfpaReference: 'NFPA 96 §8.2',
    recommendedAction: 'Re-seat filter. Inform kitchen staff of proper installation.',
    estimatedCost: null,
    greaseDepth: null,
    areaAffected: null,
    voiceTranscription: null,
  },
];

const DEMO_EQUIPMENT = [
  'Primary Exhaust Hood',
  'Secondary Exhaust Hood',
  'Grease Trap',
  'Fire Suppression',
];

const DEMO_COMPONENTS = [
  'Plenum',
  'Exhaust Fan',
  'Baffle Filters',
  'Ductwork',
  'Grease Cup',
  'Access Panel',
  'Nozzle',
  'Fusible Link',
];

type AddStep = 1 | 2 | 3 | 4 | 5 | 6;

export function DeficienciesScreen({
  route,
  navigation,
}: {
  route?: { params?: { jobId?: string } };
  navigation?: any;
}) {
  const jobId = route?.params?.jobId ?? 'job-103';
  const [deficiencies] = useState<Deficiency[]>(DEMO_DEFICIENCIES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStep, setAddStep] = useState<AddStep>(1);

  // New deficiency form state
  const [newDef, setNewDef] = useState({
    equipment: '',
    component: '',
    description: '',
    severity: 'minor' as Severity,
    nfpaReference: '',
    greaseDepth: '',
    areaAffected: '',
    recommendedAction: '',
    estimatedCost: '',
    voiceRecording: false,
    voiceTranscription: '',
  });

  const counts = {
    critical: deficiencies.filter((d) => d.severity === 'critical').length,
    major: deficiencies.filter((d) => d.severity === 'major').length,
    minor: deficiencies.filter((d) => d.severity === 'minor').length,
  };

  const resetAddForm = () => {
    setAddStep(1);
    setNewDef({
      equipment: '',
      component: '',
      description: '',
      severity: 'minor',
      nfpaReference: '',
      greaseDepth: '',
      areaAffected: '',
      recommendedAction: '',
      estimatedCost: '',
      voiceRecording: false,
      voiceTranscription: '',
    });
    setShowAddModal(false);
  };

  const renderDeficiencyCard = ({ item }: { item: Deficiency }) => {
    const sev = SEVERITY_STYLES[item.severity];
    return (
      <View style={styles.defCard}>
        <View style={styles.defCardRow}>
          {/* Photo thumbnail placeholder */}
          <View style={styles.photoThumb}>
            <Text style={styles.photoThumbText}>IMG</Text>
          </View>
          <View style={styles.defCardContent}>
            <Text style={styles.defDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.defMetaRow}>
              <View style={[styles.severityBadge, { backgroundColor: sev.bg }]}>
                <Text style={[styles.severityBadgeText, { color: sev.text }]}>
                  {sev.label}
                </Text>
              </View>
              <Text style={styles.defEquipment}>{item.equipment}</Text>
            </View>
            <Text style={styles.defNfpa}>{item.nfpaReference}</Text>
          </View>
        </View>
      </View>
    );
  };

  // ── Add Deficiency Modal Step Content ──────────────────────
  const renderAddStep = () => {
    switch (addStep) {
      case 1:
        // Step 1: Capture photo
        return (
          <View style={styles.modalStep}>
            <Text style={styles.modalStepTitle}>Step 1: Capture Photo</Text>
            <TouchableOpacity
              style={styles.capturePhotoArea}
              onPress={() => {
                // TODO: Open camera, then advance step
                setAddStep(2);
              }}
            >
              <Text style={styles.capturePhotoText}>Tap to Open Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => setAddStep(2)}
            >
              <Text style={styles.skipBtnText}>Skip Photo</Text>
            </TouchableOpacity>
          </View>
        );

      case 2:
        // Step 2: Details
        return (
          <ScrollView style={styles.modalStep}>
            <Text style={styles.modalStepTitle}>Step 2: Details</Text>

            <Text style={styles.fieldLabel}>Equipment</Text>
            <View style={styles.optionsRow}>
              {DEMO_EQUIPMENT.map((eq) => (
                <TouchableOpacity
                  key={eq}
                  style={[
                    styles.optionChip,
                    newDef.equipment === eq && styles.optionChipActive,
                  ]}
                  onPress={() => setNewDef({ ...newDef, equipment: eq })}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      newDef.equipment === eq && styles.optionChipTextActive,
                    ]}
                  >
                    {eq}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Component</Text>
            <View style={styles.optionsRow}>
              {DEMO_COMPONENTS.map((comp) => (
                <TouchableOpacity
                  key={comp}
                  style={[
                    styles.optionChip,
                    newDef.component === comp && styles.optionChipActive,
                  ]}
                  onPress={() => setNewDef({ ...newDef, component: comp })}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      newDef.component === comp && styles.optionChipTextActive,
                    ]}
                  >
                    {comp}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe the deficiency... (AI may pre-fill)"
              placeholderTextColor={TEXT_TERTIARY}
              multiline
              value={newDef.description}
              onChangeText={(t) => setNewDef({ ...newDef, description: t })}
            />

            <Text style={styles.fieldLabel}>Severity</Text>
            <View style={styles.severitySelector}>
              {(['critical', 'major', 'minor'] as Severity[]).map((sev) => {
                const s = SEVERITY_STYLES[sev];
                return (
                  <TouchableOpacity
                    key={sev}
                    style={[
                      styles.severityOption,
                      newDef.severity === sev && { backgroundColor: s.bg, borderColor: s.text },
                    ]}
                    onPress={() => setNewDef({ ...newDef, severity: sev })}
                  >
                    <Text
                      style={[
                        styles.severityOptionText,
                        newDef.severity === sev && { color: s.text },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>NFPA Reference</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., NFPA 96 §11.4"
              placeholderTextColor={TEXT_TERTIARY}
              value={newDef.nfpaReference}
              onChangeText={(t) => setNewDef({ ...newDef, nfpaReference: t })}
            />

            <TouchableOpacity
              style={styles.nextStepBtn}
              onPress={() => setAddStep(3)}
            >
              <Text style={styles.nextStepBtnText}>Next</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      case 3:
        // Step 3: Voice description
        return (
          <View style={styles.modalStep}>
            <Text style={styles.modalStepTitle}>Step 3: Voice Description (Optional)</Text>
            <TouchableOpacity
              style={[
                styles.recordBtn,
                newDef.voiceRecording && styles.recordBtnActive,
              ]}
              onPress={() => {
                // TODO: Start/stop audio recording
                setNewDef({ ...newDef, voiceRecording: !newDef.voiceRecording });
              }}
            >
              <Text style={styles.recordBtnText}>
                {newDef.voiceRecording ? 'Stop Recording' : 'Start Recording'}
              </Text>
            </TouchableOpacity>
            {newDef.voiceTranscription.length > 0 && (
              <View style={styles.transcriptionBox}>
                <Text style={styles.transcriptionLabel}>Transcription:</Text>
                <Text style={styles.transcriptionText}>{newDef.voiceTranscription}</Text>
              </View>
            )}
            <View style={styles.stepNavRow}>
              <TouchableOpacity
                style={styles.backStepBtn}
                onPress={() => setAddStep(2)}
              >
                <Text style={styles.backStepBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nextStepBtn}
                onPress={() => setAddStep(4)}
              >
                <Text style={styles.nextStepBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 4:
        // Step 4: Measurements
        return (
          <View style={styles.modalStep}>
            <Text style={styles.modalStepTitle}>Step 4: Measurements (Optional)</Text>

            <Text style={styles.fieldLabel}>Grease Depth (inches)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="0.0"
              placeholderTextColor={TEXT_TERTIARY}
              value={newDef.greaseDepth}
              onChangeText={(t) => setNewDef({ ...newDef, greaseDepth: t })}
            />

            <Text style={styles.fieldLabel}>Area Affected</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 4 sq ft"
              placeholderTextColor={TEXT_TERTIARY}
              value={newDef.areaAffected}
              onChangeText={(t) => setNewDef({ ...newDef, areaAffected: t })}
            />

            <View style={styles.stepNavRow}>
              <TouchableOpacity
                style={styles.backStepBtn}
                onPress={() => setAddStep(3)}
              >
                <Text style={styles.backStepBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nextStepBtn}
                onPress={() => setAddStep(5)}
              >
                <Text style={styles.nextStepBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 5:
        // Step 5: Recommended action
        return (
          <View style={styles.modalStep}>
            <Text style={styles.modalStepTitle}>Step 5: Recommended Action</Text>
            <Text style={styles.aiSuggestionLabel}>AI Suggested:</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Recommended corrective action..."
              placeholderTextColor={TEXT_TERTIARY}
              multiline
              value={
                newDef.recommendedAction ||
                'Deep clean and apply degreaser. Schedule follow-up in 30 days.'
              }
              onChangeText={(t) => setNewDef({ ...newDef, recommendedAction: t })}
            />

            <Text style={styles.fieldLabel}>Estimated Repair Cost ($)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={TEXT_TERTIARY}
              value={newDef.estimatedCost}
              onChangeText={(t) => setNewDef({ ...newDef, estimatedCost: t })}
            />

            <View style={styles.stepNavRow}>
              <TouchableOpacity
                style={styles.backStepBtn}
                onPress={() => setAddStep(4)}
              >
                <Text style={styles.backStepBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nextStepBtn}
                onPress={() => setAddStep(6)}
              >
                <Text style={styles.nextStepBtnText}>Review</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 6:
        // Step 6: Review & Save
        return (
          <ScrollView style={styles.modalStep}>
            <Text style={styles.modalStepTitle}>Step 6: Review & Save</Text>

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Equipment:</Text>
              <Text style={styles.reviewValue}>{newDef.equipment || '—'}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Component:</Text>
              <Text style={styles.reviewValue}>{newDef.component || '—'}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Severity:</Text>
              <View
                style={[
                  styles.severityBadge,
                  { backgroundColor: SEVERITY_STYLES[newDef.severity].bg },
                ]}
              >
                <Text
                  style={[
                    styles.severityBadgeText,
                    { color: SEVERITY_STYLES[newDef.severity].text },
                  ]}
                >
                  {SEVERITY_STYLES[newDef.severity].label}
                </Text>
              </View>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Description:</Text>
              <Text style={styles.reviewValue}>{newDef.description || '—'}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>NFPA Ref:</Text>
              <Text style={styles.reviewValue}>{newDef.nfpaReference || '—'}</Text>
            </View>
            {newDef.greaseDepth && (
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Grease Depth:</Text>
                <Text style={styles.reviewValue}>{newDef.greaseDepth} in</Text>
              </View>
            )}
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Action:</Text>
              <Text style={styles.reviewValue}>
                {newDef.recommendedAction || '—'}
              </Text>
            </View>
            {newDef.estimatedCost && (
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Est. Cost:</Text>
                <Text style={styles.reviewValue}>${newDef.estimatedCost}</Text>
              </View>
            )}

            <View style={styles.stepNavRow}>
              <TouchableOpacity
                style={styles.backStepBtn}
                onPress={() => setAddStep(5)}
              >
                <Text style={styles.backStepBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveFinalBtn}
                onPress={() => {
                  // TODO: Save deficiency to local storage / API
                  resetAddForm();
                }}
              >
                <Text style={styles.saveFinalBtnText}>Save Deficiency</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Deficiencies</Text>
        <TouchableOpacity
          style={styles.addDefBtn}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addDefBtnText}>+ Add Deficiency</Text>
        </TouchableOpacity>
      </View>

      {/* ── Severity summary ──────────────────────────────── */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: DANGER }]}>
          <Text style={[styles.summaryCount, { color: DANGER }]}>{counts.critical}</Text>
          <Text style={styles.summaryLabel}>Critical</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: '#ea580c' }]}>
          <Text style={[styles.summaryCount, { color: '#ea580c' }]}>{counts.major}</Text>
          <Text style={styles.summaryLabel}>Major</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: MINOR_YELLOW }]}>
          <Text style={[styles.summaryCount, { color: MINOR_YELLOW }]}>{counts.minor}</Text>
          <Text style={styles.summaryLabel}>Minor</Text>
        </View>
      </View>

      {/* ── Deficiency list ───────────────────────────────── */}
      <FlatList
        data={deficiencies}
        keyExtractor={(item) => item.id}
        renderItem={renderDeficiencyCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✓</Text>
            <Text style={styles.emptyTitle}>No Deficiencies</Text>
            <Text style={styles.emptySubtitle}>
              All equipment is in good condition.
            </Text>
          </View>
        }
      />

      {/* ── Add Deficiency Modal ──────────────────────────── */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={resetAddForm}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={resetAddForm}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Deficiency</Text>
            <Text style={styles.modalStepIndicator}>
              {addStep}/6
            </Text>
          </View>
          {/* Step progress */}
          <View style={styles.stepProgress}>
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  s <= addStep ? styles.stepDotActive : styles.stepDotInactive,
                ]}
              />
            ))}
          </View>
          {renderAddStep()}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  addDefBtn: {
    backgroundColor: DANGER,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addDefBtnText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 11,
    color: TEXT_TERTIARY,
    marginTop: 2,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // Deficiency card
  defCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  defCardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: LIGHT_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoThumbText: {
    fontSize: 10,
    color: TEXT_TERTIARY,
  },
  defCardContent: {
    flex: 1,
  },
  defDescription: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  defMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  defEquipment: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  defNfpa: {
    fontSize: 11,
    color: TEXT_TERTIARY,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 64,
  },
  emptyIcon: {
    fontSize: 48,
    color: SUCCESS,
    marginBottom: 8,
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

  // Modal
  modalSafe: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: CARD_BG,
  },
  modalCancel: {
    fontSize: 14,
    color: DANGER,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  modalStepIndicator: {
    fontSize: 13,
    color: TEXT_TERTIARY,
    fontWeight: '600',
  },

  // Step progress
  stepProgress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepDotActive: {
    backgroundColor: BRAND,
  },
  stepDotInactive: {
    backgroundColor: BORDER,
  },

  // Modal step content
  modalStep: {
    flex: 1,
    padding: 16,
  },
  modalStepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 16,
  },

  // Capture photo area
  capturePhotoArea: {
    height: 200,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  capturePhotoText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipBtnText: {
    color: TEXT_TERTIARY,
    fontSize: 14,
  },

  // Form fields
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_PRIMARY,
    backgroundColor: WHITE,
  },
  textArea: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_PRIMARY,
    backgroundColor: WHITE,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Option chips
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
  },
  optionChipActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  optionChipText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  optionChipTextActive: {
    color: WHITE,
  },

  // Severity selector
  severitySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  severityOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  severityOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },

  // Voice recording
  recordBtn: {
    backgroundColor: CARD_BG,
    borderWidth: 2,
    borderColor: BRAND,
    borderRadius: 40,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  recordBtnActive: {
    backgroundColor: DANGER,
    borderColor: DANGER,
  },
  recordBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND,
  },
  transcriptionBox: {
    backgroundColor: CARD_BG,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  transcriptionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_TERTIARY,
    marginBottom: 4,
  },
  transcriptionText: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    lineHeight: 18,
  },

  // AI suggestion
  aiSuggestionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
    marginBottom: 4,
  },

  // Step navigation
  stepNavRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  backStepBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backStepBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  nextStepBtn: {
    flex: 1,
    backgroundColor: BRAND,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextStepBtnText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '700',
  },
  saveFinalBtn: {
    flex: 1,
    backgroundColor: SUCCESS,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveFinalBtnText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '700',
  },

  // Review rows
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_BG,
  },
  reviewLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_TERTIARY,
    width: 100,
  },
  reviewValue: {
    flex: 1,
    fontSize: 13,
    color: TEXT_PRIMARY,
    textAlign: 'right',
  },
});
