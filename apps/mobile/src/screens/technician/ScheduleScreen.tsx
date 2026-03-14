import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

interface ScheduleJob {
  id: string;
  customer: string;
  serviceType: string;
  time: string;
  duration: string;
  day: number; // 0=Mon, 1=Tue, ...
  color: string;
}

const SERVICE_COLORS: Record<string, string> = {
  'KEC Cleaning': '#1e4d6b',
  'Hood Inspection': '#d4af37',
  'Filter Exchange': '#059669',
  'Fire Suppression': '#DC2626',
  'Duct Cleaning': '#7C3AED',
};

const DEMO_JOBS: ScheduleJob[] = [
  { id: 's1', customer: 'Oceanview Bistro', serviceType: 'KEC Cleaning', time: '8:00 AM', duration: '3h', day: 0, color: SERVICE_COLORS['KEC Cleaning'] },
  { id: 's2', customer: 'Harbor Grill', serviceType: 'Hood Inspection', time: '1:00 PM', duration: '1.5h', day: 0, color: SERVICE_COLORS['Hood Inspection'] },
  { id: 's3', customer: 'Campus Dining Hall', serviceType: 'KEC Cleaning', time: '7:00 AM', duration: '4h', day: 1, color: SERVICE_COLORS['KEC Cleaning'] },
  { id: 's4', customer: 'Sunset Sushi', serviceType: 'Filter Exchange', time: '9:00 AM', duration: '1h', day: 3, color: SERVICE_COLORS['Filter Exchange'] },
  { id: 's5', customer: 'Downtown Pizza Co', serviceType: 'Fire Suppression', time: '10:00 AM', duration: '2h', day: 4, color: SERVICE_COLORS['Fire Suppression'] },
];

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ScheduleScreen() {
  const [weekOffset, setWeekOffset] = useState(0);

  const getWeekDates = () => {
    const today = new Date();
    const monday = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(today.getDate() + diff + weekOffset * 7);

    return DAY_NAMES.map((name, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      return {
        name,
        date: d.getDate(),
        month: d.toLocaleString('default', { month: 'short' }),
        isToday:
          d.getDate() === today.getDate() &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear(),
      };
    });
  };

  const weekDates = getWeekDates();
  const weekLabel = `${weekDates[0].month} ${weekDates[0].date} - ${weekDates[6].month} ${weekDates[6].date}`;

  return (
    <View style={styles.container}>
      {/* Week Header */}
      <View style={styles.header}>
        <View style={styles.weekNav}>
          <TouchableOpacity
            style={styles.navArrow}
            onPress={() => setWeekOffset(weekOffset - 1)}
          >
            <Text style={styles.navArrowText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <TouchableOpacity
            style={styles.navArrow}
            onPress={() => setWeekOffset(weekOffset + 1)}
          >
            <Text style={styles.navArrowText}>{'>'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {weekDates.map((day, dayIdx) => {
          const dayJobs = DEMO_JOBS.filter((j) => j.day === dayIdx);
          return (
            <View key={dayIdx} style={styles.dayRow}>
              <View
                style={[
                  styles.dayLabel,
                  day.isToday ? styles.dayLabelToday : null,
                ]}
              >
                <Text
                  style={[
                    styles.dayName,
                    day.isToday ? styles.dayNameToday : null,
                  ]}
                >
                  {day.name}
                </Text>
                <Text
                  style={[
                    styles.dayDate,
                    day.isToday ? styles.dayDateToday : null,
                  ]}
                >
                  {day.date}
                </Text>
              </View>
              <View style={styles.dayContent}>
                {dayJobs.length === 0 ? (
                  <View style={styles.emptyDay}>
                    <Text style={styles.emptyDayText}>No jobs</Text>
                  </View>
                ) : (
                  dayJobs.map((job) => (
                    <TouchableOpacity
                      key={job.id}
                      style={[
                        styles.jobBlock,
                        { borderLeftColor: job.color },
                      ]}
                    >
                      <View style={styles.jobBlockHeader}>
                        <Text style={styles.jobBlockTime}>{job.time}</Text>
                        <Text style={styles.jobBlockDuration}>
                          {job.duration}
                        </Text>
                      </View>
                      <Text style={styles.jobBlockCustomer}>
                        {job.customer}
                      </Text>
                      <View
                        style={[
                          styles.jobBlockBadge,
                          { backgroundColor: `${job.color}15` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.jobBlockBadgeText,
                            { color: job.color },
                          ]}
                        >
                          {job.serviceType}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
          );
        })}
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
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30,77,107,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navArrowText: {
    fontSize: 18,
    color: '#1e4d6b',
    fontWeight: '700',
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1628',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  dayRow: {
    flexDirection: 'row',
    marginBottom: 12,
    minHeight: 60,
  },
  dayLabel: {
    width: 48,
    alignItems: 'center',
    paddingTop: 8,
  },
  dayLabelToday: {
    backgroundColor: '#1e4d6b',
    borderRadius: 10,
    paddingVertical: 6,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7F96',
    textTransform: 'uppercase',
  },
  dayNameToday: {
    color: 'rgba(255,255,255,0.8)',
  },
  dayDate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0B1628',
    marginTop: 2,
  },
  dayDateToday: {
    color: '#FFFFFF',
  },
  dayContent: {
    flex: 1,
    marginLeft: 12,
  },
  emptyDay: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    borderStyle: 'dashed',
  },
  emptyDayText: {
    fontSize: 13,
    color: '#B8C4D8',
  },
  jobBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  jobBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobBlockTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0B1628',
  },
  jobBlockDuration: {
    fontSize: 11,
    color: '#6B7F96',
  },
  jobBlockCustomer: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3D5068',
    marginTop: 4,
  },
  jobBlockBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 6,
  },
  jobBlockBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
