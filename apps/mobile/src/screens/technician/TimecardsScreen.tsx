import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

interface DailyEntry {
  day: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  hours: number;
  status: 'complete' | 'active' | 'off';
}

const DEMO_WEEK: DailyEntry[] = [
  { day: 'Monday', date: 'Mar 9', clockIn: '6:45 AM', clockOut: '3:30 PM', hours: 8.75, status: 'complete' },
  { day: 'Tuesday', date: 'Mar 10', clockIn: '7:00 AM', clockOut: '4:00 PM', hours: 9.0, status: 'complete' },
  { day: 'Wednesday', date: 'Mar 11', clockIn: '6:30 AM', clockOut: '3:00 PM', hours: 8.5, status: 'complete' },
  { day: 'Thursday', date: 'Mar 12', clockIn: '7:00 AM', clockOut: '3:30 PM', hours: 8.5, status: 'complete' },
  { day: 'Friday', date: 'Mar 13', clockIn: '7:00 AM', clockOut: null, hours: 6.5, status: 'active' },
  { day: 'Saturday', date: 'Mar 14', clockIn: '', clockOut: null, hours: 0, status: 'off' },
  { day: 'Sunday', date: 'Mar 15', clockIn: '', clockOut: null, hours: 0, status: 'off' },
];

export function TimecardsScreen() {
  const [clockedIn, setClockedIn] = useState(true);
  const todayHours = 6.5;
  const weekTotal = DEMO_WEEK.reduce((sum, d) => sum + d.hours, 0);
  const payPeriodTotal = weekTotal + 38.25;

  const handleClockToggle = () => {
    setClockedIn(!clockedIn);
    Alert.alert(
      clockedIn ? 'Clocked Out' : 'Clocked In',
      `You have ${clockedIn ? 'clocked out' : 'clocked in'} (demo).`,
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Timecards</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Clock Status Card */}
        <View style={styles.clockCard}>
          <View style={styles.clockStatusRow}>
            <View
              style={[
                styles.clockStatusDot,
                clockedIn
                  ? styles.clockStatusDotActive
                  : styles.clockStatusDotInactive,
              ]}
            />
            <Text style={styles.clockStatusText}>
              {clockedIn ? 'Clocked In' : 'Clocked Out'}
            </Text>
          </View>
          {clockedIn && (
            <Text style={styles.clockSince}>Since 7:00 AM</Text>
          )}
          <View style={styles.todayHoursRow}>
            <Text style={styles.todayHoursValue}>
              {todayHours.toFixed(1)}
            </Text>
            <Text style={styles.todayHoursLabel}>hours today</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.clockToggleButton,
              clockedIn
                ? styles.clockOutButtonStyle
                : styles.clockInButtonStyle,
            ]}
            onPress={handleClockToggle}
          >
            <Text style={styles.clockToggleText}>
              {clockedIn ? 'Clock Out' : 'Clock In'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Weekly Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {weekTotal.toFixed(1)}
              </Text>
              <Text style={styles.summaryLabel}>Week Total</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {payPeriodTotal.toFixed(1)}
              </Text>
              <Text style={styles.summaryLabel}>Pay Period</Text>
            </View>
          </View>
        </View>

        {/* Daily Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Breakdown</Text>
          {DEMO_WEEK.map((entry, idx) => (
            <View
              key={idx}
              style={[
                styles.dayEntry,
                entry.status === 'active' ? styles.dayEntryActive : null,
              ]}
            >
              <View style={styles.dayInfo}>
                <Text
                  style={[
                    styles.dayName,
                    entry.status === 'off' ? styles.dayNameOff : null,
                  ]}
                >
                  {entry.day}
                </Text>
                <Text style={styles.dayDate}>{entry.date}</Text>
              </View>
              {entry.status === 'off' ? (
                <Text style={styles.offText}>Off</Text>
              ) : (
                <View style={styles.dayTimes}>
                  <Text style={styles.timeText}>
                    {entry.clockIn} - {entry.clockOut || 'Now'}
                  </Text>
                  <Text
                    style={[
                      styles.hoursText,
                      entry.status === 'active'
                        ? styles.hoursTextActive
                        : null,
                    ]}
                  >
                    {entry.hours.toFixed(1)}h
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Hours Bar Visual */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hours Distribution</Text>
          <View style={styles.barsCard}>
            {DEMO_WEEK.filter((d) => d.status !== 'off').map((entry, idx) => (
              <View key={idx} style={styles.barRow}>
                <Text style={styles.barLabel}>{entry.day.slice(0, 3)}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${(entry.hours / 10) * 100}%` },
                      entry.status === 'active'
                        ? styles.barFillActive
                        : null,
                    ]}
                  />
                </View>
                <Text style={styles.barValue}>
                  {entry.hours.toFixed(1)}
                </Text>
              </View>
            ))}
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
    paddingBottom: 32,
  },
  clockCard: {
    backgroundColor: '#0B1628',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  clockStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clockStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  clockStatusDotActive: {
    backgroundColor: '#059669',
  },
  clockStatusDotInactive: {
    backgroundColor: '#6B7F96',
  },
  clockStatusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  clockSince: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  todayHoursRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 16,
    gap: 6,
  },
  todayHoursValue: {
    fontSize: 40,
    fontWeight: '700',
    color: '#d4af37',
  },
  todayHoursLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  clockToggleButton: {
    marginTop: 20,
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 10,
  },
  clockInButtonStyle: {
    backgroundColor: '#059669',
  },
  clockOutButtonStyle: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  clockToggleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e4d6b',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7F96',
    marginTop: 2,
  },
  dayEntry: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayEntryActive: {
    borderWidth: 1,
    borderColor: '#d4af37',
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0B1628',
  },
  dayNameOff: {
    color: '#B8C4D8',
  },
  dayDate: {
    fontSize: 11,
    color: '#6B7F96',
    marginTop: 1,
  },
  dayTimes: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 13,
    color: '#3D5068',
  },
  hoursText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B1628',
    marginTop: 2,
  },
  hoursTextActive: {
    color: '#d4af37',
  },
  offText: {
    fontSize: 13,
    color: '#B8C4D8',
    fontStyle: 'italic',
  },
  barsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  barLabel: {
    width: 32,
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7F96',
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E8EDF5',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  barFill: {
    height: 8,
    backgroundColor: '#1e4d6b',
    borderRadius: 4,
  },
  barFillActive: {
    backgroundColor: '#d4af37',
  },
  barValue: {
    width: 36,
    fontSize: 12,
    fontWeight: '600',
    color: '#0B1628',
    textAlign: 'right',
  },
});
