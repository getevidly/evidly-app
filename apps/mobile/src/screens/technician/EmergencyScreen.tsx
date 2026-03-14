import React from 'react';
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
const GOLD = '#d4af37';
const WHITE = '#ffffff';
const LIGHT_BG = '#F4F6FA';
const CARD_BG = '#ffffff';
const TEXT_PRIMARY = '#0B1628';
const TEXT_SECONDARY = '#3D5068';
const TEXT_TERTIARY = '#6B7F96';
const BORDER = '#D1D9E6';
const DANGER = '#dc2626';

// ── Placeholder data ─────────────────────────────────────────
// TODO: Replace with useEmergencyInfo() hook / org settings
const EMERGENCY_DATA = {
  companyEmergency: {
    label: 'Company Emergency Line',
    number: '(800) 555-HOOD',
    available: '24/7',
  },
  roadsideAssistance: {
    label: 'Roadside Assistance',
    number: '(800) 555-ROAD',
    provider: 'Fleet Services Inc.',
  },
  insurance: {
    carrier: 'National General Insurance',
    policyNumber: 'NGL-2026-0089432',
    agentName: 'David Chen',
    agentPhone: '(562) 555-0199',
  },
  procedures: [
    {
      title: 'Vehicle Accident',
      steps: [
        'Ensure personal safety first — move to safe location',
        'Call 911 if injuries or road hazards',
        'Call Company Emergency Line',
        'Document scene with photos (all angles)',
        'Exchange info with other parties',
        'Do NOT admit fault or discuss details',
        'File incident report in app within 1 hour',
      ],
    },
    {
      title: 'On-Site Injury',
      steps: [
        'Stop work immediately',
        'Administer first aid if trained',
        'Call 911 for serious injuries',
        'Call Company Emergency Line',
        'Secure the area to prevent further injury',
        'Document conditions and witness statements',
        'File incident report in app within 1 hour',
      ],
    },
    {
      title: 'Chemical Exposure',
      steps: [
        'Remove from exposure area immediately',
        'If skin contact: flush with water for 15+ minutes',
        'If eye contact: flush eyes for 15+ minutes',
        'If inhaled: move to fresh air',
        'Call Poison Control: (800) 222-1222',
        'Call Company Emergency Line',
        'Refer to SDS (Safety Data Sheet) for chemical',
      ],
    },
    {
      title: 'Equipment Malfunction',
      steps: [
        'Power off equipment immediately',
        'Clear the area of personnel',
        'Do NOT attempt field repair on pressurized systems',
        'Call Company Emergency Line for dispatch guidance',
        'Document malfunction with photos',
        'Tag equipment as out-of-service',
      ],
    },
    {
      title: 'Fire at Job Site',
      steps: [
        'Evacuate immediately — alert all personnel',
        'Call 911',
        'Use fire extinguisher ONLY if small and contained',
        'Call Company Emergency Line',
        'Account for all personnel at assembly point',
        'Do NOT re-enter building until cleared by fire dept',
      ],
    },
  ],
};

export function EmergencyScreen({ navigation }: { navigation?: any }) {
  const handleCall = (number: string) => {
    // TODO: Linking.openURL(`tel:${number.replace(/\D/g, '')}`)
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Emergency Info</Text>

        {/* ── Company Emergency (big tap-to-call) ────────── */}
        <TouchableOpacity
          style={styles.emergencyCard}
          onPress={() => handleCall(EMERGENCY_DATA.companyEmergency.number)}
          activeOpacity={0.8}
        >
          <Text style={styles.emergencyLabel}>
            {EMERGENCY_DATA.companyEmergency.label}
          </Text>
          <Text style={styles.emergencyNumber}>
            {EMERGENCY_DATA.companyEmergency.number}
          </Text>
          <Text style={styles.emergencyAvailable}>
            {EMERGENCY_DATA.companyEmergency.available}
          </Text>
          <Text style={styles.tapToCall}>Tap to Call</Text>
        </TouchableOpacity>

        {/* ── Roadside Assistance ───────────────────────── */}
        <TouchableOpacity
          style={styles.contactCard}
          onPress={() => handleCall(EMERGENCY_DATA.roadsideAssistance.number)}
          activeOpacity={0.8}
        >
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>
              {EMERGENCY_DATA.roadsideAssistance.label}
            </Text>
            <Text style={styles.contactProvider}>
              {EMERGENCY_DATA.roadsideAssistance.provider}
            </Text>
          </View>
          <View style={styles.contactPhoneCol}>
            <Text style={styles.contactPhone}>
              {EMERGENCY_DATA.roadsideAssistance.number}
            </Text>
            <Text style={styles.contactCallHint}>Tap to call</Text>
          </View>
        </TouchableOpacity>

        {/* ── Insurance Info ────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Insurance Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Carrier</Text>
            <Text style={styles.infoValue}>
              {EMERGENCY_DATA.insurance.carrier}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Policy #</Text>
            <Text style={styles.infoValue}>
              {EMERGENCY_DATA.insurance.policyNumber}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Agent</Text>
            <Text style={styles.infoValue}>
              {EMERGENCY_DATA.insurance.agentName}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.callAgentBtn}
            onPress={() => handleCall(EMERGENCY_DATA.insurance.agentPhone)}
          >
            <Text style={styles.callAgentBtnText}>
              Call Agent — {EMERGENCY_DATA.insurance.agentPhone}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Emergency Procedures ──────────────────────── */}
        <Text style={styles.sectionTitle}>Emergency Procedures</Text>
        {EMERGENCY_DATA.procedures.map((proc, pi) => (
          <View key={pi} style={styles.procedureCard}>
            <Text style={styles.procedureTitle}>{proc.title}</Text>
            {proc.steps.map((step, si) => (
              <View key={si} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{si + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        ))}
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
  content: {
    padding: 16,
    paddingBottom: 32,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 16,
  },

  // Emergency card (big tap-to-call)
  emergencyCard: {
    backgroundColor: DANGER,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  emergencyNumber: {
    color: WHITE,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 2,
  },
  emergencyAvailable: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 8,
  },
  tapToCall: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },

  // Contact card
  contactCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactInfo: {},
  contactLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  contactProvider: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  contactPhoneCol: {
    alignItems: 'flex-end',
  },
  contactPhone: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND,
  },
  contactCallHint: {
    fontSize: 10,
    color: TEXT_TERTIARY,
  },

  // Card
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_BG,
  },
  infoLabel: {
    fontSize: 13,
    color: TEXT_TERTIARY,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  callAgentBtn: {
    marginTop: 12,
    backgroundColor: BRAND,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  callAgentBtnText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
  },

  // Section title
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 12,
  },

  // Procedure card
  procedureCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  procedureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 10,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepNumText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 19,
  },
});
