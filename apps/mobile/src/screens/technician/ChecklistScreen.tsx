import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
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

// ── Types ─────────────────────────────────────────────────────
type Phase = 'pre' | 'during' | 'post';
type ItemType = 'pass_fail' | 'yes_no' | 'rating' | 'measurement' | 'text' | 'photo_required';

interface ChecklistItem {
  id: string;
  label: string;
  type: ItemType;
  completed: boolean;
  value?: string | number | boolean | null;
  photoRequired?: boolean;
  photoTaken?: boolean;
  voiceNote?: boolean;
  notes?: string;
  unit?: string; // for measurement type
}

// ── Placeholder data ─────────────────────────────────────────
// TODO: Replace with useChecklist(jobId, phase) hook
const DEMO_ITEMS: Record<Phase, ChecklistItem[]> = {
  pre: [
    { id: 'p1', label: 'Access to all hoods verified', type: 'pass_fail', completed: true, value: true },
    { id: 'p2', label: 'Fire suppression system tagged', type: 'yes_no', completed: true, value: true },
    { id: 'p3', label: 'Area clear of obstructions', type: 'pass_fail', completed: true, value: true },
    { id: 'p4', label: 'Grease containment in place', type: 'pass_fail', completed: false, value: null },
    { id: 'p5', label: 'Before photos captured', type: 'photo_required', completed: true, photoTaken: true, value: null },
    { id: 'p6', label: 'Initial grease depth (inches)', type: 'measurement', completed: false, value: null, unit: 'in' },
    { id: 'p7', label: 'Hood condition rating', type: 'rating', completed: false, value: null },
    { id: 'p8', label: 'Additional access notes', type: 'text', completed: false, value: null },
    { id: 'p9', label: 'Exhaust fan operational', type: 'pass_fail', completed: true, value: true },
    { id: 'p10', label: 'Make-up air unit operational', type: 'pass_fail', completed: true, value: true },
    { id: 'p11', label: 'Ductwork access panels identified', type: 'yes_no', completed: true, value: true },
    { id: 'p12', label: 'Customer walkthrough complete', type: 'pass_fail', completed: true, value: true },
  ],
  during: [
    { id: 'd1', label: 'Chemical application complete', type: 'pass_fail', completed: false, value: null },
    { id: 'd2', label: 'Scraping complete', type: 'pass_fail', completed: false, value: null },
    { id: 'd3', label: 'Pressure wash complete', type: 'pass_fail', completed: false, value: null },
    { id: 'd4', label: 'During-service photos', type: 'photo_required', completed: false, photoTaken: false, value: null },
    { id: 'd5', label: 'Fan hinges condition', type: 'rating', completed: false, value: null },
  ],
  post: [
    { id: 'po1', label: 'Final grease depth (inches)', type: 'measurement', completed: false, value: null, unit: 'in' },
    { id: 'po2', label: 'All surfaces clean to bare metal', type: 'pass_fail', completed: false, value: null },
    { id: 'po3', label: 'Fire suppression nozzles clear', type: 'pass_fail', completed: false, value: null },
    { id: 'po4', label: 'After photos captured', type: 'photo_required', completed: false, photoTaken: false, value: null },
    { id: 'po5', label: 'Area cleaned and restored', type: 'pass_fail', completed: false, value: null },
    { id: 'po6', label: 'Customer sign-off walkthrough', type: 'pass_fail', completed: false, value: null },
    { id: 'po7', label: 'Service sticker applied', type: 'yes_no', completed: false, value: null },
    { id: 'po8', label: 'Equipment condition notes', type: 'text', completed: false, value: null },
    { id: 'po9', label: 'Overall cleanliness rating', type: 'rating', completed: false, value: null },
    { id: 'po10', label: 'Recommendations noted', type: 'text', completed: false, value: null },
  ],
};

const PHASE_LABELS: Record<Phase, string> = {
  pre: 'Pre-Inspection',
  during: 'During',
  post: 'Post-Inspection',
};

export function ChecklistScreen({
  route,
  navigation,
}: {
  route?: { params?: { jobId?: string; phase?: Phase } };
  navigation?: any;
}) {
  const jobId = route?.params?.jobId ?? 'job-103';
  const initialPhase = route?.params?.phase ?? 'pre';

  const [activePhase, setActivePhase] = useState<Phase>(initialPhase);
  const [items, setItems] = useState(DEMO_ITEMS);

  const currentItems = items[activePhase];
  const completedCount = currentItems.filter((i) => i.completed).length;
  const totalCount = currentItems.length;

  // TODO: Track elapsed time with useEffect interval
  const elapsedTime = '12:34';

  const updateItem = (itemId: string, updates: Partial<ChecklistItem>) => {
    setItems((prev) => ({
      ...prev,
      [activePhase]: prev[activePhase].map((item) =>
        item.id === itemId ? { ...item, ...updates } : item,
      ),
    }));
  };

  const handlePassFail = (itemId: string, passed: boolean) => {
    updateItem(itemId, { value: passed, completed: true });
    if (!passed) {
      // TODO: Show deficiency creation prompt
      // navigation.navigate('Deficiencies', { jobId, createNew: true, itemId })
    }
  };

  const handleYesNo = (itemId: string, yes: boolean) => {
    updateItem(itemId, { value: yes, completed: true });
  };

  const handleRating = (itemId: string, rating: number) => {
    updateItem(itemId, { value: rating, completed: true });
  };

  const handleMeasurement = (itemId: string, val: string) => {
    const num = parseFloat(val);
    updateItem(itemId, {
      value: val,
      completed: val.length > 0 && !isNaN(num),
    });
  };

  const handleTextInput = (itemId: string, text: string) => {
    updateItem(itemId, { value: text, completed: text.trim().length > 0 });
  };

  const handlePhotoCapture = (itemId: string) => {
    // TODO: navigation.navigate('PhotoCapture', { jobId, checklistItemId: itemId })
    updateItem(itemId, { photoTaken: true, completed: true });
  };

  const handleSaveExit = () => {
    // TODO: Save checklist state to local storage / API
    // navigation.goBack()
  };

  const renderItemInput = (item: ChecklistItem) => {
    switch (item.type) {
      case 'pass_fail':
        return (
          <View style={styles.passFailRow}>
            <TouchableOpacity
              style={[
                styles.passFailBtn,
                item.value === true && styles.passBtn,
              ]}
              onPress={() => handlePassFail(item.id, true)}
            >
              <Text
                style={[
                  styles.passFailBtnText,
                  item.value === true && styles.passBtnText,
                ]}
              >
                Pass
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.passFailBtn,
                item.value === false && styles.failBtn,
              ]}
              onPress={() => handlePassFail(item.id, false)}
            >
              <Text
                style={[
                  styles.passFailBtnText,
                  item.value === false && styles.failBtnText,
                ]}
              >
                Fail
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'yes_no':
        return (
          <View style={styles.passFailRow}>
            <TouchableOpacity
              style={[
                styles.passFailBtn,
                item.value === true && styles.passBtn,
              ]}
              onPress={() => handleYesNo(item.id, true)}
            >
              <Text
                style={[
                  styles.passFailBtnText,
                  item.value === true && styles.passBtnText,
                ]}
              >
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.passFailBtn,
                item.value === false && styles.failBtn,
              ]}
              onPress={() => handleYesNo(item.id, false)}
            >
              <Text
                style={[
                  styles.passFailBtnText,
                  item.value === false && styles.failBtnText,
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
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                style={[
                  styles.starBtn,
                  typeof item.value === 'number' && star <= item.value && styles.starActive,
                ]}
                onPress={() => handleRating(item.id, star)}
              >
                <Text
                  style={[
                    styles.starText,
                    typeof item.value === 'number' && star <= item.value && styles.starTextActive,
                  ]}
                >
                  {star}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'measurement':
        return (
          <View style={styles.measurementRow}>
            <TextInput
              style={styles.measurementInput}
              keyboardType="decimal-pad"
              placeholder="0.0"
              placeholderTextColor={TEXT_TERTIARY}
              value={item.value != null ? String(item.value) : ''}
              onChangeText={(val) => handleMeasurement(item.id, val)}
            />
            {item.unit && <Text style={styles.measurementUnit}>{item.unit}</Text>}
          </View>
        );

      case 'text':
        return (
          <TextInput
            style={styles.textInput}
            placeholder="Enter notes..."
            placeholderTextColor={TEXT_TERTIARY}
            multiline
            value={item.value != null ? String(item.value) : ''}
            onChangeText={(val) => handleTextInput(item.id, val)}
          />
        );

      case 'photo_required':
        return (
          <TouchableOpacity
            style={[
              styles.photoCaptureBtn,
              item.photoTaken && styles.photoCaptureDone,
            ]}
            onPress={() => handlePhotoCapture(item.id)}
          >
            <Text
              style={[
                styles.photoCaptureBtnText,
                item.photoTaken && styles.photoCaptureDoneText,
              ]}
            >
              {item.photoTaken ? 'Photo Captured' : 'Take Photo'}
            </Text>
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Phase tabs ──────────────────────────────────── */}
      <View style={styles.phaseTabs}>
        {(['pre', 'during', 'post'] as Phase[]).map((phase) => (
          <TouchableOpacity
            key={phase}
            style={[styles.phaseTab, activePhase === phase && styles.phaseTabActive]}
            onPress={() => setActivePhase(phase)}
          >
            <Text
              style={[
                styles.phaseTabText,
                activePhase === phase && styles.phaseTabTextActive,
              ]}
            >
              {PHASE_LABELS[phase]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Progress header ─────────────────────────────── */}
      <View style={styles.progressHeader}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {completedCount} of {totalCount} items
          </Text>
          <Text style={styles.elapsedText}>{elapsedTime} elapsed</Text>
        </View>
        <TouchableOpacity style={styles.saveExitBtn} onPress={handleSaveExit}>
          <Text style={styles.saveExitBtnText}>Save & Exit</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` },
          ]}
        />
      </View>

      {/* ── Checklist items ─────────────────────────────── */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {currentItems.map((item) => (
          <View
            key={item.id}
            style={[styles.itemCard, item.completed && styles.itemCardCompleted]}
          >
            {/* Item label */}
            <View style={styles.itemHeader}>
              <View
                style={[
                  styles.checkbox,
                  item.completed && styles.checkboxChecked,
                ]}
              >
                {item.completed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text
                style={[
                  styles.itemLabel,
                  item.completed && styles.itemLabelCompleted,
                ]}
              >
                {item.label}
              </Text>
            </View>

            {/* Type-specific input */}
            {renderItemInput(item)}

            {/* Per-item action buttons */}
            <View style={styles.itemActions}>
              <TouchableOpacity
                style={styles.itemActionBtn}
                onPress={() => {
                  // TODO: Open voice note recorder
                }}
              >
                <Text style={styles.itemActionBtnText}>Voice Note</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.itemActionBtn}
                onPress={() => {
                  // TODO: navigation.navigate('PhotoCapture', { jobId, itemId: item.id })
                }}
              >
                <Text style={styles.itemActionBtnText}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.itemActionBtn}
                onPress={() => {
                  // TODO: Show inline notes input
                }}
              >
                <Text style={styles.itemActionBtnText}>Notes</Text>
              </TouchableOpacity>
            </View>
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

  // Phase tabs
  phaseTabs: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  phaseTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
  },
  phaseTabActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  phaseTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  phaseTabTextActive: {
    color: WHITE,
  },

  // Progress header
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  elapsedText: {
    fontSize: 14,
    color: TEXT_TERTIARY,
  },
  saveExitBtn: {
    borderWidth: 1,
    borderColor: BRAND,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveExitBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: BRAND,
  },

  // Progress bar
  progressBar: {
    height: 4,
    backgroundColor: BORDER,
    marginHorizontal: 16,
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: SUCCESS,
    borderRadius: 2,
  },

  // List
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Item card
  itemCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  itemCardCompleted: {
    borderColor: SUCCESS,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: BORDER,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: SUCCESS,
    borderColor: SUCCESS,
  },
  checkmark: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '700',
  },
  itemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  itemLabelCompleted: {
    color: TEXT_TERTIARY,
  },

  // Pass / Fail
  passFailRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  passFailBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
  },
  passFailBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_SECONDARY,
  },
  passBtn: {
    backgroundColor: '#DCFCE7',
    borderColor: SUCCESS,
  },
  passBtnText: {
    color: SUCCESS,
  },
  failBtn: {
    backgroundColor: '#FEE2E2',
    borderColor: DANGER,
  },
  failBtnText: {
    color: DANGER,
  },

  // Rating
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  starBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  starText: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_TERTIARY,
  },
  starTextActive: {
    color: WHITE,
  },

  // Measurement
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  measurementInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: TEXT_PRIMARY,
    backgroundColor: WHITE,
  },
  measurementUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },

  // Text input
  textInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_PRIMARY,
    backgroundColor: WHITE,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 8,
  },

  // Photo capture
  photoCaptureBtn: {
    borderWidth: 1,
    borderColor: BRAND,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
    borderStyle: 'dashed',
  },
  photoCaptureDone: {
    backgroundColor: '#DCFCE7',
    borderColor: SUCCESS,
    borderStyle: 'solid',
  },
  photoCaptureBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND,
  },
  photoCaptureDoneText: {
    color: SUCCESS,
  },

  // Item actions
  itemActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: LIGHT_BG,
    paddingTop: 8,
  },
  itemActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: LIGHT_BG,
  },
  itemActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
});
