import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

const BRAND = {
  primary: '#1e4d6b',
  gold: '#d4af37',
  darkBg: '#07111F',
  lightBg: '#F4F6FA',
  cardBg: '#0B1628',
  white: '#FFFFFF',
  green: '#166534',
  greenLight: '#DCFCE7',
  orange: '#F59E0B',
  orangeLight: '#FEF3C7',
  red: '#DC2626',
  redLight: '#FEE2E2',
  redDark: '#991B1B',
  gray: '#6B7F96',
  grayLight: '#D1D9E6',
  textPrimary: '#0B1628',
  textSecondary: '#3D5068',
};

type Severity = 'critical' | 'major' | 'minor';

interface Deficiency {
  id: string;
  severity: Severity;
  nfpaCode: string;
  component: string;
  description: string;
  correctiveAction: string;
}

interface SignaturePad {
  id: string;
  label: string;
  name: string;
  signed: boolean;
}

interface IncompleteItem {
  section: string;
  detail: string;
}

const DEMO_DEFICIENCIES: Deficiency[] = [
  {
    id: 'def-1',
    severity: 'major',
    nfpaCode: 'NFPA 96 \u00A712.6.1.1.3',
    component: 'Horizontal Duct',
    description:
      'Heavy grease buildup exceeding acceptable levels in horizontal duct run between hood and vertical riser.',
    correctiveAction:
      'Re-clean horizontal duct section. Schedule follow-up inspection within 30 days.',
  },
  {
    id: 'def-2',
    severity: 'major',
    nfpaCode: 'NFPA 96 \u00A712.3.1',
    component: 'Access Panel',
    description:
      'Access panel on vertical duct run does not seal properly. Visible gaps allowing grease-laden vapor escape.',
    correctiveAction:
      'Replace access panel gasket and verify proper seal. Notify building maintenance.',
  },
  {
    id: 'def-3',
    severity: 'minor',
    nfpaCode: 'NFPA 96 \u00A714.6',
    component: 'Hood Interior',
    description:
      'Two hood lights non-functional on south end of main hood canopy.',
    correctiveAction:
      'Replace hood light bulbs or fixtures. Verify vapor-proof rating of replacement.',
  },
];

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Critical', color: BRAND.redDark, bg: '#FEE2E2', border: BRAND.red },
  major: { label: 'Major', color: '#92400E', bg: BRAND.orangeLight, border: BRAND.orange },
  minor: { label: 'Minor', color: '#1E40AF', bg: '#DBEAFE', border: '#3B82F6' },
};

export function ReviewSignScreen() {
  const [incompleteItems] = useState<IncompleteItem[]>([]);
  const isReady = incompleteItems.length === 0;

  const [deficiencies] = useState<Deficiency[]>(DEMO_DEFICIENCIES);

  const [acknowledgedActions, setAcknowledgedActions] = useState<Record<string, boolean>>({
    'def-1': false,
    'def-2': false,
    'def-3': true,
  });

  const [signatures, setSignatures] = useState<SignaturePad[]>([
    { id: 'lead', label: 'Lead Technician', name: 'Marcus Rivera', signed: false },
    { id: 'qa', label: 'QA Reviewer', name: 'Sarah Chen', signed: false },
    { id: 'customer', label: 'Customer', name: 'David Park', signed: false },
  ]);

  const allSigned = signatures.every(s => s.signed);

  const toggleAcknowledge = (defId: string) => {
    setAcknowledgedActions(prev => ({ ...prev, [defId]: !prev[defId] }));
  };

  const toggleSignature = (sigId: string) => {
    setSignatures(prev =>
      prev.map(s => (s.id === sigId ? { ...s, signed: !s.signed } : s))
    );
  };

  const clearSignature = (sigId: string) => {
    setSignatures(prev =>
      prev.map(s => (s.id === sigId ? { ...s, signed: false } : s))
    );
  };

  const handleGeneratePdf = () => {
    Alert.alert('PDF Generated', 'Service report PDF generated successfully.', [
      { text: 'OK' },
    ]);
  };

  const handleSubmitForQA = () => {
    if (!allSigned) {
      Alert.alert('Signatures Required', 'All 3 signatures must be captured before submitting.');
      return;
    }
    Alert.alert(
      'Submit for QA Review',
      'This report will be submitted for QA review. The customer will receive their copy once approved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: () =>
            Alert.alert('Submitted', 'Report submitted for QA review. Status: QA Pending.'),
        },
      ]
    );
  };

  const groupedDeficiencies = (['critical', 'major', 'minor'] as Severity[])
    .map(sev => ({
      severity: sev,
      items: deficiencies.filter(d => d.severity === sev),
    }))
    .filter(g => g.items.length > 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => Alert.alert('Back', 'Navigate to ReportNavigator')}
        >
          <Text style={styles.backArrow}>{'\u2039'}</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Review & Sign</Text>
          <Text style={styles.headerSubtitle}>SR-2026-00417</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <View
          style={[
            styles.statusBanner,
            isReady ? styles.statusBannerReady : styles.statusBannerIncomplete,
          ]}
        >
          <Text style={styles.statusIcon}>
            {isReady ? '\u2713' : '\u26A0\uFE0F'}
          </Text>
          <View style={styles.statusContent}>
            <Text
              style={[
                styles.statusTitle,
                isReady ? styles.statusTitleReady : styles.statusTitleIncomplete,
              ]}
            >
              {isReady
                ? 'Ready to Submit'
                : `Incomplete \u2014 ${incompleteItems.length} item${incompleteItems.length !== 1 ? 's' : ''} remaining`}
            </Text>
            {!isReady &&
              incompleteItems.map((item, idx) => (
                <Text key={idx} style={styles.statusItem}>
                  {'\u2022'} {item.section}: {item.detail}
                </Text>
              ))}
          </View>
        </View>

        {/* Deficiencies Summary */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Deficiencies Found</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{deficiencies.length}</Text>
            </View>
          </View>

          {groupedDeficiencies.map(group => {
            const config = SEVERITY_CONFIG[group.severity];
            return (
              <View key={group.severity} style={styles.severityGroup}>
                <View
                  style={[
                    styles.severityLabel,
                    { backgroundColor: config.bg, borderColor: config.border },
                  ]}
                >
                  <Text style={[styles.severityLabelText, { color: config.color }]}>
                    {config.label} ({group.items.length})
                  </Text>
                </View>

                {group.items.map(def => (
                  <View
                    key={def.id}
                    style={[
                      styles.deficiencyCard,
                      { borderLeftColor: config.border },
                    ]}
                  >
                    <View style={styles.defHeader}>
                      <View
                        style={[
                          styles.nfpaBadge,
                          { backgroundColor: config.bg },
                        ]}
                      >
                        <Text style={[styles.nfpaBadgeText, { color: config.color }]}>
                          {def.nfpaCode}
                        </Text>
                      </View>
                      <Text style={styles.defComponent}>{def.component}</Text>
                    </View>
                    <Text style={styles.defDescription}>{def.description}</Text>
                    <View style={styles.correctiveRow}>
                      <Text style={styles.correctiveLabel}>Corrective Action:</Text>
                      <Text style={styles.correctiveText}>{def.correctiveAction}</Text>
                    </View>
                  </View>
                ))}
              </View>
            );
          })}
        </View>

        {/* Corrective Actions Checklist */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Corrective Actions Acknowledgment</Text>
          <Text style={styles.sectionSubtitle}>
            Technician must acknowledge each corrective action below.
          </Text>

          {deficiencies.map(def => (
            <TouchableOpacity
              key={def.id}
              style={styles.checklistRow}
              onPress={() => toggleAcknowledge(def.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  acknowledgedActions[def.id] && styles.checkboxChecked,
                ]}
              >
                {acknowledgedActions[def.id] && (
                  <Text style={styles.checkboxCheck}>{'\u2713'}</Text>
                )}
              </View>
              <View style={styles.checklistContent}>
                <Text style={styles.checklistComponent}>{def.component}</Text>
                <Text style={styles.checklistAction} numberOfLines={2}>
                  {def.correctiveAction}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Signature Pads */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Signatures</Text>
          <Text style={styles.sectionSubtitle}>
            All three signatures required before submission.
          </Text>

          {signatures.map(sig => (
            <View key={sig.id} style={styles.signaturePadContainer}>
              <View style={styles.signatureHeader}>
                <View>
                  <Text style={styles.signatureLabel}>{sig.label}</Text>
                  <Text style={styles.signatureName}>{sig.name}</Text>
                </View>
                {sig.signed && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => clearSignature(sig.id)}
                  >
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.signaturePad,
                  sig.signed ? styles.signaturePadSigned : styles.signaturePadEmpty,
                ]}
                onPress={() => !sig.signed && toggleSignature(sig.id)}
                activeOpacity={sig.signed ? 1 : 0.7}
              >
                {sig.signed ? (
                  <View style={styles.signedContent}>
                    <Text style={styles.signedCheck}>{'\u2713'}</Text>
                    <Text style={styles.signedText}>Signed</Text>
                    <Text style={styles.signedTimestamp}>
                      {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.emptySignContent}>
                    <Text style={styles.tapToSignText}>Tap to sign</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.generatePdfButton}
            onPress={handleGeneratePdf}
            activeOpacity={0.8}
          >
            <Text style={styles.generatePdfButtonText}>Generate PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              !allSigned && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmitForQA}
            activeOpacity={0.8}
            disabled={!allSigned}
          >
            <Text
              style={[
                styles.submitButtonText,
                !allSigned && styles.submitButtonTextDisabled,
              ]}
            >
              Submit for QA
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dispatch Status Legend */}
        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>Dispatch Status Reference</Text>
          <View style={styles.legendGrid}>
            {[
              { icon: '\uD83D\uDCC5', label: 'Scheduled' },
              { icon: '\uD83D\uDD27', label: 'In Progress' },
              { icon: '\uD83D\uDCCB', label: 'Report Pending' },
              { icon: '\uD83D\uDD04', label: 'QA Pending' },
              { icon: '\u2705', label: 'Approved' },
              { icon: '\u2705\uD83D\uDCE7', label: 'Sent' },
            ].map((item, idx) => (
              <View key={idx} style={styles.legendItem}>
                <Text style={styles.legendIcon}>{item.icon}</Text>
                <Text style={styles.legendLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.lightBg,
  },
  header: {
    backgroundColor: BRAND.darkBg,
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backArrow: {
    fontSize: 26,
    color: BRAND.white,
    marginTop: -2,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: BRAND.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: BRAND.gold,
    marginTop: 2,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  statusBanner: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
  },
  statusBannerReady: {
    backgroundColor: BRAND.greenLight,
    borderColor: BRAND.green,
  },
  statusBannerIncomplete: {
    backgroundColor: BRAND.redLight,
    borderColor: BRAND.red,
  },
  statusIcon: {
    fontSize: 22,
    marginTop: 1,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusTitleReady: {
    color: BRAND.green,
  },
  statusTitleIncomplete: {
    color: BRAND.redDark,
  },
  statusItem: {
    fontSize: 13,
    color: BRAND.redDark,
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: BRAND.white,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND.textPrimary,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: BRAND.gray,
    marginBottom: 16,
  },
  countBadge: {
    backgroundColor: BRAND.orangeLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  severityGroup: {
    marginBottom: 14,
  },
  severityLabel: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  severityLabelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  deficiencyCard: {
    backgroundColor: BRAND.lightBg,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  defHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  nfpaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  nfpaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  defComponent: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND.textPrimary,
  },
  defDescription: {
    fontSize: 13,
    color: BRAND.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  correctiveRow: {
    backgroundColor: BRAND.white,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  correctiveLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  correctiveText: {
    fontSize: 13,
    color: BRAND.textPrimary,
    lineHeight: 18,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: BRAND.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: BRAND.green,
    borderColor: BRAND.green,
  },
  checkboxCheck: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND.white,
  },
  checklistContent: {
    flex: 1,
  },
  checklistComponent: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.textPrimary,
    marginBottom: 2,
  },
  checklistAction: {
    fontSize: 13,
    color: BRAND.textSecondary,
    lineHeight: 18,
  },
  signaturePadContainer: {
    marginBottom: 18,
  },
  signatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  signatureLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND.textPrimary,
  },
  signatureName: {
    fontSize: 13,
    color: BRAND.textSecondary,
    marginTop: 2,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: BRAND.redLight,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: BRAND.red,
  },
  signaturePad: {
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signaturePadEmpty: {
    borderStyle: 'dashed',
    borderColor: BRAND.grayLight,
    backgroundColor: '#FAFBFE',
  },
  signaturePadSigned: {
    borderStyle: 'solid',
    borderColor: BRAND.green,
    backgroundColor: '#F0FDF4',
  },
  signedContent: {
    alignItems: 'center',
    gap: 4,
  },
  signedCheck: {
    fontSize: 28,
    fontWeight: '700',
    color: BRAND.green,
  },
  signedText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.green,
  },
  signedTimestamp: {
    fontSize: 11,
    color: BRAND.gray,
  },
  emptySignContent: {
    alignItems: 'center',
  },
  tapToSignText: {
    fontSize: 15,
    fontWeight: '500',
    color: BRAND.gray,
  },
  actionsSection: {
    gap: 12,
    marginBottom: 20,
  },
  generatePdfButton: {
    backgroundColor: BRAND.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  generatePdfButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND.white,
  },
  submitButton: {
    backgroundColor: BRAND.gold,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#B8C4D8',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND.darkBg,
  },
  submitButtonTextDisabled: {
    color: '#E8EDF5',
  },
  legendCard: {
    backgroundColor: BRAND.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND.gray,
    marginBottom: 12,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '45%',
    marginBottom: 4,
  },
  legendIcon: {
    fontSize: 14,
  },
  legendLabel: {
    fontSize: 12,
    color: BRAND.textSecondary,
  },
});
