import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReportStatus = 'in_progress' | 'completed' | 'approved' | 'sent';
type ServiceType = 'KEC Cleaning' | 'Hood Inspection' | 'Filter Exchange';

interface ServiceReport {
  id: string;
  certificate_id: string;
  customer_name: string;
  service_date: string;
  service_type: ServiceType;
  status: ReportStatus;
  systems_count: number;
  deficiencies_count: number;
  photos_count: number;
}

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

const DEMO_REPORTS: ServiceReport[] = [
  {
    id: 'sr1',
    certificate_id: 'SR-2026-0441',
    customer_name: 'Oceanview Bistro',
    service_date: 'Mar 14, 2026',
    service_type: 'KEC Cleaning',
    status: 'in_progress',
    systems_count: 2,
    deficiencies_count: 3,
    photos_count: 18,
  },
  {
    id: 'sr2',
    certificate_id: 'SR-2026-0440',
    customer_name: 'Harbor Grill',
    service_date: 'Mar 12, 2026',
    service_type: 'Hood Inspection',
    status: 'completed',
    systems_count: 1,
    deficiencies_count: 1,
    photos_count: 12,
  },
  {
    id: 'sr3',
    certificate_id: 'SR-2026-0438',
    customer_name: 'Sunset Sushi',
    service_date: 'Mar 10, 2026',
    service_type: 'Filter Exchange',
    status: 'sent',
    systems_count: 3,
    deficiencies_count: 0,
    photos_count: 24,
  },
];

const FILTER_TABS: { key: 'all' | ReportStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'sent', label: 'Sent' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusColor(status: ReportStatus): { bg: string; text: string } {
  switch (status) {
    case 'in_progress':
      return { bg: 'rgba(212,175,55,0.15)', text: '#b8960f' };
    case 'completed':
      return { bg: 'rgba(5,150,105,0.12)', text: '#059669' };
    case 'approved':
      return { bg: 'rgba(30,77,107,0.12)', text: '#1e4d6b' };
    case 'sent':
      return { bg: 'rgba(107,127,150,0.12)', text: '#6B7F96' };
  }
}

function getStatusLabel(status: ReportStatus): string {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'approved':
      return 'Approved';
    case 'sent':
      return 'Sent';
  }
}

function getServiceTypeColor(type: ServiceType): { bg: string; text: string } {
  switch (type) {
    case 'KEC Cleaning':
      return { bg: 'rgba(30,77,107,0.10)', text: '#1e4d6b' };
    case 'Hood Inspection':
      return { bg: 'rgba(212,175,55,0.12)', text: '#b8960f' };
    case 'Filter Exchange':
      return { bg: 'rgba(5,150,105,0.10)', text: '#059669' };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ServiceReportScreen() {
  const [activeFilter, setActiveFilter] = useState<'all' | ReportStatus>('all');

  const filteredReports =
    activeFilter === 'all'
      ? DEMO_REPORTS
      : DEMO_REPORTS.filter((r) => r.status === activeFilter);

  const handleNewReport = () => {
    Alert.alert(
      'New Report',
      'Start report from a job. Navigate to a job and tap "Generate Report" to begin.',
    );
  };

  const handleReportTap = (report: ServiceReport) => {
    Alert.alert(
      'Open Report',
      `Navigating to ReportBuilder for ${report.certificate_id} (demo).`,
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Service Reports</Text>
            <Text style={styles.headerSubtitle}>
              {DEMO_REPORTS.length} reports
            </Text>
          </View>
          <TouchableOpacity style={styles.newButton} onPress={handleNewReport}>
            <Text style={styles.newButtonText}>+ New Report</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setActiveFilter(tab.key)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isActive && styles.filterTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Report List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredReports.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{'📋'}</Text>
            <Text style={styles.emptyText}>No reports match this filter</Text>
          </View>
        )}

        {filteredReports.map((report) => {
          const statusColors = getStatusColor(report.status);
          const serviceColors = getServiceTypeColor(report.service_type);

          return (
            <TouchableOpacity
              key={report.id}
              style={styles.reportCard}
              onPress={() => handleReportTap(report)}
              activeOpacity={0.7}
            >
              {/* Top Row: Certificate + Status */}
              <View style={styles.cardTopRow}>
                <Text style={styles.certificateId}>
                  {report.certificate_id}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColors.bg },
                  ]}
                >
                  <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                    {getStatusLabel(report.status)}
                  </Text>
                </View>
              </View>

              {/* Customer + Date */}
              <Text style={styles.customerName}>{report.customer_name}</Text>
              <View style={styles.dateServiceRow}>
                <Text style={styles.serviceDate}>{report.service_date}</Text>
                <View
                  style={[
                    styles.serviceTypeBadge,
                    { backgroundColor: serviceColors.bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.serviceTypeBadgeText,
                      { color: serviceColors.text },
                    ]}
                  >
                    {report.service_type}
                  </Text>
                </View>
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{report.systems_count}</Text>
                  <Text style={styles.statLabel}>Systems</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text
                    style={[
                      styles.statValue,
                      report.deficiencies_count > 0 && styles.statValueWarning,
                    ]}
                  >
                    {report.deficiencies_count}
                  </Text>
                  <Text style={styles.statLabel}>Deficiencies</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{report.photos_count}</Text>
                  <Text style={styles.statLabel}>Photos</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  newButton: {
    backgroundColor: '#d4af37',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  newButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Filter bar
  filterBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F4F6FA',
    marginRight: 4,
  },
  filterTabActive: {
    backgroundColor: '#1e4d6b',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7F96',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },

  // Content
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7F96',
  },

  // Report card
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#1e4d6b',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  certificateId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1628',
    letterSpacing: 0.3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3D5068',
    marginTop: 8,
  },
  dateServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 10,
  },
  serviceDate: {
    fontSize: 12,
    color: '#6B7F96',
  },
  serviceTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  serviceTypeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E8EDF5',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0B1628',
  },
  statValueWarning: {
    color: '#DC2626',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7F96',
    marginTop: 2,
  },
});
