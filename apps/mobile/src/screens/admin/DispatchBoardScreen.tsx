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

type ServiceType = 'KEC' | 'FSI' | 'FPM';

interface Job {
  id: string;
  customer: string;
  address: string;
  serviceType: ServiceType;
  time: string;
  techId: string | null;
}

interface Technician {
  id: string;
  name: string;
  initials: string;
}

/* ------------------------------------------------------------------ */
/*  Demo data                                                         */
/* ------------------------------------------------------------------ */

const SERVICE_COLORS: Record<ServiceType, string> = {
  KEC: '#1e4d6b',
  FSI: '#d4af37',
  FPM: '#2a6a8f',
};

const TECHNICIANS: Technician[] = [
  { id: 't1', name: 'Mike Rodriguez', initials: 'MR' },
  { id: 't2', name: 'Sarah Thompson', initials: 'ST' },
  { id: 't3', name: 'James Lee', initials: 'JL' },
  { id: 't4', name: 'Ana Garcia', initials: 'AG' },
];

const INITIAL_JOBS: Job[] = [
  { id: 'j1', customer: 'Marriott Downtown', address: '100 Main St', serviceType: 'KEC', time: '8:00 AM', techId: 't1' },
  { id: 'j2', customer: 'Hilton Airport', address: '500 Airport Blvd', serviceType: 'FSI', time: '10:30 AM', techId: 't1' },
  { id: 'j3', customer: 'Chipotle #4412', address: '220 Oak Ave', serviceType: 'KEC', time: '8:30 AM', techId: 't2' },
  { id: 'j4', customer: 'Panera Bread University', address: '800 College Dr', serviceType: 'FPM', time: '1:00 PM', techId: 't2' },
  { id: 'j5', customer: 'Wingstop #221', address: '340 Elm St', serviceType: 'FSI', time: '9:00 AM', techId: 't3' },
  { id: 'j6', customer: 'Shake Shack Mall', address: '1200 Mall Ring', serviceType: 'KEC', time: '11:00 AM', techId: 't3' },
  { id: 'j7', customer: 'Subway Plaza', address: '55 Plaza Ln', serviceType: 'FPM', time: '2:00 PM', techId: null },
  { id: 'j8', customer: 'Taco Bell #88', address: '900 Hwy 9', serviceType: 'KEC', time: '3:30 PM', techId: null },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function DispatchBoardScreen() {
  const [jobs, setJobs] = useState<Job[]>(INITIAL_JOBS);

  const assignedJobs = (techId: string) =>
    jobs.filter((j) => j.techId === techId);

  const unassignedJobs = jobs.filter((j) => j.techId === null);

  const handleReassign = (job: Job) => {
    Alert.alert(
      'Reassign Job',
      `Reassign "${job.customer}" to another technician?`,
      [
        { text: 'Cancel', style: 'cancel' },
        ...TECHNICIANS.filter((t) => t.id !== job.techId).map((t) => ({
          text: t.name,
          onPress: () => {
            setJobs((prev) =>
              prev.map((j) => (j.id === job.id ? { ...j, techId: t.id } : j)),
            );
          },
        })),
      ],
    );
  };

  const handleAssign = (job: Job) => {
    Alert.alert(
      'Assign Job',
      `Assign "${job.customer}" to a technician`,
      [
        { text: 'Cancel', style: 'cancel' },
        ...TECHNICIANS.map((t) => ({
          text: t.name,
          onPress: () => {
            setJobs((prev) =>
              prev.map((j) => (j.id === job.id ? { ...j, techId: t.id } : j)),
            );
          },
        })),
      ],
    );
  };

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dispatch Board</Text>
        <Text style={styles.headerDate}>{todayLabel}</Text>
      </View>

      {/* Service type legend */}
      <View style={styles.legend}>
        {(['KEC', 'FSI', 'FPM'] as ServiceType[]).map((st) => (
          <View key={st} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: SERVICE_COLORS[st] }]} />
            <Text style={styles.legendLabel}>{st}</Text>
          </View>
        ))}
      </View>

      {/* Technician rows */}
      {TECHNICIANS.map((tech) => {
        const techJobs = assignedJobs(tech.id);
        return (
          <View key={tech.id} style={styles.techRow}>
            <View style={styles.techHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{tech.initials}</Text>
              </View>
              <Text style={styles.techName}>{tech.name}</Text>
              <Text style={styles.jobCount}>
                {techJobs.length} job{techJobs.length !== 1 ? 's' : ''}
              </Text>
            </View>
            {techJobs.length === 0 ? (
              <Text style={styles.noJobs}>No jobs assigned</Text>
            ) : (
              techJobs.map((job) => (
                <View
                  key={job.id}
                  style={[
                    styles.jobBlock,
                    { borderLeftColor: SERVICE_COLORS[job.serviceType] },
                  ]}
                >
                  <View style={styles.jobInfo}>
                    <View style={styles.jobTopRow}>
                      <View
                        style={[
                          styles.serviceTag,
                          { backgroundColor: SERVICE_COLORS[job.serviceType] },
                        ]}
                      >
                        <Text style={styles.serviceTagText}>
                          {job.serviceType}
                        </Text>
                      </View>
                      <Text style={styles.jobTime}>{job.time}</Text>
                    </View>
                    <Text style={styles.jobCustomer}>{job.customer}</Text>
                    <Text style={styles.jobAddress}>{job.address}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.reassignBtn}
                    onPress={() => handleReassign(job)}
                  >
                    <Text style={styles.reassignBtnText}>Reassign</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        );
      })}

      {/* Unassigned jobs */}
      {unassignedJobs.length > 0 && (
        <View style={styles.unassignedSection}>
          <Text style={styles.unassignedTitle}>
            Unassigned Jobs ({unassignedJobs.length})
          </Text>
          {unassignedJobs.map((job) => (
            <View
              key={job.id}
              style={[
                styles.jobBlock,
                styles.unassignedBlock,
                { borderLeftColor: SERVICE_COLORS[job.serviceType] },
              ]}
            >
              <View style={styles.jobInfo}>
                <View style={styles.jobTopRow}>
                  <View
                    style={[
                      styles.serviceTag,
                      { backgroundColor: SERVICE_COLORS[job.serviceType] },
                    ]}
                  >
                    <Text style={styles.serviceTagText}>
                      {job.serviceType}
                    </Text>
                  </View>
                  <Text style={styles.jobTime}>{job.time}</Text>
                </View>
                <Text style={styles.jobCustomer}>{job.customer}</Text>
                <Text style={styles.jobAddress}>{job.address}</Text>
              </View>
              <TouchableOpacity
                style={[styles.reassignBtn, styles.assignBtn]}
                onPress={() => handleAssign(job)}
              >
                <Text style={[styles.reassignBtnText, styles.assignBtnText]}>
                  Assign
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
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
  content: {
    paddingBottom: 32,
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
  headerDate: {
    fontSize: 14,
    color: '#6B7F96',
    marginTop: 4,
  },

  /* Legend */
  legend: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D5068',
  },

  /* Technician row */
  techRow: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D1D9E6',
  },
  techHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e4d6b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  techName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0B1628',
  },
  jobCount: {
    fontSize: 12,
    color: '#6B7F96',
  },
  noJobs: {
    fontSize: 13,
    color: '#6B7F96',
    fontStyle: 'italic',
    paddingLeft: 46,
  },

  /* Job block */
  jobBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6FA',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 4,
  },
  jobInfo: {
    flex: 1,
  },
  jobTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  serviceTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  jobTime: {
    fontSize: 12,
    color: '#6B7F96',
  },
  jobCustomer: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0B1628',
  },
  jobAddress: {
    fontSize: 12,
    color: '#6B7F96',
    marginTop: 2,
  },
  reassignBtn: {
    borderWidth: 1,
    borderColor: '#1e4d6b',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  reassignBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e4d6b',
  },

  /* Assign (unassigned) */
  assignBtn: {
    backgroundColor: '#1e4d6b',
    borderColor: '#1e4d6b',
  },
  assignBtnText: {
    color: '#FFFFFF',
  },

  /* Unassigned section */
  unassignedSection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  unassignedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c0392b',
    marginBottom: 8,
  },
  unassignedBlock: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D9E6',
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
});
