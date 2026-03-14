import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';

type ItemType =
  | 'pass_fail'
  | 'yes_no'
  | 'rating'
  | 'text'
  | 'photo_required'
  | 'measurement';

interface ChecklistItem {
  id: string;
  label: string;
  type: ItemType;
  required: boolean;
}

interface ChecklistItemCardProps {
  item: ChecklistItem;
  value: any;
  onChange: (value: any) => void;
}

export function ChecklistItemCard({
  item,
  value,
  onChange,
}: ChecklistItemCardProps) {
  const renderInput = () => {
    switch (item.type) {
      case 'pass_fail':
        return (
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                styles.passButton,
                value === 'pass' && styles.passButtonActive,
              ]}
              onPress={() => onChange('pass')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleText,
                  value === 'pass' && styles.toggleTextActive,
                ]}
              >
                PASS
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                styles.failButton,
                value === 'fail' && styles.failButtonActive,
              ]}
              onPress={() => onChange('fail')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleText,
                  value === 'fail' && styles.toggleTextActive,
                ]}
              >
                FAIL
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
                styles.yesButton,
                value === true && styles.yesButtonActive,
              ]}
              onPress={() => onChange(true)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleText,
                  value === true && styles.toggleTextActive,
                ]}
              >
                YES
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                styles.noButton,
                value === false && styles.noButtonActive,
              ]}
              onPress={() => onChange(false)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleText,
                  value === false && styles.toggleTextActive,
                ]}
              >
                NO
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'rating':
        return (
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => onChange(star)}
                activeOpacity={0.7}
                style={styles.starButton}
              >
                <Text
                  style={[
                    styles.star,
                    star <= (value ?? 0) ? styles.starFilled : styles.starEmpty,
                  ]}
                >
                  ★
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
            value={value ?? ''}
            onChangeText={onChange}
            multiline
            numberOfLines={3}
          />
        );

      case 'photo_required':
        return (
          <TouchableOpacity
            style={[styles.photoButton, value != null && styles.photoButtonDone]}
            onPress={() => onChange(`file://photo_${item.id}_${Date.now()}.jpg`)}
            activeOpacity={0.7}
          >
            <Text style={styles.photoIcon}>{value != null ? '✅' : '📸'}</Text>
            <Text
              style={[
                styles.photoText,
                value != null && styles.photoTextDone,
              ]}
            >
              {value != null ? 'Photo captured' : 'Take photo'}
            </Text>
          </TouchableOpacity>
        );

      case 'measurement':
        return (
          <View style={styles.measurementRow}>
            <TextInput
              style={styles.measurementInput}
              placeholder="0"
              placeholderTextColor="#6B7F96"
              value={value != null ? String(value) : ''}
              onChangeText={(text) => {
                const num = parseFloat(text);
                onChange(isNaN(num) ? text : num);
              }}
              keyboardType="numeric"
            />
            <Text style={styles.unitLabel}>units</Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{item.label}</Text>
        {item.required && <Text style={styles.required}>*</Text>}
      </View>
      {renderInput()}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0B1628',
    flex: 1,
  },
  required: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '700',
    marginLeft: 4,
  },

  // Pass / Fail & Yes / No
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3D5068',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  passButton: {
    borderColor: '#166534',
  },
  passButtonActive: {
    backgroundColor: '#166534',
    borderColor: '#166534',
  },
  failButton: {
    borderColor: '#DC2626',
  },
  failButtonActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  yesButton: {
    borderColor: '#1e4d6b',
  },
  yesButtonActive: {
    backgroundColor: '#1e4d6b',
    borderColor: '#1e4d6b',
  },
  noButton: {
    borderColor: '#6B7F96',
  },
  noButtonActive: {
    backgroundColor: '#6B7F96',
    borderColor: '#6B7F96',
  },

  // Rating
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 32,
  },
  starFilled: {
    color: '#d4af37',
  },
  starEmpty: {
    color: '#D1D9E6',
  },

  // Text
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D9E6',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#0B1628',
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#F4F6FA',
  },

  // Photo
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1e4d6b',
    borderStyle: 'dashed',
    backgroundColor: '#F4F6FA',
  },
  photoButtonDone: {
    borderStyle: 'solid',
    borderColor: '#166534',
    backgroundColor: '#F0FDF4',
  },
  photoIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  photoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e4d6b',
  },
  photoTextDone: {
    color: '#166534',
  },

  // Measurement
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  measurementInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D9E6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#0B1628',
    backgroundColor: '#F4F6FA',
    fontWeight: '600',
  },
  unitLabel: {
    fontSize: 14,
    color: '#6B7F96',
    fontWeight: '500',
    marginLeft: 10,
  },
});
