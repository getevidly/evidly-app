import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';

interface SafetyProcedure {
  id: string;
  title: string;
  steps: string[];
}

const SAFETY_PROCEDURES: SafetyProcedure[] = [
  {
    id: 'chemical',
    title: 'Chemical Spill',
    steps: [
      'Evacuate the immediate area',
      'Do NOT attempt to clean up without proper PPE',
      'Consult the SDS (Safety Data Sheet) for the chemical',
      'Contain the spill if safe to do so (absorbent pads)',
      'Ventilate the area — open doors and windows',
      'Call the company safety line immediately',
    ],
  },
  {
    id: 'fire',
    title: 'Fire',
    steps: [
      'Activate the nearest fire alarm pull station',
      'Call 911 immediately',
      'Use fire extinguisher ONLY if fire is small and contained',
      'Evacuate through nearest exit — do NOT use elevators',
      'Meet at the designated assembly point',
      'Call company emergency line after safe',
    ],
  },
  {
    id: 'injury',
    title: 'Injury / First Aid',
    steps: [
      'Ensure the scene is safe before approaching',
      'Call 911 if injury is serious (bleeding, burns, falls)',
      'Administer basic first aid if trained',
      'Do NOT move the injured person unless in immediate danger',
      'Document the incident — time, location, description',
      'Report to company safety line within 1 hour',
    ],
  },
];

export function EmergencyScreen() {
  const companyEmergency = '(800) 555-HOOD';
  const nearestHospital = 'Santa Monica UCLA Medical Center';
  const hospitalAddress = '1250 16th Street, Santa Monica, CA 90404';

  const handleCall = (number: string) => {
    Alert.alert('Call', `Would dial ${number} (demo).`);
  };

  const handleCall911 = () => {
    Alert.alert(
      'Emergency Call',
      'This would dial 911. Only use in a real emergency.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call 911',
          style: 'destructive',
          onPress: () => {
            Linking.openURL('tel:911').catch(() => {});
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Emergency Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergency</Text>
        <Text style={styles.headerSubtitle}>
          Safety contacts and procedures
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 911 Button */}
        <TouchableOpacity style={styles.emergencyButton} onPress={handleCall911}>
          <Text style={styles.emergencyButtonLabel}>EMERGENCY</Text>
          <Text style={styles.emergencyButtonNumber}>911</Text>
          <Text style={styles.emergencyButtonHint}>
            Tap to call emergency services
          </Text>
        </TouchableOpacity>

        {/* Company Emergency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Safety Line</Text>
          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => handleCall(companyEmergency)}
          >
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>HoodOps Emergency</Text>
              <Text style={styles.contactNumber}>{companyEmergency}</Text>
              <Text style={styles.contactAvailability}>
                Available 24/7
              </Text>
            </View>
            <View style={styles.callBadge}>
              <Text style={styles.callBadgeText}>Call</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Nearest Hospital */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearest Hospital</Text>
          <View style={styles.hospitalCard}>
            <Text style={styles.hospitalName}>{nearestHospital}</Text>
            <Text style={styles.hospitalAddress}>{hospitalAddress}</Text>
            <TouchableOpacity style={styles.directionsButton}>
              <Text style={styles.directionsButtonText}>Get Directions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Safety Procedures */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Procedures</Text>
          {SAFETY_PROCEDURES.map((proc) => (
            <View key={proc.id} style={styles.procedureCard}>
              <Text style={styles.procedureTitle}>{proc.title}</Text>
              {proc.steps.map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  header: {
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
    padding: 16,
    paddingBottom: 32,
  },
  emergencyButton: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  emergencyButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
  },
  emergencyButtonNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  emergencyButtonHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1628',
    marginBottom: 10,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0B1628',
  },
  contactNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e4d6b',
    marginTop: 2,
  },
  contactAvailability: {
    fontSize: 11,
    color: '#059669',
    marginTop: 2,
    fontWeight: '500',
  },
  callBadge: {
    backgroundColor: '#1e4d6b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  callBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  hospitalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  hospitalName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0B1628',
  },
  hospitalAddress: {
    fontSize: 13,
    color: '#6B7F96',
    marginTop: 4,
  },
  directionsButton: {
    marginTop: 12,
    backgroundColor: 'rgba(30,77,107,0.08)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  directionsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e4d6b',
  },
  procedureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  procedureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1628',
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(30,77,107,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e4d6b',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#3D5068',
    lineHeight: 19,
  },
});
