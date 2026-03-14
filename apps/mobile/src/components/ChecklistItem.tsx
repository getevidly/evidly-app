/**
 * ChecklistItemCard -- renders a single checklist item with the
 * appropriate input control based on item.type.
 *
 * Supported types:
 *   pass_fail        - Pass / Fail buttons
 *   yes_no           - Yes / No buttons
 *   rating           - Option selector from item.options
 *   text             - Multi-line text input
 *   photo_required   - Camera / gallery button
 *   measurement      - Numeric input with optional help text
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import type { ChecklistItem } from '../data/checklistTemplates';

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

const BRAND_BLUE = '#1e4d6b';
const BRAND_GOLD = '#d4af37';
const PASS_GREEN = '#059669';
const FAIL_RED = '#DC2626';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChecklistResponse {
  value: string | boolean | number | null;
  photos?: string[];
  voice_note_uri?: string;
  notes?: string;
}

interface ChecklistItemCardProps {
  item: ChecklistItem;
  response?: ChecklistResponse;
  onRespond: (value: string | boolean | number) => void;
  onAddPhoto: () => void;
  onAddVoice: () => void;
  onAddNote: () => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PassFailButtons({
  value,
  onRespond,
}: {
  value: string | boolean | number | null | undefined;
  onRespond: (v: string) => void;
}) {
  return (
    <View style={styles.btnRow}>
      <TouchableOpacity
        style={[
          styles.choiceBtn,
          value === 'pass' && { backgroundColor: PASS_GREEN },
        ]}
        onPress={() => onRespond('pass')}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.choiceBtnText,
            value === 'pass' && styles.choiceBtnTextActive,
          ]}
        >
          Pass
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.choiceBtn,
          value === 'fail' && { backgroundColor: FAIL_RED },
        ]}
        onPress={() => onRespond('fail')}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.choiceBtnText,
            value === 'fail' && styles.choiceBtnTextActive,
          ]}
        >
          Fail
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function YesNoButtons({
  value,
  onRespond,
}: {
  value: string | boolean | number | null | undefined;
  onRespond: (v: string) => void;
}) {
  return (
    <View style={styles.btnRow}>
      <TouchableOpacity
        style={[
          styles.choiceBtn,
          value === 'yes' && { backgroundColor: PASS_GREEN },
        ]}
        onPress={() => onRespond('yes')}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.choiceBtnText,
            value === 'yes' && styles.choiceBtnTextActive,
          ]}
        >
          Yes
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.choiceBtn,
          value === 'no' && { backgroundColor: FAIL_RED },
        ]}
        onPress={() => onRespond('no')}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.choiceBtnText,
            value === 'no' && styles.choiceBtnTextActive,
          ]}
        >
          No
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function RatingSelector({
  options,
  value,
  onRespond,
}: {
  options: string[];
  value: string | boolean | number | null | undefined;
  onRespond: (v: string) => void;
}) {
  return (
    <View style={styles.ratingRow}>
      {options.map((opt) => {
        const isSelected = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.ratingPill, isSelected && styles.ratingPillSelected]}
            onPress={() => onRespond(opt)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.ratingPillText,
                isSelected && styles.ratingPillTextSelected,
              ]}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ChecklistItemCard({
  item,
  response,
  onRespond,
  onAddPhoto,
  onAddVoice,
  onAddNote,
}: ChecklistItemCardProps) {
  const currentValue = response?.value ?? null;

  return (
    <View style={styles.card}>
      {/* Label + required indicator */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{item.label}</Text>
        {item.required && <Text style={styles.requiredStar}>*</Text>}
      </View>

      {/* Help text */}
      {item.help_text && (
        <Text style={styles.helpText}>{item.help_text}</Text>
      )}

      {/* Input control */}
      <View style={styles.inputArea}>
        {item.type === 'pass_fail' && (
          <PassFailButtons value={currentValue} onRespond={onRespond} />
        )}

        {item.type === 'yes_no' && (
          <YesNoButtons value={currentValue} onRespond={onRespond} />
        )}

        {item.type === 'rating' && item.options && (
          <RatingSelector
            options={item.options}
            value={currentValue}
            onRespond={onRespond}
          />
        )}

        {item.type === 'text' && (
          <TextInput
            style={styles.textInput}
            placeholder="Enter details..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            value={typeof currentValue === 'string' ? currentValue : ''}
            onChangeText={(text) => onRespond(text)}
            textAlignVertical="top"
          />
        )}

        {item.type === 'photo_required' && (
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={onAddPhoto}
            activeOpacity={0.7}
          >
            <Text style={styles.cameraIcon}>{'\uD83D\uDCF7'}</Text>
            <Text style={styles.cameraLabel}>
              Take Photo{item.min_photos ? ` (min ${item.min_photos})` : ''}
            </Text>
          </TouchableOpacity>
        )}

        {item.type === 'measurement' && (
          <TextInput
            style={styles.measurementInput}
            placeholder="0"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            value={
              currentValue !== null && currentValue !== undefined
                ? String(currentValue)
                : ''
            }
            onChangeText={(text) => {
              const num = parseFloat(text);
              if (!isNaN(num)) onRespond(num);
            }}
          />
        )}
      </View>

      {/* Attachment actions */}
      <View style={styles.actionRow}>
        {item.type !== 'photo_required' && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onAddPhoto}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>{'\uD83D\uDCF7'} Photo</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onAddVoice}
          activeOpacity={0.7}
        >
          <Text style={styles.actionBtnText}>{'\uD83C\uDF99'} Voice</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onAddNote}
          activeOpacity={0.7}
        >
          <Text style={styles.actionBtnText}>{'\uD83D\uDCDD'} Note</Text>
        </TouchableOpacity>
      </View>

      {/* Photo required indicator */}
      {item.photo_required && item.type !== 'photo_required' && (
        <Text style={styles.photoRequiredHint}>Photo required</Text>
      )}

      {/* Severity indicator */}
      {item.fail_creates_deficiency && item.deficiency_severity && (
        <Text style={styles.severityHint}>
          Fail creates {item.deficiency_severity} deficiency
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    lineHeight: 22,
  },
  requiredStar: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
    lineHeight: 16,
  },
  inputArea: {
    marginTop: 8,
  },

  // Pass/Fail & Yes/No buttons
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  choiceBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  choiceBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  choiceBtnTextActive: {
    color: '#FFFFFF',
  },

  // Rating pills
  ratingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ratingPillSelected: {
    backgroundColor: BRAND_BLUE,
    borderColor: BRAND_BLUE,
  },
  ratingPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  ratingPillTextSelected: {
    color: '#FFFFFF',
  },

  // Text input
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 80,
    backgroundColor: '#FAFAFA',
  },

  // Camera button
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: BRAND_BLUE + '10',
    borderWidth: 1,
    borderColor: BRAND_BLUE + '30',
    gap: 8,
  },
  cameraIcon: {
    fontSize: 20,
  },
  cameraLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND_BLUE,
  },

  // Measurement input
  measurementInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    backgroundColor: '#FAFAFA',
    textAlign: 'center',
    width: 120,
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  actionBtnText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Hints
  photoRequiredHint: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    color: BRAND_GOLD,
  },
  severityHint: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
    fontStyle: 'italic',
  },
});
