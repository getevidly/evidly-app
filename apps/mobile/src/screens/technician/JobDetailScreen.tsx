import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

type StepStatus = 'completed' | 'active' | 'pending';

interface ProgressStep {
  id: string;
  label: string;
  status: StepStatus;
}

const DEMO_JOB = {
  id: 'job-001',
  customer: 'Oceanview Bistro',
  contactName: 'Maria Santos',
  contactPhone: '(310) 555-0147',
  address: '1420 Pacific Coast Hwy, Santa Monica, CA 90401',
  serviceType: 'KEC Cleaning',
  scheduledTime: '8:00 AM - 11:00 AM',
  systemType: 'Type I Hood (12ft)',
  notes: 'Access through rear kitchen door. Ask for Maria.',
  lastServiceDate: 'Jan 15, 2026',
};

const INITIAL_STEPS: ProgressStep[] = [
  { id: 'arrive', label: 'Arrive', status: 'completed' },
  { id: 'pre-inspect', label: 'Pre-Inspection', status: 'active' },
  { id: 'clean', label: 'Clean', status: 'pending' },
  { id: 'post-inspect', label: 'Post-Inspection', status: 'pending' },
  { id: 'report', label: 'Report', status: 'pending' },
];

export function JobDetailScreen() {
  const [steps] = useState<ProgressStep[]>(INITIAL_STEPS);
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const progress = Math.round((completedCount / steps.length) * 100);

  const handleAction = (action: string) => {
    Alert.alert('Demo', `${action} tapped. This is a demo placeholder.`);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.serviceType}>{DEMO_JOB.serviceType}</Text>
          <Text style={styles.customerName}>{DEMO_JOB.customer}</Text>
          <Text style={styles.address}>{DEMO_JOB.address}</Text>
          <Text style={styles.scheduledTime}>{DEMO_JOB.scheduledTime}</Text>
        </View>

        {/* Progress Steps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress</Text>
          <View style={styles.progressCard}>
            <View style={styles.stepsRow}>
              {steps.map((step, idx) => (
                <View key={step.id} style={styles.stepContainer}>
                  {idx > 0 && (
                    <View
                      style={[
                        styles.stepConnector,
                        step.status === 'completed' ||
                        step.status === 'active'
                          ? styles.stepConnectorActive
                          : null,
                      ]}
                    />
                  )}
                  <View
                    style={[
                      styles.stepCircle,
                      step.status === 'completed'
                        ? styles.stepCompleted
                        : step.status === 'active'
                          ? styles.stepActive
                          : styles.stepPending,
                    ]}
                  >
                    {step.status === 'completed' && (
                      <Text style={styles.stepCheck}>{'✓'}</Text>
                    )}
                    {step.status === 'active' && (
                      <View style={styles.stepActiveDot} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      step.status === 'active' ? styles.stepLabelActive : null,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.progressPercent}>{progress}% Complete</Text>
          </View>
        </View>

        {/* Job Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Details</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Contact</Text>
              <Text style={styles.detailValue}>{DEMO_JOB.contactName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={[styles.detailValue, styles.phoneLink]}>
                {DEMO_JOB.contactPhone}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>System</Text>
              <Text style={styles.detailValue}>{DEMO_JOB.systemType}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last Service</Text>
              <Text style={styles.detailValue}>
                {DEMO_JOB.lastServiceDate}
              </Text>
            </View>
            {DEMO_JOB.notes && (
              <View style={styles.notesRow}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.notesText}>{DEMO_JOB.notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAction('Start Checklist')}
            >
              <Text style={styles.actionEmoji}>{'📋'}</Text>
              <Text style={styles.actionLabel}>Start Checklist</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAction('Take Photos')}
            >
              <Text style={styles.actionEmoji}>{'📸'}</Text>
              <Text style={styles.actionLabel}>Take Photos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAction('Log Deficiency')}
            >
              <Text style={styles.actionEmoji}>{'⚠️'}</Text>
              <Text style={styles.actionLabel}>Log Deficiency</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAction('Generate Report')}
            >
              <Text style={styles.actionEmoji}>{'📄'}</Text>
              <Text style={styles.actionLabel}>Generate Report</Text>
            </TouchableOpacity>
          </View>
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
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    backgroundColor: '#1e4d6b',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  serviceType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d4af37',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  customerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  address: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  scheduledTime: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1628',
    marginBottom: 10,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  stepConnector: {
    position: 'absolute',
    top: 14,
    right: '50%',
    left: '-50%',
    height: 2,
    backgroundColor: '#E8EDF5',
    zIndex: -1,
  },
  stepConnectorActive: {
    backgroundColor: '#1e4d6b',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepCompleted: {
    backgroundColor: '#1e4d6b',
  },
  stepActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  stepPending: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D9E6',
  },
  stepCheck: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  stepActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d4af37',
  },
  stepLabel: {
    fontSize: 10,
    color: '#6B7F96',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#d4af37',
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 12,
    color: '#6B7F96',
    textAlign: 'center',
    marginTop: 14,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7F96',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0B1628',
  },
  phoneLink: {
    color: '#1e4d6b',
  },
  notesRow: {
    paddingVertical: 10,
  },
  notesText: {
    fontSize: 13,
    color: '#3D5068',
    marginTop: 4,
    lineHeight: 18,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  actionEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0B1628',
  },
});
