import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = 'critical' | 'major' | 'minor';
type PhotoPhase = 'before' | 'during' | 'after';

interface Deficiency {
  id: string;
  nfpa_code: string;
  title: string;
  severity: Severity;
  system_name: string;
  corrective_action: string;
}

interface PhotoSummary {
  phase: PhotoPhase;
  count: number;
}

interface SystemSummary {
  id: string;
  system_number: number;
  name: string;
  completion_pct: number;
  sections: { label: string; complete: boolean }[];
}

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

const REPORT = {
  certificate_id: 'SR-2026-0441',
  customer_name: 'Oceanview Bistro',
  service_date: 'Mar 14, 2026',
  service_type: 'KEC Cleaning',
  status: 'in_progress',
  tech_name: 'Marcus Rivera',
};

const DEMO_SYSTEMS: SystemSummary[] = [
  {
    id: 'sys1',
    system_number: 1,
    name: 'Main Hood Line',
    completion_pct: 67,
    sections: [
      { label: 'Grease Levels', complete: true },
      { label: 'Hood', complete: true },
      { label: 'Filters', complete: true },
      { label: 'Ductwork', complete: false },
      { label: 'Fan - Mechanical', complete: false },
      { label: 'Fan - Electrical', complete: false },
      { label: 'Solid Fuel', complete: false },
      { label: 'Post Cleaning', complete: false },
      { label: 'Fire Safety', complete: false },
    ],
  },
  {
    id: 'sys2',
    system_number: 2,
    name: 'Prep Area Hood',
    completion_pct: 22,
    sections: [
      { label: 'Grease Levels', complete: true },
      { label: 'Hood', complete: true },
      { label: 'Filters', complete: false },
      { label: 'Ductwork', complete: false },
      { label: 'Fan - Mechanical', complete: false },
      { label: 'Fan - Electrical', complete: false },
      { label: 'Solid Fuel', complete: false },
      { label: 'Post Cleaning', complete: false },
      { label: 'Fire Safety', complete: false },
    ],
  },
];

const DEMO_DEFICIENCIES: Deficiency[] = [
  {
    id: 'def1',
    nfpa_code: 'NFPA 96 \u00a74.1.8',
    title: 'Excessive Grease Accumulation',
    severity: 'critical',
    system_name: 'Main Hood Line',
    corrective_action: 'Re-clean affected areas until grease depth is below 2000\u00b5m.',
  },
  {
    id: 'def2',
    nfpa_code: 'NFPA 96 \u00a77.8.1',
    title: 'Fan Hinge Kit Not Functional',
    severity: 'major',
    system_name: 'Main Hood Line',
    corrective_action: 'Repair or replace hinge kit to allow proper fan access.',
  },
  {
    id: 'def3',
    nfpa_code: 'NFPA 96 \u00a711.5.2',
    title: 'Non-UL 1046 Compliant Filters',
    severity: 'minor',
    system_name: 'Prep Area Hood',
    corrective_action: 'Replace filters with UL 1046 listed models.',
  },
];

const DEMO_PHOTOS: PhotoSummary[] = [
  { phase: 'before', count: 8 },
  { phase: 'during', count: 6 },
  { phase: 'after', count: 4 },
];

const FIRE_SAFETY = {
  suppression_type: 'Wet Chemical',
  inspection_current: true,
  last_tag_date: 'Jan 2026',
  extinguisher_count: 3,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSeverityColor(sev: Severity): { bg: string; text: string } {
  switch (sev) {
    case 'critical':
      return { bg: 'rgba(220,38,38,0.10)', text: '#DC2626' };
    case 'major':
      return { bg: 'rgba(234,88,12,0.10)', text: '#ea580c' };
    case 'minor':
      return { bg: 'rgba(212,175,55,0.12)', text: '#b8960f' };
  }
}

function getSeverityLabel(sev: Severity): string {
  return sev.charAt(0).toUpperCase() + sev.slice(1);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportReviewScreen() {
  const [techNotes, setTechNotes] = useState('');
  const [techSigned, setTechSigned] = useState(false);
  const [customerSigned, setCustomerSigned] = useState(false);

  const totalPhotos = DEMO_PHOTOS.reduce((s, p) => s + p.count, 0);
  const incompleteSections = DEMO_SYSTEMS.some((sys) =>
    sys.sections.some((sec) => !sec.complete),
  );
  const missingSigs = !techSigned || !customerSigned;

  const handleSaveDraft = () => {
    Alert.alert('Draft Saved', 'Report saved as draft (demo).');
  };

  const handleSubmitQA = () => {
    if (incompleteSections) {
      Alert.alert(
        'Incomplete Sections',
        'Some sections are not yet complete. Submit anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', onPress: () => Alert.alert('Submitted', 'Report submitted for QA review (demo).') },
        ],
      );
    } else {
      Alert.alert('Submitted', 'Report submitted for QA review (demo).');
    }
  };

  const handleGeneratePdf = () => {
    Alert.alert('PDF', 'PDF generation is not available in demo mode.');
  };

  const handleSignature = (type: 'tech' | 'customer') => {
    Alert.alert(
      'Signature',
      `Navigate to signature capture for ${type === 'tech' ? 'Technician' : 'Customer'} (demo).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Signed',
          onPress: () => {
            if (type === 'tech') setTechSigned(true);
            else setCustomerSigned(true);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerServiceType}>{REPORT.service_type}</Text>
        <Text style={styles.headerTitle}>Review & Submit</Text>
        <Text style={styles.headerCertificate}>{REPORT.certificate_id}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Report Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Customer</Text>
            <Text style={styles.summaryValue}>{REPORT.customer_name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date</Text>
            <Text style={styles.summaryValue}>{REPORT.service_date}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Technician</Text>
            <Text style={styles.summaryValue}>{REPORT.tech_name}</Text>
          </View>
          <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.summaryLabel}>Service Type</Text>
            <View style={styles.serviceTypeBadge}>
              <Text style={styles.serviceTypeBadgeText}>
                {REPORT.service_type}
              </Text>
            </View>
          </View>
        </View>

        {/* Systems Summary */}
        <Text style={styles.sectionHeading}>Systems</Text>
        {DEMO_SYSTEMS.map((sys) => {
          const hasIncomplete = sys.sections.some((s) => !s.complete);
          return (
            <View
              key={sys.id}
              style={[
                styles.systemCard,
                hasIncomplete && styles.systemCardWarning,
              ]}
            >
              <View style={styles.systemHeader}>
                <Text style={styles.systemName}>
                  #{sys.system_number} {sys.name}
                </Text>
                <Text
                  style={[
                    styles.systemPct,
                    sys.completion_pct < 100 && styles.systemPctWarning,
                  ]}
                >
                  {sys.completion_pct}%
                </Text>
              </View>
              <View style={styles.systemSections}>
                {sys.sections.map((sec) => (
                  <View key={sec.label} style={styles.systemSectionRow}>
                    <Text
                      style={[
                        styles.systemSectionIcon,
                        { color: sec.complete ? '#059669' : '#ea580c' },
                      ]}
                    >
                      {sec.complete ? '\u2713' : '\u26A0'}
                    </Text>
                    <Text
                      style={[
                        styles.systemSectionLabel,
                        !sec.complete && styles.systemSectionLabelWarning,
                      ]}
                    >
                      {sec.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* Deficiencies Summary */}
        <Text style={styles.sectionHeading}>
          Deficiencies ({DEMO_DEFICIENCIES.length})
        </Text>
        {(['critical', 'major', 'minor'] as Severity[]).map((sev) => {
          const items = DEMO_DEFICIENCIES.filter((d) => d.severity === sev);
          if (items.length === 0) return null;
          const colors = getSeverityColor(sev);
          return (
            <View key={sev} style={styles.deficiencyGroup}>
              <View style={[styles.severityHeader, { backgroundColor: colors.bg }]}>
                <Text style={[styles.severityHeaderText, { color: colors.text }]}>
                  {getSeverityLabel(sev)} ({items.length})
                </Text>
              </View>
              {items.map((def) => (
                <View key={def.id} style={styles.deficiencyCard}>
                  <View style={styles.defCardHeader}>
                    <View style={[styles.nfpaCodeBadge, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.nfpaCodeText, { color: colors.text }]}>
                        {def.nfpa_code}
                      </Text>
                    </View>
                    <Text style={styles.defSystem}>{def.system_name}</Text>
                  </View>
                  <Text style={styles.defTitle}>{def.title}</Text>
                  <Text style={styles.defCorrective}>
                    {def.corrective_action}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}

        {/* Photos Summary */}
        <Text style={styles.sectionHeading}>
          Photos ({totalPhotos})
        </Text>
        <View style={styles.photosCard}>
          <View style={styles.photoPhasesRow}>
            {DEMO_PHOTOS.map((p) => (
              <View key={p.phase} style={styles.photoPhaseItem}>
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>{p.count}</Text>
                </View>
                <Text style={styles.photoPhaseLabel}>
                  {p.phase.charAt(0).toUpperCase() + p.phase.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Fire Safety Summary */}
        <Text style={styles.sectionHeading}>Fire Safety</Text>
        <View style={styles.fireSafetyCard}>
          <View style={styles.fsRow}>
            <Text style={styles.fsLabel}>Suppression</Text>
            <Text style={styles.fsValue}>{FIRE_SAFETY.suppression_type}</Text>
          </View>
          <View style={styles.fsRow}>
            <Text style={styles.fsLabel}>Inspection Current</Text>
            <Text style={[styles.fsValue, { color: FIRE_SAFETY.inspection_current ? '#059669' : '#DC2626' }]}>
              {FIRE_SAFETY.inspection_current ? 'Yes' : 'No'}
            </Text>
          </View>
          <View style={styles.fsRow}>
            <Text style={styles.fsLabel}>Last Tag</Text>
            <Text style={styles.fsValue}>{FIRE_SAFETY.last_tag_date}</Text>
          </View>
          <View style={[styles.fsRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.fsLabel}>Extinguishers</Text>
            <Text style={styles.fsValue}>{FIRE_SAFETY.extinguisher_count}</Text>
          </View>
        </View>

        {/* Technician Notes */}
        <Text style={styles.sectionHeading}>Technician Notes</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add any notes for this report..."
          placeholderTextColor="#6B7F96"
          value={techNotes}
          onChangeText={setTechNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Signatures */}
        <Text style={styles.sectionHeading}>Signatures</Text>
        <View style={styles.signaturesCard}>
          <TouchableOpacity
            style={[styles.signatureButton, techSigned && styles.signatureButtonSigned]}
            onPress={() => handleSignature('tech')}
          >
            <Text
              style={[
                styles.signatureButtonText,
                techSigned && styles.signatureButtonTextSigned,
              ]}
            >
              {techSigned ? '\u2713  Tech Signed' : 'Tech Signature'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.signatureButton, customerSigned && styles.signatureButtonSigned]}
            onPress={() => handleSignature('customer')}
          >
            <Text
              style={[
                styles.signatureButtonText,
                customerSigned && styles.signatureButtonTextSigned,
              ]}
            >
              {customerSigned ? '\u2713  Customer Signed' : 'Customer Signature'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Warnings */}
        {(incompleteSections || missingSigs) && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningTitle}>Warnings</Text>
            {incompleteSections && (
              <Text style={styles.warningText}>
                Some sections are incomplete. You can still submit for QA review.
              </Text>
            )}
            {missingSigs && (
              <Text style={styles.warningText}>
                Missing signatures: {!techSigned ? 'Technician' : ''}{!techSigned && !customerSigned ? ', ' : ''}{!customerSigned ? 'Customer' : ''}
              </Text>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.draftButton}
            onPress={handleSaveDraft}
          >
            <Text style={styles.draftButtonText}>Save Draft</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmitQA}
          >
            <Text style={styles.submitButtonText}>Submit for QA</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.pdfButton}
          onPress={handleGeneratePdf}
        >
          <Text style={styles.pdfButtonText}>Generate PDF</Text>
        </TouchableOpacity>
      </ScrollView>
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  headerCertificate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Summary card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7F96',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0B1628',
  },
  serviceTypeBadge: {
    backgroundColor: 'rgba(30,77,107,0.10)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  serviceTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e4d6b',
  },

  // Section heading
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1628',
    marginTop: 24,
    marginBottom: 10,
  },

  // System card
  systemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  systemCardWarning: {
    borderLeftWidth: 3,
    borderLeftColor: '#ea580c',
  },
  systemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  systemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B1628',
  },
  systemPct: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  systemPctWarning: {
    color: '#ea580c',
  },
  systemSections: {
    gap: 4,
  },
  systemSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  systemSectionIcon: {
    fontSize: 13,
    fontWeight: '700',
    width: 18,
    textAlign: 'center',
  },
  systemSectionLabel: {
    fontSize: 13,
    color: '#3D5068',
  },
  systemSectionLabelWarning: {
    color: '#ea580c',
  },

  // Deficiency groups
  deficiencyGroup: {
    marginBottom: 12,
  },
  severityHeader: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  severityHeaderText: {
    fontSize: 13,
    fontWeight: '700',
  },
  deficiencyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  defCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  nfpaCodeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  nfpaCodeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  defSystem: {
    fontSize: 11,
    color: '#6B7F96',
  },
  defTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0B1628',
    marginBottom: 4,
  },
  defCorrective: {
    fontSize: 12,
    color: '#3D5068',
    lineHeight: 18,
  },

  // Photos
  photosCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  photoPhasesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  photoPhaseItem: {
    alignItems: 'center',
  },
  photoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#E8EDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  photoPlaceholderText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e4d6b',
  },
  photoPhaseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D5068',
  },

  // Fire safety
  fireSafetyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  fsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
  },
  fsLabel: {
    fontSize: 13,
    color: '#6B7F96',
  },
  fsValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0B1628',
  },

  // Notes
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#0B1628',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#D1D9E6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  // Signatures
  signaturesCard: {
    flexDirection: 'row',
    gap: 10,
  },
  signatureButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D9E6',
    borderStyle: 'dashed',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  signatureButtonSigned: {
    borderColor: '#059669',
    borderStyle: 'solid',
    backgroundColor: 'rgba(5,150,105,0.06)',
  },
  signatureButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D5068',
  },
  signatureButtonTextSigned: {
    color: '#059669',
  },

  // Warnings
  warningBanner: {
    backgroundColor: 'rgba(234,88,12,0.08)',
    borderRadius: 10,
    padding: 14,
    marginTop: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#ea580c',
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ea580c',
    marginBottom: 6,
  },
  warningText: {
    fontSize: 13,
    color: '#9a3412',
    lineHeight: 18,
    marginBottom: 2,
  },

  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  draftButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D9E6',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  draftButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B1628',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#1e4d6b',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pdfButton: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#0B1628',
    alignItems: 'center',
  },
  pdfButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#d4af37',
  },
});
