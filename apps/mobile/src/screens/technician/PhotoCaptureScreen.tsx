import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';

// ── Brand tokens ──────────────────────────────────────────────
const BRAND = '#1e4d6b';
const GOLD = '#d4af37';
const WHITE = '#ffffff';
const BLACK = '#000000';
const LIGHT_BG = '#F4F6FA';
const CARD_BG = '#ffffff';
const TEXT_PRIMARY = '#0B1628';
const TEXT_SECONDARY = '#3D5068';
const TEXT_TERTIARY = '#6B7F96';
const BORDER = '#D1D9E6';
const SUCCESS = '#16a34a';
const DANGER = '#dc2626';
const WARNING = '#f59e0b';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ── Types ─────────────────────────────────────────────────────
type PhotoPhase = 'before' | 'during' | 'after';

interface CapturedPhoto {
  id: string;
  uri: string; // TODO: Replace with actual camera URI
  phase: PhotoPhase;
  equipment?: string;
  timestamp: string;
}

// ── Placeholder data ─────────────────────────────────────────
// TODO: Replace with usePhotos(jobId) hook
const DEMO_EQUIPMENT = [
  { id: 'eq-1', name: 'Primary Exhaust Hood' },
  { id: 'eq-2', name: 'Secondary Exhaust Hood' },
  { id: 'eq-3', name: 'Grease Trap' },
  { id: 'eq-4', name: 'Fire Suppression' },
];

export function PhotoCaptureScreen({
  route,
  navigation,
}: {
  route?: { params?: { jobId?: string } };
  navigation?: any;
}) {
  const jobId = route?.params?.jobId ?? 'job-103';

  const [mode, setMode] = useState<'camera' | 'review' | 'compare'>('camera');
  const [selectedPhase, setSelectedPhase] = useState<PhotoPhase>('before');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>(
    DEMO_EQUIPMENT[0].id,
  );
  const [flashOn, setFlashOn] = useState(false);
  const [gridOn, setGridOn] = useState(true);
  const [showEquipmentPicker, setShowEquipmentPicker] = useState(false);

  // Review mode state
  const [reviewPhoto, setReviewPhoto] = useState<CapturedPhoto | null>(null);

  // AI analysis placeholder
  const [aiAnalysis] = useState({
    greaseLevel: 'Heavy',
    detectedIssues: ['Grease buildup exceeds 1/4 inch', 'Discoloration on filter'],
    conditionRating: 2, // 1-5
  });

  const handleCapture = () => {
    // TODO: Use expo-camera ref.takePictureAsync()
    const photo: CapturedPhoto = {
      id: `photo-${Date.now()}`,
      uri: '', // placeholder
      phase: selectedPhase,
      equipment: DEMO_EQUIPMENT.find((e) => e.id === selectedEquipmentId)?.name,
      timestamp: new Date().toISOString(),
    };
    setReviewPhoto(photo);
    setMode('review');
  };

  const handleSavePhoto = () => {
    // TODO: Save photo to local storage / upload queue
    setReviewPhoto(null);
    setMode('camera');
  };

  const handleRetake = () => {
    setReviewPhoto(null);
    setMode('camera');
  };

  const handleCreateDeficiency = () => {
    // TODO: navigation.navigate('Deficiencies', { jobId, photoUri: reviewPhoto?.uri })
  };

  // ── Camera Mode ─────────────────────────────────────────────
  if (mode === 'camera') {
    return (
      <SafeAreaView style={styles.cameraContainer}>
        {/* Camera viewfinder placeholder */}
        <View style={styles.cameraView}>
          <Text style={styles.cameraPlaceholderText}>
            Camera Preview
          </Text>
          <Text style={styles.cameraSubText}>
            expo-camera viewfinder renders here
          </Text>

          {/* Grid overlay */}
          {gridOn && (
            <View style={styles.gridOverlay}>
              <View style={[styles.gridLine, styles.gridLineH1]} />
              <View style={[styles.gridLine, styles.gridLineH2]} />
              <View style={[styles.gridLine, styles.gridLineV1]} />
              <View style={[styles.gridLine, styles.gridLineV2]} />
            </View>
          )}
        </View>

        {/* Phase selector pills */}
        <View style={styles.phasePills}>
          {(['before', 'during', 'after'] as PhotoPhase[]).map((phase) => (
            <TouchableOpacity
              key={phase}
              style={[
                styles.phasePill,
                selectedPhase === phase && styles.phasePillActive,
              ]}
              onPress={() => setSelectedPhase(phase)}
            >
              <Text
                style={[
                  styles.phasePillText,
                  selectedPhase === phase && styles.phasePillTextActive,
                ]}
              >
                {phase.charAt(0).toUpperCase() + phase.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Equipment selector */}
        <TouchableOpacity
          style={styles.equipmentSelector}
          onPress={() => setShowEquipmentPicker(!showEquipmentPicker)}
        >
          <Text style={styles.equipmentSelectorText}>
            {DEMO_EQUIPMENT.find((e) => e.id === selectedEquipmentId)?.name ??
              'Select Equipment'}
          </Text>
          <Text style={styles.dropdownArrow}>{showEquipmentPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showEquipmentPicker && (
          <View style={styles.equipmentDropdown}>
            {DEMO_EQUIPMENT.map((eq) => (
              <TouchableOpacity
                key={eq.id}
                style={[
                  styles.equipmentOption,
                  selectedEquipmentId === eq.id && styles.equipmentOptionActive,
                ]}
                onPress={() => {
                  setSelectedEquipmentId(eq.id);
                  setShowEquipmentPicker(false);
                }}
              >
                <Text style={styles.equipmentOptionText}>{eq.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Controls bar */}
        <View style={styles.controlsBar}>
          {/* Flash toggle */}
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => setFlashOn(!flashOn)}
          >
            <Text style={styles.controlIcon}>{flashOn ? '⚡' : '⚡'}</Text>
            <Text style={[styles.controlLabel, flashOn && styles.controlLabelActive]}>
              {flashOn ? 'On' : 'Off'}
            </Text>
          </TouchableOpacity>

          {/* Capture button */}
          <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>

          {/* Grid toggle */}
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => setGridOn(!gridOn)}
          >
            <Text style={styles.controlIcon}>▦</Text>
            <Text style={[styles.controlLabel, gridOn && styles.controlLabelActive]}>
              Grid
            </Text>
          </TouchableOpacity>
        </View>

        {/* Compare mode button */}
        <TouchableOpacity
          style={styles.compareModeBtn}
          onPress={() => setMode('compare')}
        >
          <Text style={styles.compareModeBtnText}>Before / After Compare</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Review Mode ─────────────────────────────────────────────
  if (mode === 'review') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.reviewContent}>
          {/* Photo preview placeholder */}
          <View style={styles.reviewPhoto}>
            <Text style={styles.cameraPlaceholderText}>Captured Photo</Text>
            <Text style={styles.reviewMeta}>
              {reviewPhoto?.phase?.toUpperCase()} | {reviewPhoto?.equipment}
            </Text>
          </View>

          {/* AI Analysis overlay */}
          <View style={styles.aiOverlay}>
            <Text style={styles.aiOverlayTitle}>AI Analysis</Text>
            <View style={styles.aiRow}>
              <Text style={styles.aiLabel}>Grease Level:</Text>
              <View style={[styles.aiBadge, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.aiBadgeText, { color: DANGER }]}>
                  {aiAnalysis.greaseLevel}
                </Text>
              </View>
            </View>
            <View style={styles.aiRow}>
              <Text style={styles.aiLabel}>Condition:</Text>
              <View style={styles.ratingDots}>
                {[1, 2, 3, 4, 5].map((dot) => (
                  <View
                    key={dot}
                    style={[
                      styles.ratingDot,
                      dot <= aiAnalysis.conditionRating
                        ? styles.ratingDotFilled
                        : styles.ratingDotEmpty,
                    ]}
                  />
                ))}
              </View>
            </View>
            <Text style={styles.aiIssuesTitle}>Detected Issues:</Text>
            {aiAnalysis.detectedIssues.map((issue, i) => (
              <Text key={i} style={styles.aiIssue}>
                {'\u2022'} {issue}
              </Text>
            ))}

            {/* AI action buttons */}
            <View style={styles.aiActions}>
              <TouchableOpacity
                style={styles.createDefBtn}
                onPress={handleCreateDeficiency}
              >
                <Text style={styles.createDefBtnText}>Create Deficiency</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dismissBtn}
                onPress={() => {
                  // Dismiss AI suggestion, keep photo
                }}
              >
                <Text style={styles.dismissBtnText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Note buttons */}
          <View style={styles.noteButtonsRow}>
            <TouchableOpacity style={styles.noteBtn}>
              <Text style={styles.noteBtnText}>Voice Note</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.noteBtn}>
              <Text style={styles.noteBtnText}>Text Note</Text>
            </TouchableOpacity>
          </View>

          {/* Retake / Save */}
          <View style={styles.reviewActions}>
            <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
              <Text style={styles.retakeBtnText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSavePhoto}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Compare Mode ────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.compareHeader}>
        <Text style={styles.compareTitle}>Before / After</Text>
        <TouchableOpacity onPress={() => setMode('camera')}>
          <Text style={styles.compareDone}>Done</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.compareContainer}>
        <View style={styles.compareSide}>
          <View style={styles.comparePlaceholder}>
            <Text style={styles.comparePhaseLabel}>Before</Text>
          </View>
        </View>
        <View style={styles.compareDivider} />
        <View style={styles.compareSide}>
          <View style={styles.comparePlaceholder}>
            <Text style={styles.comparePhaseLabel}>After</Text>
          </View>
        </View>
      </View>
      {/* Improvement percentage */}
      <View style={styles.improvementBanner}>
        <Text style={styles.improvementText}>Improvement: 85%</Text>
        {/* TODO: Calculate from AI grease level comparison */}
      </View>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },

  // Camera mode
  cameraContainer: {
    flex: 1,
    backgroundColor: BLACK,
  },
  cameraView: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cameraPlaceholderText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: '600',
  },
  cameraSubText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 4,
  },

  // Grid overlay
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  gridLineH1: {
    left: 0,
    right: 0,
    top: '33.3%',
    height: 1,
  },
  gridLineH2: {
    left: 0,
    right: 0,
    top: '66.6%',
    height: 1,
  },
  gridLineV1: {
    top: 0,
    bottom: 0,
    left: '33.3%',
    width: 1,
  },
  gridLineV2: {
    top: 0,
    bottom: 0,
    left: '66.6%',
    width: 1,
  },

  // Phase pills
  phasePills: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: BLACK,
  },
  phasePill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  phasePillActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  phasePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  phasePillTextActive: {
    color: TEXT_PRIMARY,
  },

  // Equipment selector
  equipmentSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  equipmentSelectorText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownArrow: {
    color: WHITE,
    fontSize: 10,
  },
  equipmentDropdown: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    overflow: 'hidden',
  },
  equipmentOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  equipmentOptionActive: {
    backgroundColor: 'rgba(212,175,55,0.2)',
  },
  equipmentOptionText: {
    color: WHITE,
    fontSize: 14,
  },

  // Controls bar
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 16,
    backgroundColor: BLACK,
  },
  controlBtn: {
    alignItems: 'center',
    width: 60,
  },
  controlIcon: {
    fontSize: 22,
    color: WHITE,
    marginBottom: 4,
  },
  controlLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },
  controlLabelActive: {
    color: GOLD,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: WHITE,
  },

  // Compare mode button
  compareModeBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingBottom: 28,
    backgroundColor: BLACK,
  },
  compareModeBtnText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '600',
  },

  // Review mode
  reviewContent: {
    padding: 16,
    paddingBottom: 32,
  },
  reviewPhoto: {
    height: 280,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  reviewMeta: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 8,
  },

  // AI overlay
  aiOverlay: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  aiOverlayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 10,
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  aiLabel: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  aiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ratingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  ratingDotFilled: {
    backgroundColor: DANGER,
  },
  ratingDotEmpty: {
    backgroundColor: BORDER,
  },
  aiIssuesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    marginTop: 6,
    marginBottom: 4,
  },
  aiIssue: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: 2,
    paddingLeft: 4,
  },
  aiActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  createDefBtn: {
    flex: 1,
    backgroundColor: DANGER,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  createDefBtnText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
  },
  dismissBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dismissBtnText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '600',
  },

  // Note buttons
  noteButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  noteBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: BRAND,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  noteBtnText: {
    color: BRAND,
    fontSize: 13,
    fontWeight: '600',
  },

  // Review actions
  reviewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retakeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  retakeBtnText: {
    color: TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: SUCCESS,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '700',
  },

  // Compare mode
  compareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  compareTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  compareDone: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND,
  },
  compareContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 2,
  },
  compareSide: {
    flex: 1,
  },
  comparePlaceholder: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareDivider: {
    width: 2,
    backgroundColor: GOLD,
  },
  comparePhaseLabel: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
  improvementBanner: {
    backgroundColor: SUCCESS,
    margin: 16,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  improvementText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
});
