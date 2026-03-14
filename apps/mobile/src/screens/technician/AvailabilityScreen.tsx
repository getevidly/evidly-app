import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

type TimeSlot = 'morning' | 'afternoon' | 'evening';

interface DayAvailability {
  day: string;
  shortDay: string;
  slots: Record<TimeSlot, boolean>;
}

const INITIAL_AVAILABILITY: DayAvailability[] = [
  { day: 'Monday', shortDay: 'Mon', slots: { morning: true, afternoon: true, evening: false } },
  { day: 'Tuesday', shortDay: 'Tue', slots: { morning: true, afternoon: true, evening: false } },
  { day: 'Wednesday', shortDay: 'Wed', slots: { morning: true, afternoon: false, evening: false } },
  { day: 'Thursday', shortDay: 'Thu', slots: { morning: true, afternoon: true, evening: true } },
  { day: 'Friday', shortDay: 'Fri', slots: { morning: true, afternoon: true, evening: false } },
  { day: 'Saturday', shortDay: 'Sat', slots: { morning: false, afternoon: false, evening: false } },
  { day: 'Sunday', shortDay: 'Sun', slots: { morning: false, afternoon: false, evening: false } },
];

const TIME_SLOTS: { key: TimeSlot; label: string; hours: string }[] = [
  { key: 'morning', label: 'Morning', hours: '6 AM - 12 PM' },
  { key: 'afternoon', label: 'Afternoon', hours: '12 PM - 6 PM' },
  { key: 'evening', label: 'Evening', hours: '6 PM - 10 PM' },
];

export function AvailabilityScreen() {
  const [availability, setAvailability] =
    useState<DayAvailability[]>(INITIAL_AVAILABILITY);

  const toggleSlot = (dayIdx: number, slot: TimeSlot) => {
    setAvailability((prev) =>
      prev.map((day, idx) =>
        idx === dayIdx
          ? {
              ...day,
              slots: { ...day.slots, [slot]: !day.slots[slot] },
            }
          : day,
      ),
    );
  };

  const handleSubmit = () => {
    Alert.alert(
      'Submitted',
      'Your weekly availability has been submitted (demo).',
    );
  };

  const handleVacationRequest = () => {
    Alert.alert(
      'Vacation Request',
      'Vacation request form would open here (demo).',
    );
  };

  const getAvailableCount = (day: DayAvailability) =>
    Object.values(day.slots).filter(Boolean).length;

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Weekly Availability</Text>
        <Text style={styles.headerSubtitle}>
          Set your available time slots for next week
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Time Slot Legend */}
        <View style={styles.legendRow}>
          {TIME_SLOTS.map((slot) => (
            <View key={slot.key} style={styles.legendItem}>
              <Text style={styles.legendLabel}>{slot.label}</Text>
              <Text style={styles.legendHours}>{slot.hours}</Text>
            </View>
          ))}
        </View>

        {/* Day Grid */}
        {availability.map((day, dayIdx) => (
          <View key={day.day} style={styles.dayRow}>
            <View style={styles.dayInfo}>
              <Text style={styles.dayName}>{day.day}</Text>
              <Text style={styles.daySlotCount}>
                {getAvailableCount(day)}/3 slots
              </Text>
            </View>
            <View style={styles.slotsRow}>
              {TIME_SLOTS.map((slot) => (
                <TouchableOpacity
                  key={slot.key}
                  style={[
                    styles.slotToggle,
                    day.slots[slot.key]
                      ? styles.slotToggleOn
                      : styles.slotToggleOff,
                  ]}
                  onPress={() => toggleSlot(dayIdx, slot.key)}
                >
                  <Text
                    style={[
                      styles.slotToggleText,
                      day.slots[slot.key]
                        ? styles.slotToggleTextOn
                        : styles.slotToggleTextOff,
                    ]}
                  >
                    {slot.label.charAt(0)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Vacation Request */}
        <TouchableOpacity
          style={styles.vacationButton}
          onPress={handleVacationRequest}
        >
          <Text style={styles.vacationButtonText}>Request Vacation / PTO</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit Availability</Text>
        </TouchableOpacity>
      </View>
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
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7F96',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  legendRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  legendItem: {
    flex: 1,
    alignItems: 'center',
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0B1628',
  },
  legendHours: {
    fontSize: 10,
    color: '#6B7F96',
    marginTop: 2,
  },
  dayRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0B1628',
  },
  daySlotCount: {
    fontSize: 11,
    color: '#6B7F96',
    marginTop: 2,
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  slotToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  slotToggleOn: {
    backgroundColor: '#1e4d6b',
    borderColor: '#1e4d6b',
  },
  slotToggleOff: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D9E6',
  },
  slotToggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  slotToggleTextOn: {
    color: '#FFFFFF',
  },
  slotToggleTextOff: {
    color: '#B8C4D8',
  },
  vacationButton: {
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderWidth: 1,
    borderColor: '#d4af37',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  vacationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d4af37',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
  },
  submitButton: {
    backgroundColor: '#1e4d6b',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
