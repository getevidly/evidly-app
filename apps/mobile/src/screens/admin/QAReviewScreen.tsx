import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type ReviewStatus = 'pending' | 'approved' | 'rejected';

interface QAReport {
  id: string;
  technician: string;
  customer: string;
  serviceDate: string;
  serviceType: string;
  photoCount: number;
  deficiencyCount: number;
  status: ReviewStatus;
}

/* ------------------------------------------------------------------ */
/*  Demo data                                                         */
/* ------------------------------------------------------------------ */

const INITIAL_REPORTS: QAReport[] = [
  {
    id: 'qa1',
    technician: 'Mike Rodriguez',
    customer: 'Marriott Downtown',
    serviceDate: 'Mar 14, 2026',
    serviceType: 'KEC',
    photoCount: 12,
    deficiencyCount: 0,
    status: 'pending',
  },
  {
    id: 'qa2',
    technician: 'Sarah Thompson',
    customer: 'Chipotle #4412',
    serviceDate: 'Mar 14, 2026',
    serviceType: 'KEC',
    photoCount: 8,
    deficiencyCount: 2,
    status: 'pending',
  },
  {
    id: 'qa3',
    technician: 'James Lee',
    customer: 'Wingstop #221',
    serviceDate: 'Mar 13, 2026',
    serviceType: 'FSI',
    photoCount: 15,
    deficiencyCount: 1,
    status: 'pending',
  },
  {
    id: 'qa4',
    technician: 'Ana Garcia',
    customer: 'Hilton Airport',
    serviceDate: 'Mar 13, 2026',
    serviceType: 'FPM',
    photoCount: 6,
    deficiencyCount: 3,
    status: 'pending',
  },
  {
    id: 'qa5',
    technician: 'Mike Rodriguez',
    customer: 'Panera Bread University',
    serviceDate: 'Mar 12, 2026',
    serviceType: 'KEC',
    photoCount: 10,
    deficiencyCount: 0,
    status: 'approved',
  },
  {
    id: 'qa6',
    technician: 'David Kim',
    customer: 'Shake Shack Mall',
    serviceDate: 'Mar 12, 2026',
    serviceType: 'KEC',
    photoCount: 9,
    deficiencyCount: 4,
    status: 'rejected',
  },
];

const TABS: { key: ReviewStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function QAReviewScreen() {
  const [activeTab, setActiveTab] = useState<ReviewStatus>('pending');
  const [reports, setReports] = useState<QAReport[]>(INITIAL_REPORTS);

  const filteredReports = reports.filter((r) => r.status === activeTab);

  const handleApprove = (report: QAReport) => {
    Alert.alert('Approve Report', `Approve QA report for ${report.customer}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: () =>
          setReports((prev) =>
            prev.map((r) =>
              r.id === report.id ? { ...r, status: 'approved' } : r,
            ),
          ),
      },
    ]);
  };

  const handleReject = (report: QAReport) => {
    Alert.alert('Reject Report', `Reject QA report for ${report.customer}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () =>
          setReports((prev) =>
            prev.map((r) =>
              r.id === report.id ? { ...r, status: 'rejected' } : r,
            ),
          ),
      },
    ]);
  };

  const handleView = (report: QAReport) => {
    Alert.alert(
      `${report.customer}`,
      `Technician: ${report.technician}\nService: ${report.serviceType}\nDate: ${report.serviceDate}\nPhotos: ${report.photoCount}\nDeficiencies: ${report.deficiencyCount}`,
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>QA Review</Text>
        <Text style={styles.headerSubtitle}>
          {reports.filter((r) => r.status === 'pending').length} reports pending
          review
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const count = reports.filter((r) => r.status === tab.key).length;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              <View
                style={[styles.tabBadge, isActive && styles.tabBadgeActive]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    isActive && styles.tabBadgeTextActive,
                  ]}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Report list */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
      >
        {filteredReports.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No {activeTab} reports
            </Text>
          </View>
        ) : (
          filteredReports.map((report) => (
            <View key={report.id} style={styles.card}>
              {/* Card header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.cardCustomer}>{report.customer}</Text>
                  <Text style={styles.cardTech}>{report.technician}</Text>
                </View>
                <View style={styles.serviceTypeBadge}>
                  <Text style={styles.serviceTypeText}>
                    {report.serviceType}
                  </Text>
                </View>
              </View>

              {/* Card meta */}
              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Date</Text>
                  <Text style={styles.metaValue}>{report.serviceDate}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Photos</Text>
                  <Text style={styles.metaValue}>{report.photoCount}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Deficiencies</Text>
                  <Text
                    style={[
                      styles.metaValue,
                      report.deficiencyCount > 0 && styles.metaValueWarn,
                    ]}
                  >
                    {report.deficiencyCount}
                  </Text>
                </View>
              </View>

              {/* Card actions */}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() => handleView(report)}
                >
                  <Text style={styles.viewBtnText}>View Report</Text>
                </TouchableOpacity>
                {report.status === 'pending' && (
                  <>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleReject(report)}
                    >
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApprove(report)}
                    >
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },

  /* Header */
  header: {
    backgroundColor: '#07111F',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#d4af37',
    marginTop: 4,
  },

  /* Tabs */
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D9E6',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#1e4d6b',
    borderColor: '#1e4d6b',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D5068',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabBadge: {
    backgroundColor: '#E8EDF5',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3D5068',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },

  /* List */
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },

  /* Empty */
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7F96',
  },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D1D9E6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0B1628',
  },
  cardTech: {
    fontSize: 13,
    color: '#6B7F96',
    marginTop: 2,
  },
  serviceTypeBadge: {
    backgroundColor: '#1e4d6b',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 8,
  },
  serviceTypeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Card meta */
  cardMeta: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: '#6B7F96',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0B1628',
    marginTop: 2,
  },
  metaValueWarn: {
    color: '#c0392b',
  },

  /* Card actions */
  cardActions: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
  },
  viewBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D9E6',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D5068',
  },
  rejectBtn: {
    borderWidth: 1,
    borderColor: '#c0392b',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#c0392b',
  },
  approveBtn: {
    backgroundColor: '#27ae60',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  approveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
