import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

// ── Brand tokens ──────────────────────────────────────────────
const BRAND = '#1e4d6b';
const GOLD = '#d4af37';
const WHITE = '#ffffff';
const LIGHT_BG = '#F4F6FA';
const CARD_BG = '#ffffff';
const TEXT_PRIMARY = '#0B1628';
const TEXT_SECONDARY = '#3D5068';
const TEXT_TERTIARY = '#6B7F96';
const BORDER = '#D1D9E6';
const SUCCESS = '#16a34a';

// ── Types ─────────────────────────────────────────────────────
type JobStatus = 'scheduled' | 'in_progress' | 'completed';

interface ScheduleJob {
  id: string;
  time: string;
  endTime: string;
  customer: string;
  address: string;
  status: JobStatus;
}

// ── Status color map ──────────────────────────────────────────
const STATUS_COLORS: Record<JobStatus, { bg: string; border: string }> = {
  scheduled: { bg: '#E0EAFF', border: BRAND },
  in_progress: { bg: '#FFF7E0', border: GOLD },
  completed: { bg: '#DCFCE7', border: SUCCESS },
};

// ── Date helpers ──────────────────────────────────────────────
function getWeekDates(startDate: Date): Date[] {
  const monday = new Date(startDate);
  const dayOfWeek = monday.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(monday.getDate() + diff);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatDayShort(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatDayNum(date: Date): string {
  return String(date.getDate());
}

function formatWeekRange(dates: Date[]): string {
  const first = dates[0];
  const last = dates[6];
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${first.toLocaleDateString('en-US', opts)} — ${last.toLocaleDateString('en-US', opts)}`;
}

// ── Placeholder data ─────────────────────────────────────────
// TODO: Replace with useSchedule(weekStart) hook
const DEMO_SCHEDULE: Record<string, ScheduleJob[]> = {
  Mon: [
    { id: 'j-m1', time: '8:00 AM', endTime: '10:00 AM', customer: "Mario's Italian Kitchen", address: '1425 Main St', status: 'completed' },
    { id: 'j-m2', time: '10:30 AM', endTime: '12:00 PM', customer: 'Blue Fin Sushi', address: '800 Harbor Blvd', status: 'completed' },
    { id: 'j-m3', time: '1:30 PM', endTime: '3:00 PM', customer: 'Taco Loco', address: '2200 PCH', status: 'completed' },
  ],
  Tue: [
    { id: 'j-t1', time: '8:00 AM', endTime: '10:30 AM', customer: 'Golden Dragon', address: '550 E Broadway', status: 'completed' },
    { id: 'j-t2', time: '11:00 AM', endTime: '1:00 PM', customer: 'The Breakfast Club', address: '1100 Wilshire', status: 'completed' },
  ],
  Wed: [
    { id: 'j-w1', time: '8:00 AM', endTime: '10:00 AM', customer: 'Burger Barn', address: '3200 Lakewood Blvd', status: 'in_progress' },
    { id: 'j-w2', time: '11:00 AM', endTime: '1:00 PM', customer: 'Pho House', address: '420 E Anaheim St', status: 'scheduled' },
    { id: 'j-w3', time: '2:00 PM', endTime: '3:30 PM', customer: 'Pizza Palace', address: '675 Atlantic Ave', status: 'scheduled' },
    { id: 'j-w4', time: '4:00 PM', endTime: '5:00 PM', customer: 'Café Luna', address: '90 Pine Ave', status: 'scheduled' },
  ],
  Thu: [
    { id: 'j-th1', time: '8:30 AM', endTime: '10:30 AM', customer: 'Seaside Grill', address: '200 Shoreline Dr', status: 'scheduled' },
    { id: 'j-th2', time: '11:00 AM', endTime: '1:00 PM', customer: "Tony's Deli", address: '1600 Cherry Ave', status: 'scheduled' },
  ],
  Fri: [
    { id: 'j-f1', time: '8:00 AM', endTime: '11:00 AM', customer: 'Hotel Grand Kitchen', address: '100 Ocean Blvd', status: 'scheduled' },
    { id: 'j-f2', time: '12:00 PM', endTime: '2:00 PM', customer: 'The Crab Shack', address: '4300 E 2nd St', status: 'scheduled' },
    { id: 'j-f3', time: '3:00 PM', endTime: '4:30 PM', customer: 'Wing King', address: '2800 E Spring St', status: 'scheduled' },
  ],
  Sat: [],
  Sun: [],
};

export function ScheduleScreen({ navigation }: { navigation?: any }) {
  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);

  const baseDate = new Date(today);
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(baseDate);
  const todayStr = today.toDateString();

  const handlePrevWeek = () => setWeekOffset((o) => o - 1);
  const handleNextWeek = () => setWeekOffset((o) => o + 1);
  const handleThisWeek = () => setWeekOffset(0);

  const handleJobPress = (jobId: string) => {
    // TODO: navigation.navigate('JobDetail', { jobId })
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Week selector ───────────────────────────────── */}
      <View style={styles.weekSelector}>
        <TouchableOpacity style={styles.weekArrow} onPress={handlePrevWeek}>
          <Text style={styles.weekArrowText}>{'<'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleThisWeek}>
          <Text style={styles.weekLabel}>{formatWeekRange(weekDates)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.weekArrow} onPress={handleNextWeek}>
          <Text style={styles.weekArrowText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Schedule grid ───────────────────────────────── */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {weekDates.map((date, index) => {
          const dayLabel = formatDayShort(date);
          const dayNum = formatDayNum(date);
          const isToday = date.toDateString() === todayStr;
          const jobs = DEMO_SCHEDULE[dayLabel] ?? [];

          return (
            <View key={index} style={styles.dayRow}>
              {/* Day label */}
              <View style={[styles.dayLabelCol, isToday && styles.dayLabelColToday]}>
                <Text
                  style={[styles.dayName, isToday && styles.dayNameToday]}
                >
                  {dayLabel}
                </Text>
                <Text
                  style={[styles.dayNum, isToday && styles.dayNumToday]}
                >
                  {dayNum}
                </Text>
              </View>

              {/* Jobs column */}
              <View style={styles.jobsCol}>
                {jobs.length === 0 && (
                  <Text style={styles.noJobs}>No jobs</Text>
                )}
                {jobs.map((job) => {
                  const color = STATUS_COLORS[job.status];
                  return (
                    <TouchableOpacity
                      key={job.id}
                      style={[
                        styles.jobBlock,
                        {
                          backgroundColor: color.bg,
                          borderLeftColor: color.border,
                        },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => handleJobPress(job.id)}
                    >
                      <Text style={styles.jobBlockTime}>
                        {job.time} - {job.endTime}
                      </Text>
                      <Text style={styles.jobBlockCustomer} numberOfLines={1}>
                        {job.customer}
                      </Text>
                      <Text style={styles.jobBlockAddress} numberOfLines={1}>
                        {job.address}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },

  // Week selector
  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  weekArrow: {
    padding: 8,
  },
  weekArrowText: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND,
  },
  weekLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 32,
  },

  // Day row
  dayRow: {
    flexDirection: 'row',
    marginBottom: 8,
    minHeight: 60,
  },
  dayLabelCol: {
    width: 52,
    alignItems: 'center',
    paddingTop: 8,
    marginRight: 8,
  },
  dayLabelColToday: {
    backgroundColor: BRAND,
    borderRadius: 10,
    paddingVertical: 6,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_TERTIARY,
    textTransform: 'uppercase',
  },
  dayNameToday: {
    color: 'rgba(255,255,255,0.8)',
  },
  dayNum: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  dayNumToday: {
    color: WHITE,
  },

  // Jobs column
  jobsCol: {
    flex: 1,
    gap: 6,
  },
  noJobs: {
    fontSize: 12,
    color: TEXT_TERTIARY,
    fontStyle: 'italic',
    paddingVertical: 10,
  },

  // Job block
  jobBlock: {
    borderRadius: 8,
    borderLeftWidth: 3,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  jobBlockTime: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    marginBottom: 2,
  },
  jobBlockCustomer: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  jobBlockAddress: {
    fontSize: 11,
    color: TEXT_TERTIARY,
  },
});
