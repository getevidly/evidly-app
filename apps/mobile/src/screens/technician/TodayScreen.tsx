import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

const DEMO_JOBS = [
  {
    id: 'job-001',
    customer: 'Oceanview Bistro',
    address: '1420 Pacific Coast Hwy',
    serviceType: 'KEC Cleaning',
    time: '8:00 AM',
    status: 'in_progress' as const,
    progress: 40,
  },
  {
    id: 'job-002',
    customer: 'Harbor Grill',
    address: '310 Marina Dr, Suite B',
    serviceType: 'Hood Inspection',
    time: '11:30 AM',
    status: 'upcoming' as const,
    progress: 0,
  },
  {
    id: 'job-003',
    customer: 'Sunset Sushi',
    address: '892 Hillcrest Blvd',
    serviceType: 'Filter Exchange',
    time: '2:00 PM',
    status: 'upcoming' as const,
    progress: 0,
  },
];

const DEMO_STATS = {
  totalJobs: 3,
  photosToday: 12,
  deficiencies: 1,
};

export function TodayScreen() {
  const [clockedIn, setClockedIn] = useState(true);
  const currentTime = '7:42 AM';

  const currentJob = DEMO_JOBS.find((j) => j.status === 'in_progress');
  const upcomingJobs = DEMO_JOBS.filter((j) => j.status === 'upcoming');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Welcome Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Good Morning</Text>
              <Text style={styles.techName}>Marcus Rivera</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.clockButton,
                clockedIn ? styles.clockOutButton : styles.clockInButton,
              ]}
              onPress={() => setClockedIn(!clockedIn)}
            >
              <Text style={styles.clockButtonText}>
                {clockedIn ? 'Clock Out' : 'Clock In'}
              </Text>
            </TouchableOpacity>
          </View>
          {clockedIn && (
            <Text style={styles.clockStatus}>
              Clocked in since {currentTime}
            </Text>
          )}
        </View>

        {/* Today's Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{DEMO_STATS.totalJobs}</Text>
            <Text style={styles.statLabel}>Jobs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{DEMO_STATS.photosToday}</Text>
            <Text style={styles.statLabel}>Photos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{DEMO_STATS.deficiencies}</Text>
            <Text style={styles.statLabel}>Deficiencies</Text>
          </View>
        </View>

        {/* Current Job */}
        {currentJob && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Job</Text>
            <TouchableOpacity style={styles.currentJobCard}>
              <View style={styles.currentJobHeader}>
                <Text style={styles.currentJobCustomer}>
                  {currentJob.customer}
                </Text>
                <View style={styles.inProgressBadge}>
                  <Text style={styles.inProgressBadgeText}>In Progress</Text>
                </View>
              </View>
              <Text style={styles.currentJobAddress}>
                {currentJob.address}
              </Text>
              <Text style={styles.currentJobService}>
                {currentJob.serviceType}
              </Text>
              <View style={styles.progressBarOuter}>
                <View
                  style={[
                    styles.progressBarInner,
                    { width: `${currentJob.progress}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {currentJob.progress}% Complete
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Upcoming Jobs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          {upcomingJobs.map((job) => (
            <TouchableOpacity key={job.id} style={styles.upcomingJobCard}>
              <View style={styles.upcomingJobLeft}>
                <Text style={styles.upcomingJobTime}>{job.time}</Text>
              </View>
              <View style={styles.upcomingJobRight}>
                <Text style={styles.upcomingJobCustomer}>{job.customer}</Text>
                <Text style={styles.upcomingJobAddress}>{job.address}</Text>
                <View style={styles.serviceTypeBadge}>
                  <Text style={styles.serviceTypeBadgeText}>
                    {job.serviceType}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
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
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    backgroundColor: '#1e4d6b',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  techName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  clockButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clockInButton: {
    backgroundColor: '#d4af37',
  },
  clockOutButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  clockButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  clockStatus: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0B1628',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7F96',
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1628',
    marginBottom: 12,
  },
  currentJobCard: {
    backgroundColor: '#0B1628',
    borderRadius: 14,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#d4af37',
  },
  currentJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentJobCustomer: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inProgressBadge: {
    backgroundColor: 'rgba(212,175,55,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  inProgressBadgeText: {
    color: '#d4af37',
    fontSize: 11,
    fontWeight: '600',
  },
  currentJobAddress: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
  },
  currentJobService: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  progressBarOuter: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressBarInner: {
    height: 6,
    backgroundColor: '#d4af37',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
  },
  upcomingJobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  upcomingJobLeft: {
    width: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E8EDF5',
    marginRight: 14,
  },
  upcomingJobTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e4d6b',
  },
  upcomingJobRight: {
    flex: 1,
  },
  upcomingJobCustomer: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0B1628',
  },
  upcomingJobAddress: {
    fontSize: 12,
    color: '#6B7F96',
    marginTop: 2,
  },
  serviceTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(30,77,107,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 6,
  },
  serviceTypeBadgeText: {
    fontSize: 11,
    color: '#1e4d6b',
    fontWeight: '500',
  },
});
