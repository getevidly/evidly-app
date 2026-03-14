import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

export function SignatureScreen() {
  const [techSigned, setTechSigned] = useState(false);
  const [customerSigned, setCustomerSigned] = useState(false);

  const techName = 'Marcus Rivera';
  const customerName = 'Maria Santos';

  const handleClearTech = () => {
    setTechSigned(false);
  };

  const handleClearCustomer = () => {
    setCustomerSigned(false);
  };

  const handleSubmit = () => {
    if (!techSigned || !customerSigned) {
      Alert.alert(
        'Signatures Required',
        'Both technician and customer signatures are required to submit.',
      );
      return;
    }
    Alert.alert('Submitted', 'Signatures captured and report finalized (demo).');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Signatures</Text>
        <Text style={styles.headerSubtitle}>
          Capture technician and customer signatures
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Technician Signature */}
        <View style={styles.section}>
          <View style={styles.sigHeader}>
            <Text style={styles.sigLabel}>Technician Signature</Text>
            {techSigned && (
              <TouchableOpacity onPress={handleClearTech}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.signatureCanvas,
              techSigned ? styles.signatureCanvasSigned : null,
            ]}
            onPress={() => setTechSigned(true)}
          >
            {techSigned ? (
              <Text style={styles.signedText}>
                {techName}
              </Text>
            ) : (
              <Text style={styles.canvasPlaceholder}>
                Tap to sign
              </Text>
            )}
          </TouchableOpacity>
          <View style={styles.nameRow}>
            <Text style={styles.nameLabel}>Name:</Text>
            <Text style={styles.nameValue}>{techName}</Text>
          </View>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                techSigned ? styles.statusDotGreen : styles.statusDotGray,
              ]}
            />
            <Text style={styles.statusText}>
              {techSigned ? 'Signed' : 'Pending'}
            </Text>
          </View>
        </View>

        {/* Customer Signature */}
        <View style={styles.section}>
          <View style={styles.sigHeader}>
            <Text style={styles.sigLabel}>Customer Signature</Text>
            {customerSigned && (
              <TouchableOpacity onPress={handleClearCustomer}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.signatureCanvas,
              customerSigned ? styles.signatureCanvasSigned : null,
            ]}
            onPress={() => setCustomerSigned(true)}
          >
            {customerSigned ? (
              <Text style={styles.signedText}>
                {customerName}
              </Text>
            ) : (
              <Text style={styles.canvasPlaceholder}>
                Tap to sign
              </Text>
            )}
          </TouchableOpacity>
          <View style={styles.nameRow}>
            <Text style={styles.nameLabel}>Name:</Text>
            <Text style={styles.nameValue}>{customerName}</Text>
          </View>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                customerSigned ? styles.statusDotGreen : styles.statusDotGray,
              ]}
            />
            <Text style={styles.statusText}>
              {customerSigned ? 'Signed' : 'Pending'}
            </Text>
          </View>
        </View>

        {/* Agreement Text */}
        <View style={styles.agreementSection}>
          <Text style={styles.agreementText}>
            By signing, both parties acknowledge that the kitchen exhaust
            cleaning service has been completed as described in the service
            report. The customer confirms the work area has been inspected and
            left in satisfactory condition.
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            techSigned && customerSigned
              ? styles.submitButtonReady
              : styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Submit Signatures</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0B1628',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7F96',
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sigLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1628',
  },
  clearText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },
  signatureCanvas: {
    height: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D9E6',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signatureCanvasSigned: {
    borderStyle: 'solid',
    borderColor: '#059669',
    backgroundColor: 'rgba(5,150,105,0.03)',
  },
  canvasPlaceholder: {
    fontSize: 16,
    color: '#6B7F96',
  },
  signedText: {
    fontSize: 28,
    fontStyle: 'italic',
    color: '#0B1628',
    fontWeight: '300',
  },
  nameRow: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
  },
  nameLabel: {
    fontSize: 13,
    color: '#6B7F96',
    marginRight: 6,
  },
  nameValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0B1628',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusDotGreen: {
    backgroundColor: '#059669',
  },
  statusDotGray: {
    backgroundColor: '#D1D9E6',
  },
  statusText: {
    fontSize: 12,
    color: '#6B7F96',
  },
  agreementSection: {
    paddingHorizontal: 16,
    marginTop: 28,
  },
  agreementText: {
    fontSize: 12,
    color: '#6B7F96',
    lineHeight: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
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
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonReady: {
    backgroundColor: '#1e4d6b',
  },
  submitButtonDisabled: {
    backgroundColor: '#B8C4D8',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
