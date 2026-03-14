import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
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
const DANGER = '#dc2626';
const WARNING = '#f59e0b';

// ── Types ─────────────────────────────────────────────────────
interface ShiftEntry {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  hours: number;
  location: string;
}

interface DaySummary {
  day: string;
  hours: number;
}

// ── Placeholder data ─────────────────────────────────────────
// TODO: Replace with useTimecards(payPeriod) hook
const IS_CLOCKED_IN = true;
const CURRENT_DURATION = '3h 42m';
const CURRENT_LOCATION = 'Downtown Service Area';
const CLOCK_IN_TIME = '7:18 AM';

const WEEKLY_SUMMARY: DaySummary[] = [
  { day: 'Mon', hours: 9.5 },
  { day: 'Tue', hours: 8.0 },
  { day: 'Wed', hours: 3.7 }, // current day, partial
  { day: 'Thu', hours: 0 },
  { day: 'Fri', hours: 0 },
  { day: 'Sat', hours: 0 },
  { day: 'Sun', hours: 0 },
];

const TOTAL_HOURS = WEEKLY_SUMMARY.reduce((sum, d) => sum + d.hours, 0);
const OVERTIME = Math.max(0, TOTAL_HOURS - 40);
const MAX_BAR_HOURS = 10;

const SHIFT_HISTORY: ShiftEntry[] = [
  {
    id: 'sh-1',
    date: 'Wed, Mar 12',
    clockIn: '7:18 AM',
    clockOut: null,
    hours: 3.7,
    location: 'Downtown Service Area',
  },
  {
    id: 'sh-2',
    date: 'Tue, Mar 11',
    clockIn: '6:55 AM',
    clockOut: '3:58 PM',
    hours: 8.0,
    location: 'West Side Route',
  },
  {
    id: 'sh-3',
    date: 'Mon, Mar 10',
    clockIn: '6:45 AM',
    clockOut: '4:15 PM',
    hours: 9.5,
    location: 'Harbor District',
  },
  {
    id: 'sh-4',
    date: 'Fri, Mar 7',
    clockIn: '7:00 AM',
    clockOut: '4:30 PM',
    hours: 8.5,
    location: 'East Side Route',
  },
  {
    id: 'sh-5',
    date: 'Thu, Mar 6',
    clockIn: '7:10 AM',
    clockOut: '4:40 PM',
    hours: 8.5,
    location: 'Downtown Service Area',
  },
];

export function TimecardsScreen({ navigation }: { navigation?: any }) {
  const [clockedIn, setClockedIn] = useState(IS_CLOCKED_IN);

  const handleClockToggle = () => {
    // TODO: Call clock in/out API with GPS
    setClockedIn((prev) => !prev);
  };

  const renderShiftEntry = ({ item }: { item: ShiftEntry }) => (
    <View style={styles.shiftCard}>
      <View style={styles.shiftRow}>
        <Text style={styles.shiftDate}>{item.date}</Text>
        <Text style={styles.shiftHours}>{item.hours.toFixed(1)}h</Text>
      </View>
      <View style={styles.shiftRow}>
        <Text style={styles.shiftTimes}>
          {item.clockIn} — {item.clockOut ?? 'Active'}
        </Text>
        <Text style={styles.shiftLocation}>{item.location}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Timecards</Text>

        {/* ── Current status ────────────────────────────── */}
        <View style={[styles.statusCard, clockedIn ? styles.statusActive : styles.statusInactive]}>
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>
              {clockedIn ? 'Clocked In' : 'Clocked Out'}
            </Text>
            {clockedIn && (
              <>
                <Text style={styles.statusDuration}>{CURRENT_DURATION}</Text>
                <Text style={styles.statusDetail}>
                  Since {CLOCK_IN_TIME} | {CURRENT_LOCATION}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* ── Clock In / Out button ─────────────────────── */}
        <TouchableOpacity
          style={[
            styles.clockBtn,
            clockedIn ? styles.clockBtnOut : styles.clockBtnIn,
          ]}
          onPress={handleClockToggle}
        >
          <Text style={styles.clockBtnText}>
            {clockedIn ? 'Clock Out' : 'Clock In'}
          </Text>
          <Text style={styles.clockBtnSub}>GPS location will be recorded</Text>
        </TouchableOpacity>

        {/* ── Weekly Summary ────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.weekGrid}>
            {WEEKLY_SUMMARY.map((day) => (
              <View key={day.day} style={styles.dayCol}>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${Math.min(100, (day.hours / MAX_BAR_HOURS) * 100)}%`,
                      },
                      day.hours > 8 && styles.barOvertime,
                    ]}
                  />
                </View>
                <Text style={styles.dayHours}>
                  {day.hours > 0 ? day.hours.toFixed(1) : '—'}
                </Text>
                <Text style={styles.dayLabel}>{day.day}</Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={styles.totalsRow}>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{TOTAL_HOURS.toFixed(1)}h</Text>
              <Text style={styles.totalLabel}>Total</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>40h</Text>
              <Text style={styles.totalLabel}>Target</Text>
            </View>
            <View style={styles.totalItem}>
              <Text
                style={[
                  styles.totalValue,
                  OVERTIME > 0 && styles.overtimeValue,
                ]}
              >
                {OVERTIME.toFixed(1)}h
              </Text>
              <Text style={styles.totalLabel}>Overtime</Text>
            </View>
          </View>
        </View>

        {/* ── Shift History ─────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shift History</Text>
        </View>
        {SHIFT_HISTORY.map((shift) => (
          <View key={shift.id}>
            {renderShiftEntry({ item: shift })}
          </View>
        ))}
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
  content: {
    padding: 16,
    paddingBottom: 32,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 16,
  },

  // Status card
  statusCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  statusActive: {
    backgroundColor: BRAND,
  },
  statusInactive: {
    backgroundColor: TEXT_TERTIARY,
  },
  statusInfo: {},
  statusLabel: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '600',
  },
  statusDuration: {
    color: WHITE,
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  statusDetail: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },

  // Clock button
  clockBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  clockBtnIn: {
    backgroundColor: SUCCESS,
  },
  clockBtnOut: {
    backgroundColor: DANGER,
  },
  clockBtnText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: '700',
  },
  clockBtnSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 2,
  },

  // Section
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 12,
  },

  // Week grid
  weekGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    marginBottom: 16,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    height: 80,
    width: 24,
    backgroundColor: '#EEF1F7',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 4,
  },
  bar: {
    backgroundColor: BRAND,
    borderRadius: 4,
    width: '100%',
  },
  barOvertime: {
    backgroundColor: WARNING,
  },
  dayHours: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: 2,
  },
  dayLabel: {
    fontSize: 10,
    color: TEXT_TERTIARY,
    fontWeight: '600',
  },

  // Totals
  totalsRow: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'space-around',
  },
  totalItem: {
    alignItems: 'center',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND,
  },
  overtimeValue: {
    color: WARNING,
  },
  totalLabel: {
    fontSize: 11,
    color: TEXT_TERTIARY,
  },

  // Shift card
  shiftCard: {
    backgroundColor: CARD_BG,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  shiftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shiftDate: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  shiftHours: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND,
  },
  shiftTimes: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  shiftLocation: {
    fontSize: 11,
    color: TEXT_TERTIARY,
  },
});
