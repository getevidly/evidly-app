import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

type ReportType = 'service' | 'inspection';

const DEMO_SUMMARY = {
  customerName: 'Oceanview Bistro',
  serviceDate: 'Mar 14, 2026',
  techName: 'Marcus Rivera',
  checklistsCompleted: 3,
  checklistTotal: 3,
  photosTaken: 18,
  deficienciesFound: 2,
  criticalCount: 1,
  majorCount: 0,
  minorCount: 1,
  systemsCleaned: ['Type I Hood (12ft)', 'Ductwork - 24ft horizontal', 'Exhaust Fan - Roof Unit #1'],
};

export function ReportGeneratorScreen() {
  const [reportType, setReportType] = useState<ReportType>('service');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      Alert.alert(
        'Report Generated',
        `${reportType === 'service' ? 'Service' : 'Inspection'} report created successfully (demo).`,
      );
    }, 1500);
  };

  const handleShare = () => {
    Alert.alert('Share', 'Share/email report (demo placeholder).');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Generate Report</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Report Type Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[
                styles.typeCard,
                reportType === 'service' ? styles.typeCardActive : null,
              ]}
              onPress={() => setReportType('service')}
            >
              <Text style={styles.typeEmoji}>{'🔧'}</Text>
              <Text
                style={[
                  styles.typeLabel,
                  reportType === 'service' ? styles.typeLabelActive : null,
                ]}
              >
                Service Report
              </Text>
              <Text style={styles.typeDesc}>
                Full cleaning service documentation
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeCard,
                reportType === 'inspection' ? styles.typeCardActive : null,
              ]}
              onPress={() => setReportType('inspection')}
            >
              <Text style={styles.typeEmoji}>{'🔍'}</Text>
              <Text
                style={[
                  styles.typeLabel,
                  reportType === 'inspection' ? styles.typeLabelActive : null,
                ]}
              >
                Inspection Report
              </Text>
              <Text style={styles.typeDesc}>
                Condition assessment only
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preview: Job Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Info</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Customer</Text>
              <Text style={styles.previewValue}>
                {DEMO_SUMMARY.customerName}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Service Date</Text>
              <Text style={styles.previewValue}>
                {DEMO_SUMMARY.serviceDate}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Technician</Text>
              <Text style={styles.previewValue}>{DEMO_SUMMARY.techName}</Text>
            </View>
          </View>
        </View>

        {/* Preview: Completion Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completion Summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {DEMO_SUMMARY.checklistsCompleted}/
                {DEMO_SUMMARY.checklistTotal}
              </Text>
              <Text style={styles.statLabel}>Checklists</Text>
              <View style={styles.statBadgeGreen}>
                <Text style={styles.statBadgeText}>Complete</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{DEMO_SUMMARY.photosTaken}</Text>
              <Text style={styles.statLabel}>Photos</Text>
              <View style={styles.statBadgeBlue}>
                <Text style={styles.statBadgeText}>Captured</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {DEMO_SUMMARY.deficienciesFound}
              </Text>
              <Text style={styles.statLabel}>Deficiencies</Text>
              <View
                style={
                  DEMO_SUMMARY.criticalCount > 0
                    ? styles.statBadgeRed
                    : styles.statBadgeGreen
                }
              >
                <Text style={styles.statBadgeText}>
                  {DEMO_SUMMARY.criticalCount} Critical
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Systems Cleaned */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Systems Serviced</Text>
          <View style={styles.previewCard}>
            {DEMO_SUMMARY.systemsCleaned.map((sys, idx) => (
              <View key={idx} style={styles.systemRow}>
                <View style={styles.checkCircle}>
                  <Text style={styles.checkMark}>{'✓'}</Text>
                </View>
                <Text style={styles.systemName}>{sys}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.generateButton,
            generating ? styles.generatingButton : null,
          ]}
          onPress={handleGenerate}
          disabled={generating}
        >
          <Text style={styles.generateButtonText}>
            {generating ? 'Generating...' : 'Generate PDF Report'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>Share / Email</Text>
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
  scrollContent: {
    paddingBottom: 140,
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
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8EDF5',
  },
  typeCardActive: {
    borderColor: '#1e4d6b',
    backgroundColor: 'rgba(30,77,107,0.04)',
  },
  typeEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3D5068',
  },
  typeLabelActive: {
    color: '#1e4d6b',
  },
  typeDesc: {
    fontSize: 11,
    color: '#6B7F96',
    marginTop: 4,
    textAlign: 'center',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
  },
  previewLabel: {
    fontSize: 13,
    color: '#6B7F96',
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0B1628',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0B1628',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7F96',
    marginTop: 2,
  },
  statBadgeGreen: {
    backgroundColor: 'rgba(5,150,105,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  statBadgeBlue: {
    backgroundColor: 'rgba(30,77,107,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  statBadgeRed: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  statBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0B1628',
  },
  systemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  systemName: {
    fontSize: 14,
    color: '#0B1628',
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
    gap: 8,
  },
  generateButton: {
    backgroundColor: '#1e4d6b',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  generatingButton: {
    opacity: 0.7,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shareButton: {
    backgroundColor: 'rgba(30,77,107,0.08)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e4d6b',
  },
});
