import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';

type ItemType = 'pass_fail' | 'yes_no' | 'rating' | 'text' | 'photo_required' | 'measurement';

interface ChecklistItem {
  id: string;
  label: string;
  type: ItemType;
  value: string | boolean | number | null;
  required: boolean;
  nfpaRef?: string;
}

const DEMO_ITEMS: ChecklistItem[] = [
  { id: 'c1', label: 'Hood filters removed and inspected', type: 'pass_fail', value: true, required: true, nfpaRef: 'NFPA 96 §11.4' },
  { id: 'c2', label: 'Ductwork access panels opened', type: 'pass_fail', value: true, required: true },
  { id: 'c3', label: 'Grease buildup on hood plenum', type: 'yes_no', value: false, required: true },
  { id: 'c4', label: 'Fan belt condition', type: 'rating', value: 4, required: true },
  { id: 'c5', label: 'Exhaust fan operational', type: 'pass_fail', value: null, required: true, nfpaRef: 'NFPA 96 §7.8' },
  { id: 'c6', label: 'Fire suppression system tagged', type: 'yes_no', value: null, required: true, nfpaRef: 'NFPA 96 §10.1' },
  { id: 'c7', label: 'Grease depth measurement (mm)', type: 'measurement', value: null, required: true },
  { id: 'c8', label: 'Before photo of hood interior', type: 'photo_required', value: null, required: true },
  { id: 'c9', label: 'Condition notes', type: 'text', value: null, required: false },
  { id: 'c10', label: 'Damper operation verified', type: 'pass_fail', value: null, required: true },
];

export function ChecklistScreen() {
  const phase = 'Pre-Cleaning';
  const [items, setItems] = useState<ChecklistItem[]>(DEMO_ITEMS);

  const completedCount = items.filter((i) => i.value !== null).length;
  const progress = Math.round((completedCount / items.length) * 100);

  const updateItem = (id: string, value: string | boolean | number | null) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, value } : item)),
    );
  };

  const handleSave = () => {
    Alert.alert('Saved', 'Checklist progress saved (demo).');
  };

  const renderItemControl = (item: ChecklistItem) => {
    switch (item.type) {
      case 'pass_fail':
        return (
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                item.value === true ? styles.togglePass : null,
              ]}
              onPress={() => updateItem(item.id, true)}
            >
              <Text
                style={[
                  styles.toggleText,
                  item.value === true ? styles.toggleTextActive : null,
                ]}
              >
                Pass
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                item.value === false ? styles.toggleFail : null,
              ]}
              onPress={() => updateItem(item.id, false)}
            >
              <Text
                style={[
                  styles.toggleText,
                  item.value === false ? styles.toggleTextActive : null,
                ]}
              >
                Fail
              </Text>
            </TouchableOpacity>
          </View>
        );
      case 'yes_no':
        return (
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                item.value === true ? styles.toggleYes : null,
              ]}
              onPress={() => updateItem(item.id, true)}
            >
              <Text
                style={[
                  styles.toggleText,
                  item.value === true ? styles.toggleTextActive : null,
                ]}
              >
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                item.value === false ? styles.toggleNo : null,
              ]}
              onPress={() => updateItem(item.id, false)}
            >
              <Text
                style={[
                  styles.toggleText,
                  item.value === false ? styles.toggleTextActive : null,
                ]}
              >
                No
              </Text>
            </TouchableOpacity>
          </View>
        );
      case 'rating':
        return (
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.ratingCircle,
                  item.value !== null && (item.value as number) >= r
                    ? styles.ratingActive
                    : null,
                ]}
                onPress={() => updateItem(item.id, r)}
              >
                <Text
                  style={[
                    styles.ratingText,
                    item.value !== null && (item.value as number) >= r
                      ? styles.ratingTextActive
                      : null,
                  ]}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      case 'text':
        return (
          <TextInput
            style={styles.textInput}
            placeholder="Enter notes..."
            placeholderTextColor="#6B7F96"
            value={(item.value as string) || ''}
            onChangeText={(text) => updateItem(item.id, text || null)}
            multiline
          />
        );
      case 'photo_required':
        return (
          <TouchableOpacity
            style={styles.photoButton}
            onPress={() => updateItem(item.id, 'photo_taken')}
          >
            <Text style={styles.photoButtonText}>
              {item.value ? 'Photo Captured' : 'Take Photo'}
            </Text>
          </TouchableOpacity>
        );
      case 'measurement':
        return (
          <TextInput
            style={styles.measurementInput}
            placeholder="0.0"
            placeholderTextColor="#6B7F96"
            keyboardType="numeric"
            value={item.value !== null ? String(item.value) : ''}
            onChangeText={(text) => {
              const num = parseFloat(text);
              updateItem(item.id, isNaN(num) ? null : num);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressHeader}>
        <View style={styles.progressInfo}>
          <Text style={styles.phaseLabel}>{phase} Checklist</Text>
          <Text style={styles.progressText}>
            {completedCount}/{items.length} items
          </Text>
        </View>
        <View style={styles.progressBarOuter}>
          <View
            style={[styles.progressBarInner, { width: `${progress}%` }]}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {items.map((item, idx) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.itemNumberBadge}>
                <Text style={styles.itemNumber}>{idx + 1}</Text>
              </View>
              <View style={styles.itemLabelContainer}>
                <Text style={styles.itemLabel}>{item.label}</Text>
                {item.nfpaRef && (
                  <Text style={styles.nfpaRef}>{item.nfpaRef}</Text>
                )}
              </View>
              {item.required && <Text style={styles.requiredStar}>*</Text>}
            </View>
            <View style={styles.itemControl}>{renderItemControl(item)}</View>
          </View>
        ))}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Progress</Text>
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
  progressHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phaseLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0B1628',
  },
  progressText: {
    fontSize: 13,
    color: '#6B7F96',
  },
  progressBarOuter: {
    height: 6,
    backgroundColor: '#E8EDF5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarInner: {
    height: 6,
    backgroundColor: '#1e4d6b',
    borderRadius: 3,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  itemCard: {
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
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(30,77,107,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  itemNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e4d6b',
  },
  itemLabelContainer: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0B1628',
    lineHeight: 20,
  },
  nfpaRef: {
    fontSize: 11,
    color: '#d4af37',
    marginTop: 2,
  },
  requiredStar: {
    fontSize: 16,
    color: '#DC2626',
    marginLeft: 4,
  },
  itemControl: {
    marginTop: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D9E6',
    alignItems: 'center',
  },
  togglePass: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  toggleFail: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  toggleYes: {
    backgroundColor: '#1e4d6b',
    borderColor: '#1e4d6b',
  },
  toggleNo: {
    backgroundColor: '#6B7F96',
    borderColor: '#6B7F96',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D5068',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D1D9E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingActive: {
    backgroundColor: '#d4af37',
    borderColor: '#d4af37',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D5068',
  },
  ratingTextActive: {
    color: '#FFFFFF',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D9E6',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#0B1628',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  photoButton: {
    backgroundColor: 'rgba(30,77,107,0.08)',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e4d6b',
    borderStyle: 'dashed',
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e4d6b',
  },
  measurementInput: {
    borderWidth: 1,
    borderColor: '#D1D9E6',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#0B1628',
    width: 100,
    textAlign: 'center',
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
  saveButton: {
    backgroundColor: '#1e4d6b',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
