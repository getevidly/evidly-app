import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Switch,
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
interface DayAvailability {
  day: string;
  available: boolean;
  startTime: string;
  endTime: string;
}

// ── Placeholder data ─────────────────────────────────────────
// TODO: Replace with useAvailability(weekStart) hook
const DEFAULT_DAYS: DayAvailability[] = [
  { day: 'Monday', available: true, startTime: '7:00 AM', endTime: '5:00 PM' },
  { day: 'Tuesday', available: true, startTime: '7:00 AM', endTime: '5:00 PM' },
  { day: 'Wednesday', available: true, startTime: '7:00 AM', endTime: '5:00 PM' },
  { day: 'Thursday', available: true, startTime: '7:00 AM', endTime: '5:00 PM' },
  { day: 'Friday', available: true, startTime: '7:00 AM', endTime: '5:00 PM' },
  { day: 'Saturday', available: false, startTime: '8:00 AM', endTime: '12:00 PM' },
  { day: 'Sunday', available: false, startTime: '', endTime: '' },
];

function getWeekLabel(offset: number): string {
  const today = new Date();
  const start = new Date(today);
  const dayOfWeek = start.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(start.getDate() + diff + offset * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} — ${end.toLocaleDateString('en-US', opts)}`;
}

export function AvailabilityScreen({ navigation }: { navigation?: any }) {
  const [weekOffset, setWeekOffset] = useState(1); // Default: next week
  const [days, setDays] = useState<DayAvailability[]>(DEFAULT_DAYS);
  const [preferredHours, setPreferredHours] = useState('40');
  const [notes, setNotes] = useState('');

  const toggleDay = (index: number) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === index ? { ...d, available: !d.available } : d,
      ),
    );
  };

  const updateTime = (
    index: number,
    field: 'startTime' | 'endTime',
    value: string,
  ) => {
    setDays((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)),
    );
  };

  const handleSubmit = () => {
    // TODO: Submit availability via API
    // navigation.goBack()
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Week selector ───────────────────────────────── */}
      <View style={styles.weekSelector}>
        <TouchableOpacity
          style={styles.weekArrow}
          onPress={() => setWeekOffset((o) => Math.max(0, o - 1))}
        >
          <Text style={styles.weekArrowText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.weekLabel}>{getWeekLabel(weekOffset)}</Text>
        <TouchableOpacity
          style={styles.weekArrow}
          onPress={() => setWeekOffset((o) => o + 1)}
        >
          <Text style={styles.weekArrowText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Submit Availability</Text>
        <Text style={styles.subtitle}>
          Toggle days and set your available hours for the week.
        </Text>

        {/* ── Day rows ──────────────────────────────────── */}
        {days.map((day, index) => (
          <View key={day.day} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayName}>{day.day}</Text>
              <Switch
                value={day.available}
                onValueChange={() => toggleDay(index)}
                trackColor={{ false: BORDER, true: BRAND }}
                thumbColor={WHITE}
              />
            </View>
            {day.available && (
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Text style={styles.timeLabel}>Start</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={day.startTime}
                    placeholder="7:00 AM"
                    placeholderTextColor={TEXT_TERTIARY}
                    onChangeText={(val) => updateTime(index, 'startTime', val)}
                  />
                </View>
                <Text style={styles.timeSeparator}>to</Text>
                <View style={styles.timeField}>
                  <Text style={styles.timeLabel}>End</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={day.endTime}
                    placeholder="5:00 PM"
                    placeholderTextColor={TEXT_TERTIARY}
                    onChangeText={(val) => updateTime(index, 'endTime', val)}
                  />
                </View>
              </View>
            )}
            {!day.available && (
              <Text style={styles.unavailableText}>Unavailable</Text>
            )}
          </View>
        ))}

        {/* ── Preferred hours ───────────────────────────── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Preferred Weekly Hours</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={preferredHours}
            onChangeText={setPreferredHours}
          />
        </View>

        {/* ── Notes ─────────────────────────────────────── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Any scheduling preferences, time-off requests, etc."
            placeholderTextColor={TEXT_TERTIARY}
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* ── Submit ────────────────────────────────────── */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>Submit Availability</Text>
        </TouchableOpacity>
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
    padding: 16,
    paddingBottom: 32,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginBottom: 16,
  },

  // Day card
  dayCard: {
    backgroundColor: CARD_BG,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 11,
    color: TEXT_TERTIARY,
    marginBottom: 4,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: TEXT_PRIMARY,
    backgroundColor: WHITE,
  },
  timeSeparator: {
    fontSize: 13,
    color: TEXT_TERTIARY,
    marginTop: 16,
  },
  unavailableText: {
    fontSize: 13,
    color: TEXT_TERTIARY,
    fontStyle: 'italic',
    marginTop: 6,
  },

  // Fields
  fieldGroup: {
    marginTop: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_PRIMARY,
    backgroundColor: WHITE,
  },
  textArea: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_PRIMARY,
    backgroundColor: WHITE,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Submit
  submitBtn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
});
