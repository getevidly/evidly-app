import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
const SUCCESS = '#16a34a';

export function SignatureScreen({
  route,
  navigation,
}: {
  route?: { params?: { jobId?: string } };
  navigation?: any;
}) {
  const jobId = route?.params?.jobId ?? 'job-103';

  // TODO: Replace with real tech name from auth context
  const techName = 'Marcus Johnson';

  const [techSigned, setTechSigned] = useState(false);
  const [customerSigned, setCustomerSigned] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerTitle, setCustomerTitle] = useState('');
  const [emailReport, setEmailReport] = useState(true);

  const bothSigned = techSigned && customerSigned;

  const handleTechClear = () => {
    setTechSigned(false);
  };

  const handleTechSign = () => {
    // TODO: Capture signature from a signature pad component (react-native-signature-canvas)
    setTechSigned(true);
  };

  const handleCustomerClear = () => {
    setCustomerSigned(false);
  };

  const handleCustomerSign = () => {
    // TODO: Capture signature from a signature pad component
    setCustomerSigned(true);
  };

  const handleCompleteAndSend = () => {
    // TODO: Submit signatures + report via API
    // navigation.navigate('JobDetail', { jobId, completed: true })
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Collect Signatures</Text>
        <Text style={styles.subtitle}>
          Both signatures are required to complete the job.
        </Text>

        {/* ── Technician Signature ────────────────────────── */}
        <View style={styles.signatureCard}>
          <View style={styles.signatureHeader}>
            <Text style={styles.signatureLabel}>Technician Signature</Text>
            {techSigned && (
              <View style={styles.signedBadge}>
                <Text style={styles.signedBadgeText}>Signed</Text>
              </View>
            )}
          </View>
          <Text style={styles.signerName}>{techName}</Text>

          {/* Signature pad area */}
          <TouchableOpacity
            style={[
              styles.signaturePad,
              techSigned && styles.signaturePadSigned,
            ]}
            onPress={!techSigned ? handleTechSign : undefined}
            activeOpacity={techSigned ? 1 : 0.7}
          >
            {techSigned ? (
              <Text style={styles.signaturePreview}>
                {/* TODO: Render captured signature image */}
                [Signature captured]
              </Text>
            ) : (
              <Text style={styles.signaturePlaceholder}>
                Tap to sign
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.signatureActions}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleTechClear}
              disabled={!techSigned}
            >
              <Text
                style={[
                  styles.clearBtnText,
                  !techSigned && styles.clearBtnTextDisabled,
                ]}
              >
                Clear
              </Text>
            </TouchableOpacity>
            {!techSigned && (
              <TouchableOpacity style={styles.doneBtn} onPress={handleTechSign}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Customer Signature ──────────────────────────── */}
        <View style={styles.signatureCard}>
          <View style={styles.signatureHeader}>
            <Text style={styles.signatureLabel}>Customer Signature</Text>
            {customerSigned && (
              <View style={styles.signedBadge}>
                <Text style={styles.signedBadgeText}>Signed</Text>
              </View>
            )}
          </View>

          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Customer name"
            placeholderTextColor={TEXT_TERTIARY}
            value={customerName}
            onChangeText={setCustomerName}
          />

          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Manager, Owner"
            placeholderTextColor={TEXT_TERTIARY}
            value={customerTitle}
            onChangeText={setCustomerTitle}
          />

          {/* Signature pad area */}
          <TouchableOpacity
            style={[
              styles.signaturePad,
              customerSigned && styles.signaturePadSigned,
            ]}
            onPress={!customerSigned ? handleCustomerSign : undefined}
            activeOpacity={customerSigned ? 1 : 0.7}
          >
            {customerSigned ? (
              <Text style={styles.signaturePreview}>
                {/* TODO: Render captured signature image */}
                [Signature captured]
              </Text>
            ) : (
              <Text style={styles.signaturePlaceholder}>
                Tap to sign
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.signatureActions}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleCustomerClear}
              disabled={!customerSigned}
            >
              <Text
                style={[
                  styles.clearBtnText,
                  !customerSigned && styles.clearBtnTextDisabled,
                ]}
              >
                Clear
              </Text>
            </TouchableOpacity>
            {!customerSigned && (
              <TouchableOpacity style={styles.doneBtn} onPress={handleCustomerSign}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Email option ────────────────────────────────── */}
        <TouchableOpacity
          style={styles.emailOption}
          onPress={() => setEmailReport(!emailReport)}
        >
          <View style={[styles.checkbox, emailReport && styles.checkboxChecked]}>
            {emailReport && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.emailOptionText}>
            Email report copy to customer
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Bottom action ─────────────────────────────────── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.completeBtn,
            !bothSigned && styles.completeBtnDisabled,
          ]}
          disabled={!bothSigned}
          onPress={handleCompleteAndSend}
        >
          <Text style={styles.completeBtnText}>
            Complete & Send Report
          </Text>
        </TouchableOpacity>
        {!bothSigned && (
          <Text style={styles.completeBtnHint}>
            Both signatures required
          </Text>
        )}
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
    paddingBottom: 120,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginBottom: 20,
  },

  // Signature card
  signatureCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  signatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  signatureLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  signedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  signedBadgeText: {
    color: SUCCESS,
    fontSize: 12,
    fontWeight: '600',
  },
  signerName: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginBottom: 12,
  },

  // Signature pad
  signaturePad: {
    height: 150,
    backgroundColor: WHITE,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: BORDER,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  signaturePadSigned: {
    borderColor: SUCCESS,
    borderStyle: 'solid',
    backgroundColor: '#F0FDF4',
  },
  signaturePlaceholder: {
    fontSize: 16,
    color: TEXT_TERTIARY,
  },
  signaturePreview: {
    fontSize: 14,
    color: SUCCESS,
    fontWeight: '600',
  },

  // Signature actions
  signatureActions: {
    flexDirection: 'row',
    gap: 10,
  },
  clearBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  clearBtnTextDisabled: {
    color: BORDER,
  },
  doneBtn: {
    backgroundColor: BRAND,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  doneBtnText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
  },

  // Form fields
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_TERTIARY,
    marginBottom: 4,
    marginTop: 8,
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
    marginBottom: 4,
  },

  // Email option
  emailOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
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
  emailOptionText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
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
    padding: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  completeBtn: {
    width: '100%',
    backgroundColor: SUCCESS,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  completeBtnDisabled: {
    opacity: 0.4,
  },
  completeBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
  completeBtnHint: {
    fontSize: 12,
    color: TEXT_TERTIARY,
    marginTop: 6,
  },
});
