import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';

type FilterTab = 'today' | 'week' | 'all';
type JobStatus = 'completed' | 'in_progress' | 'scheduled' | 'cancelled';

interface Job {
  id: string;
  customer: string;
  address: string;
  serviceType: string;
  status: JobStatus;
  time: string;
  date: string;
}

const STATUS_CONFIG: Record<JobStatus, { color: string; bg: string; label: string }> = {
  completed: { color: '#059669', bg: 'rgba(5,150,105,0.1)', label: 'Completed' },
  in_progress: { color: '#d4af37', bg: 'rgba(212,175,55,0.1)', label: 'In Progress' },
  scheduled: { color: '#1e4d6b', bg: 'rgba(30,77,107,0.1)', label: 'Scheduled' },
  cancelled: { color: '#6B7F96', bg: 'rgba(107,127,150,0.1)', label: 'Cancelled' },
};

const SERVICE_COLORS: Record<string, string> = {
  'KEC Cleaning': '#1e4d6b',
  'Hood Inspection': '#d4af37',
  'Filter Exchange': '#059669',
  'Fire Suppression': '#DC2626',
  'Duct Cleaning': '#7C3AED',
};

const DEMO_JOBS: Job[] = [
  { id: 'j1', customer: 'Oceanview Bistro', address: '1420 Pacific Coast Hwy', serviceType: 'KEC Cleaning', status: 'in_progress', time: '8:00 AM', date: 'Today' },
  { id: 'j2', customer: 'Harbor Grill', address: '310 Marina Dr, Suite B', serviceType: 'Hood Inspection', time: '11:30 AM', status: 'scheduled', date: 'Today' },
  { id: 'j3', customer: 'Sunset Sushi', address: '892 Hillcrest Blvd', serviceType: 'Filter Exchange', time: '2:00 PM', status: 'scheduled', date: 'Today' },
  { id: 'j4', customer: 'Campus Dining Hall', address: '500 University Ave', serviceType: 'KEC Cleaning', time: '7:00 AM', status: 'scheduled', date: 'Tomorrow' },
  { id: 'j5', customer: 'Downtown Pizza Co', address: '221 Main St', serviceType: 'Fire Suppression', time: '10:00 AM', status: 'scheduled', date: 'Mar 17' },
  { id: 'j6', customer: 'Bayshore Cafe', address: '88 Bayshore Blvd', serviceType: 'Duct Cleaning', time: '8:30 AM', status: 'completed', date: 'Mar 12' },
  { id: 'j7', customer: 'Golden Dragon', address: '456 Canton St', serviceType: 'KEC Cleaning', time: '6:00 AM', status: 'completed', date: 'Mar 11' },
  { id: 'j8', customer: 'Hilltop BBQ', address: '1900 Summit Rd', serviceType: 'Hood Inspection', time: '9:00 AM', status: 'cancelled', date: 'Mar 10' },
];

export function JobsListScreen() {
  const [activeTab, setActiveTab] = useState<FilterTab>('today');
  const [refreshing, setRefreshing] = useState(false);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'all', label: 'All' },
  ];

  const filteredJobs = DEMO_JOBS.filter((job) => {
    if (activeTab === 'today') return job.date === 'Today';
    if (activeTab === 'week')
      return ['Today', 'Tomorrow', 'Mar 17'].includes(job.date);
    return true;
  });

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Jobs</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key ? styles.tabActive : null,
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key ? styles.tabTextActive : null,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Job List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No jobs for this period</Text>
          </View>
        ) : (
          filteredJobs.map((job) => {
            const statusCfg = STATUS_CONFIG[job.status];
            const serviceColor =
              SERVICE_COLORS[job.serviceType] || '#1e4d6b';
            return (
              <TouchableOpacity key={job.id} style={styles.jobCard}>
                <View style={styles.jobCardTop}>
                  <View style={styles.jobInfo}>
                    <Text style={styles.jobCustomer}>{job.customer}</Text>
                    <Text style={styles.jobAddress}>{job.address}</Text>
                  </View>
                  <View style={styles.jobTime}>
                    <Text style={styles.jobTimeText}>{job.time}</Text>
                    <Text style={styles.jobDateText}>{job.date}</Text>
                  </View>
                </View>
                <View style={styles.jobCardBottom}>
                  <View
                    style={[
                      styles.serviceTypeBadge,
                      { backgroundColor: `${serviceColor}15` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.serviceTypeBadgeText,
                        { color: serviceColor },
                      ]}
                    >
                      {job.serviceType}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusCfg.bg },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: statusCfg.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: statusCfg.color },
                      ]}
                    >
                      {statusCfg.label}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0B1628',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(30,77,107,0.05)',
  },
  tabActive: {
    backgroundColor: '#1e4d6b',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D5068',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7F96',
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  jobCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  jobInfo: {
    flex: 1,
    marginRight: 12,
  },
  jobCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0B1628',
  },
  jobAddress: {
    fontSize: 12,
    color: '#6B7F96',
    marginTop: 2,
  },
  jobTime: {
    alignItems: 'flex-end',
  },
  jobTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e4d6b',
  },
  jobDateText: {
    fontSize: 11,
    color: '#6B7F96',
    marginTop: 2,
  },
  jobCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
  },
  serviceTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  serviceTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
