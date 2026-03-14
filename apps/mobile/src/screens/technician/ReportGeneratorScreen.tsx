import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
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

// ── Types ─────────────────────────────────────────────────────
type ReportType = 'service' | 'inspection' | 'deficiency' | 'nfpa_certificate';
type Step = 1 | 2 | 3 | 4 | 5;

interface ReportTypeOption {
  key: ReportType;
  label: string;
  description: string;
}

const REPORT_TYPES: ReportTypeOption[] = [
  {
    key: 'service',
    label: 'Service Report',
    description: 'Full service report with before/after photos and work performed.',
  },
  {
    key: 'inspection',
    label: 'Inspection Report',
    description: 'Detailed inspection findings, checklist results, and recommendations.',
  },
  {
    key: 'deficiency',
    label: 'Deficiency Report',
    description: 'All deficiencies found with photos, severity, and repair estimates.',
  },
  {
    key: 'nfpa_certificate',
    label: 'NFPA Certificate',
    description: 'Certificate of compliance per NFPA 96 standards.',
  },
];

// ── Placeholder data ─────────────────────────────────────────
// TODO: Replace with useJobReport(jobId) hook
const DEMO_REPORT_DATA = {
  customer: "Taco Loco — 2200 Pacific Coast Hwy, Long Beach, CA 90806",
  date: 'March 14, 2026',
  technician: 'Marcus Johnson',
  equipment: [
    'Primary Exhaust Hood (Type I)',
    'Secondary Exhaust Hood (Type I)',
    'Grease Trap (50 gal)',
    'Fire Suppression (Ansul R-102)',
  ],
  checklistResults: {
    preInspection: '12/12 Pass',
    postInspection: '10/10 Pass',
  },
  deficiencies: [
    'Grease buildup exceeds 1/4" on secondary hood plenum — Major',
    'Fan belt shows cracking and wear — Minor',
    'Grease filter not seated properly — Minor',
  ],
  recommendations: [
    'Schedule follow-up cleaning in 30 days for secondary hood',
    'Replace fan belt within 60 days',
    'Train kitchen staff on proper filter installation',
  ],
  photoCounts: { before: 4, during: 2, after: 3 },
};

export function ReportGeneratorScreen({
  route,
  navigation,
}: {
  route?: { params?: { jobId?: string } };
  navigation?: any;
}) {
  const jobId = route?.params?.jobId ?? 'job-103';

  const [step, setStep] = useState<Step>(1);
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('rosa@tacoloco.com');
  const [sendToOffice, setSendToOffice] = useState(true);
  const [sending, setSending] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    // TODO: Call report generation API
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
      setStep(5);
    }, 2000);
  };

  const handleSend = () => {
    setSending(true);
    // TODO: Call email delivery API
    setTimeout(() => {
      setSending(false);
      // TODO: navigation.goBack() or navigate to job detail
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Step indicator ──────────────────────────────── */}
      <View style={styles.stepIndicator}>
        {[1, 2, 3, 4, 5].map((s) => (
          <View key={s} style={styles.stepDotContainer}>
            <View
              style={[
                styles.stepDot,
                s <= step ? styles.stepDotActive : styles.stepDotInactive,
                s === step && styles.stepDotCurrent,
              ]}
            >
              <Text
                style={[
                  styles.stepDotText,
                  s <= step && styles.stepDotTextActive,
                ]}
              >
                {s}
              </Text>
            </View>
            <Text style={styles.stepDotLabel}>
              {['Type', 'Review', 'Preview', 'Generate', 'Deliver'][s - 1]}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* ── Step 1: Select Report Type ────────────────── */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Select Report Type</Text>
            {REPORT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.typeCard,
                  selectedType === type.key && styles.typeCardSelected,
                ]}
                onPress={() => setSelectedType(type.key)}
              >
                <View style={styles.typeRadio}>
                  <View
                    style={[
                      styles.radioOuter,
                      selectedType === type.key && styles.radioOuterSelected,
                    ]}
                  >
                    {selectedType === type.key && <View style={styles.radioInner} />}
                  </View>
                </View>
                <View style={styles.typeInfo}>
                  <Text style={styles.typeLabel}>{type.label}</Text>
                  <Text style={styles.typeDescription}>{type.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.primaryBtn, !selectedType && styles.primaryBtnDisabled]}
              disabled={!selectedType}
              onPress={() => setStep(2)}
            >
              <Text style={styles.primaryBtnText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 2: Review Content ────────────────────── */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Review Content</Text>
            <Text style={styles.reviewNote}>
              Auto-populated from job data. Tap any section to edit.
            </Text>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Customer</Text>
              <Text style={styles.reviewSectionValue}>{DEMO_REPORT_DATA.customer}</Text>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Service Date</Text>
              <Text style={styles.reviewSectionValue}>{DEMO_REPORT_DATA.date}</Text>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Technician</Text>
              <Text style={styles.reviewSectionValue}>{DEMO_REPORT_DATA.technician}</Text>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Equipment Serviced</Text>
              {DEMO_REPORT_DATA.equipment.map((eq, i) => (
                <Text key={i} style={styles.reviewListItem}>{'\u2022'} {eq}</Text>
              ))}
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Checklist Results</Text>
              <Text style={styles.reviewListItem}>
                Pre-Inspection: {DEMO_REPORT_DATA.checklistResults.preInspection}
              </Text>
              <Text style={styles.reviewListItem}>
                Post-Inspection: {DEMO_REPORT_DATA.checklistResults.postInspection}
              </Text>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Photos</Text>
              <Text style={styles.reviewSectionValue}>
                {DEMO_REPORT_DATA.photoCounts.before} Before |{' '}
                {DEMO_REPORT_DATA.photoCounts.during} During |{' '}
                {DEMO_REPORT_DATA.photoCounts.after} After
              </Text>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Deficiencies</Text>
              {DEMO_REPORT_DATA.deficiencies.map((d, i) => (
                <Text key={i} style={styles.reviewListItem}>{'\u2022'} {d}</Text>
              ))}
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Recommendations</Text>
              {DEMO_REPORT_DATA.recommendations.map((r, i) => (
                <Text key={i} style={styles.reviewListItem}>{'\u2022'} {r}</Text>
              ))}
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(3)}>
                <Text style={styles.primaryBtnText}>Preview</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Step 3: Preview ───────────────────────────── */}
        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Report Preview</Text>
            {/* Scrollable mock report preview */}
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewCompany}>HoodOps</Text>
                <Text style={styles.previewReportType}>
                  {REPORT_TYPES.find((t) => t.key === selectedType)?.label}
                </Text>
              </View>
              <View style={styles.previewDivider} />
              <Text style={styles.previewField}>
                Customer: {DEMO_REPORT_DATA.customer}
              </Text>
              <Text style={styles.previewField}>
                Date: {DEMO_REPORT_DATA.date}
              </Text>
              <Text style={styles.previewField}>
                Technician: {DEMO_REPORT_DATA.technician}
              </Text>
              <View style={styles.previewDivider} />
              <Text style={styles.previewSectionHead}>Equipment</Text>
              {DEMO_REPORT_DATA.equipment.map((eq, i) => (
                <Text key={i} style={styles.previewItem}>{'\u2022'} {eq}</Text>
              ))}
              <View style={styles.previewDivider} />
              <Text style={styles.previewSectionHead}>Findings</Text>
              {DEMO_REPORT_DATA.deficiencies.map((d, i) => (
                <Text key={i} style={styles.previewItem}>{'\u2022'} {d}</Text>
              ))}
              <View style={styles.previewDivider} />
              <Text style={styles.previewSectionHead}>Recommendations</Text>
              {DEMO_REPORT_DATA.recommendations.map((r, i) => (
                <Text key={i} style={styles.previewItem}>{'\u2022'} {r}</Text>
              ))}
              <Text style={styles.previewFooter}>
                [Before/After photos and signature blocks will appear in final PDF]
              </Text>
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(4)}>
                <Text style={styles.primaryBtnText}>Generate PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Step 4: Generate ──────────────────────────── */}
        {step === 4 && (
          <View style={styles.generateContainer}>
            <Text style={styles.stepTitle}>Generate Report</Text>
            {!generating && !generated && (
              <>
                <Text style={styles.generateInfo}>
                  Ready to generate your {REPORT_TYPES.find((t) => t.key === selectedType)?.label}.
                  This will create a branded PDF with all job data, photos, and signatures.
                </Text>
                <TouchableOpacity
                  style={styles.generateBtn}
                  onPress={handleGenerate}
                >
                  <Text style={styles.generateBtnText}>Generate PDF</Text>
                </TouchableOpacity>
              </>
            )}
            {generating && (
              <View style={styles.generatingState}>
                <ActivityIndicator size="large" color={BRAND} />
                <Text style={styles.generatingText}>
                  Generating report...
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Step 5: Deliver ───────────────────────────── */}
        {step === 5 && (
          <View>
            <Text style={styles.stepTitle}>Deliver Report</Text>
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>
                Report generated successfully!
              </Text>
            </View>

            <Text style={styles.fieldLabel}>Email to Customer</Text>
            <TextInput
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="customer@email.com"
              placeholderTextColor={TEXT_TERTIARY}
              value={customerEmail}
              onChangeText={setCustomerEmail}
            />

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setSendToOffice(!sendToOffice)}
            >
              <View style={[styles.checkbox, sendToOffice && styles.checkboxChecked]}>
                {sendToOffice && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Also send to office</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <Text style={styles.sendBtnText}>Send Report</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipDeliverBtn}
              onPress={() => {
                // TODO: navigation.goBack()
              }}
            >
              <Text style={styles.skipDeliverBtnText}>Save Without Sending</Text>
            </TouchableOpacity>
          </View>
        )}
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

  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  stepDotContainer: {
    alignItems: 'center',
    width: 56,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepDotActive: {
    backgroundColor: BRAND,
  },
  stepDotCurrent: {
    borderWidth: 2,
    borderColor: GOLD,
  },
  stepDotInactive: {
    backgroundColor: BORDER,
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_TERTIARY,
  },
  stepDotTextActive: {
    color: WHITE,
  },
  stepDotLabel: {
    fontSize: 10,
    color: TEXT_TERTIARY,
  },

  // Step title
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 12,
  },

  // Type cards
  typeCard: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
  },
  typeCardSelected: {
    borderColor: BRAND,
    borderWidth: 2,
  },
  typeRadio: {
    marginRight: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: BRAND,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: BRAND,
  },
  typeInfo: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  typeDescription: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    lineHeight: 17,
  },

  // Review sections
  reviewNote: {
    fontSize: 13,
    color: TEXT_TERTIARY,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  reviewSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_BG,
  },
  reviewSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_TERTIARY,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  reviewSectionValue: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    lineHeight: 20,
  },
  reviewListItem: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 20,
    paddingLeft: 4,
  },

  // Preview
  previewContainer: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  previewHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  previewCompany: {
    fontSize: 20,
    fontWeight: '700',
    color: BRAND,
  },
  previewReportType: {
    fontSize: 14,
    color: GOLD,
    fontWeight: '600',
  },
  previewDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 10,
  },
  previewField: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: 4,
  },
  previewSectionHead: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  previewItem: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    lineHeight: 18,
    paddingLeft: 4,
  },
  previewFooter: {
    fontSize: 11,
    color: TEXT_TERTIARY,
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },

  // Generate
  generateContainer: {
    alignItems: 'center',
    paddingTop: 32,
  },
  generateInfo: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  generateBtn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  generateBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
  generatingState: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 24,
  },
  generatingText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },

  // Deliver
  successBanner: {
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  successBannerText: {
    color: SUCCESS,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    marginBottom: 6,
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
    marginBottom: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  checkmark: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  sendBtn: {
    backgroundColor: SUCCESS,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
  skipDeliverBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipDeliverBtnText: {
    fontSize: 14,
    color: TEXT_TERTIARY,
  },

  // Navigation
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  backBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: BRAND,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '700',
  },
});
