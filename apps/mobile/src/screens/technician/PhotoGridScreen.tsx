import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

const BRAND = {
  primary: '#1e4d6b',
  gold: '#d4af37',
  darkBg: '#07111F',
  lightBg: '#F4F6FA',
  cardBg: '#0B1628',
  white: '#FFFFFF',
  green: '#166534',
  greenLight: '#DCFCE7',
  orange: '#F59E0B',
  orangeLight: '#FEF3C7',
  red: '#DC2626',
  gray: '#6B7F96',
  grayLight: '#D1D9E6',
  textPrimary: '#0B1628',
  textSecondary: '#3D5068',
};

interface ComponentDef {
  key: string;
  label: string;
}

const COMPONENTS: ComponentDef[] = [
  { key: 'filter_tract', label: 'Filter Tract' },
  { key: 'hood_interior', label: 'Hood Interior' },
  { key: 'vertical_duct', label: 'Vertical Duct' },
  { key: 'horizontal_duct', label: 'Horizontal Duct' },
  { key: 'plenum', label: 'Plenum' },
  { key: 'fan_blades', label: 'Fan Blades' },
  { key: 'fan_bowl', label: 'Fan Bowl' },
];

interface PhotoEntry {
  component: string;
  phase: 'before' | 'after';
  uri: string;
  timestamp: string;
}

interface NoAccessMap {
  [componentKey: string]: boolean;
}

function canCompleteReport(photos: PhotoEntry[], noAccessMap: NoAccessMap): boolean {
  for (const comp of COMPONENTS) {
    if (noAccessMap[comp.key]) continue;
    const before = photos.find(p => p.component === comp.key && p.phase === 'before');
    const after = photos.find(p => p.component === comp.key && p.phase === 'after');
    if (!before || !after) return false;
  }
  return true;
}

function getMissingCount(photos: PhotoEntry[], noAccessMap: NoAccessMap): number {
  let missing = 0;
  for (const comp of COMPONENTS) {
    if (noAccessMap[comp.key]) continue;
    const before = photos.find(p => p.component === comp.key && p.phase === 'before');
    const after = photos.find(p => p.component === comp.key && p.phase === 'after');
    if (!before) missing++;
    if (!after) missing++;
  }
  return missing;
}

function getCapturedCount(photos: PhotoEntry[], noAccessMap: NoAccessMap): number {
  let total = 0;
  for (const comp of COMPONENTS) {
    if (noAccessMap[comp.key]) continue;
    const before = photos.find(p => p.component === comp.key && p.phase === 'before');
    const after = photos.find(p => p.component === comp.key && p.phase === 'after');
    if (before) total++;
    if (after) total++;
  }
  return total;
}

function getRequiredCount(noAccessMap: NoAccessMap): number {
  let total = 0;
  for (const comp of COMPONENTS) {
    if (!noAccessMap[comp.key]) total += 2;
  }
  return total;
}

export function PhotoGridScreen() {
  // Demo: plenum has no photos, fan_blades missing after
  const [photos, setPhotos] = useState<PhotoEntry[]>([
    { component: 'filter_tract', phase: 'before', uri: 'demo://filter_tract_before.jpg', timestamp: '2026-03-14T08:12:00Z' },
    { component: 'filter_tract', phase: 'after', uri: 'demo://filter_tract_after.jpg', timestamp: '2026-03-14T09:45:00Z' },
    { component: 'hood_interior', phase: 'before', uri: 'demo://hood_interior_before.jpg', timestamp: '2026-03-14T08:14:00Z' },
    { component: 'hood_interior', phase: 'after', uri: 'demo://hood_interior_after.jpg', timestamp: '2026-03-14T09:48:00Z' },
    { component: 'vertical_duct', phase: 'before', uri: 'demo://vertical_duct_before.jpg', timestamp: '2026-03-14T08:18:00Z' },
    { component: 'vertical_duct', phase: 'after', uri: 'demo://vertical_duct_after.jpg', timestamp: '2026-03-14T09:52:00Z' },
    { component: 'horizontal_duct', phase: 'before', uri: 'demo://horizontal_duct_before.jpg', timestamp: '2026-03-14T08:22:00Z' },
    { component: 'horizontal_duct', phase: 'after', uri: 'demo://horizontal_duct_after.jpg', timestamp: '2026-03-14T09:56:00Z' },
    { component: 'fan_blades', phase: 'before', uri: 'demo://fan_blades_before.jpg', timestamp: '2026-03-14T08:28:00Z' },
    { component: 'fan_bowl', phase: 'before', uri: 'demo://fan_bowl_before.jpg', timestamp: '2026-03-14T08:30:00Z' },
    { component: 'fan_bowl', phase: 'after', uri: 'demo://fan_bowl_after.jpg', timestamp: '2026-03-14T10:02:00Z' },
  ]);

  const [noAccessMap] = useState<NoAccessMap>({
    filter_tract: false,
    hood_interior: false,
    vertical_duct: false,
    horizontal_duct: false,
    plenum: false,
    fan_blades: false,
    fan_bowl: false,
  });

  const capturedCount = getCapturedCount(photos, noAccessMap);
  const requiredCount = getRequiredCount(noAccessMap);
  const missingCount = getMissingCount(photos, noAccessMap);
  const isComplete = canCompleteReport(photos, noAccessMap);
  const progressPercent = requiredCount > 0 ? (capturedCount / requiredCount) * 100 : 0;

  const handleCapture = (componentKey: string, phase: 'before' | 'after') => {
    const existing = photos.find(
      p => p.component === componentKey && p.phase === phase
    );
    if (existing) {
      Alert.alert('Photo Exists', 'This photo has already been captured. Retake?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retake',
          onPress: () => {
            Alert.alert('Camera', `Camera would open for ${componentKey} (${phase}).`);
          },
        },
      ]);
      return;
    }

    Alert.alert(
      'Capture Photo',
      `Camera would open for ${componentKey} (${phase}).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Simulate Capture',
          onPress: () => {
            setPhotos(prev => [
              ...prev,
              {
                component: componentKey,
                phase,
                uri: `demo://${componentKey}_${phase}.jpg`,
                timestamp: new Date().toISOString(),
              },
            ]);
          },
        },
      ]
    );
  };

  const handleContinue = () => {
    if (!isComplete) {
      Alert.alert(
        'Photos Incomplete',
        `${missingCount} more photo${missingCount !== 1 ? 's' : ''} required before submitting.`,
        [{ text: 'OK' }]
      );
      return;
    }
    Alert.alert('Continue', 'Navigating to Review & Sign screen...', [
      { text: 'OK' },
    ]);
  };

  const hasPhoto = (componentKey: string, phase: 'before' | 'after'): boolean =>
    photos.some(p => p.component === componentKey && p.phase === phase);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => Alert.alert('Back', 'Navigate to ReportNavigator')}
        >
          <Text style={styles.backArrow}>{'\u2039'}</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Photo Documentation</Text>
          <Text style={styles.headerSubtitle}>
            {capturedCount}/{requiredCount} photos captured
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: isComplete ? BRAND.green : BRAND.primary,
              },
            ]}
          />
        </View>
      </View>

      {/* Photo Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {COMPONENTS.map(comp => {
          const isNoAccess = noAccessMap[comp.key];
          const hasBefore = hasPhoto(comp.key, 'before');
          const hasAfter = hasPhoto(comp.key, 'after');

          return (
            <View key={comp.key} style={styles.componentRow}>
              <View style={styles.componentLabelRow}>
                <Text
                  style={[
                    styles.componentLabel,
                    isNoAccess && styles.componentLabelDisabled,
                  ]}
                >
                  {comp.label}
                </Text>
                {hasBefore && hasAfter && !isNoAccess && (
                  <View style={styles.completeBadge}>
                    <Text style={styles.completeBadgeText}>{'\u2713'} Complete</Text>
                  </View>
                )}
                {isNoAccess && (
                  <View style={styles.noAccessBadge}>
                    <Text style={styles.noAccessBadgeText}>No Access</Text>
                  </View>
                )}
              </View>

              <View style={styles.photoSlotsRow}>
                {/* Before Slot */}
                <TouchableOpacity
                  style={[
                    styles.photoSlot,
                    hasBefore && styles.photoSlotCaptured,
                    isNoAccess && styles.photoSlotNoAccess,
                  ]}
                  onPress={() => !isNoAccess && handleCapture(comp.key, 'before')}
                  activeOpacity={isNoAccess ? 1 : 0.7}
                  disabled={isNoAccess}
                >
                  {isNoAccess ? (
                    <>
                      <Text style={styles.noAccessIcon}>{'\uD83D\uDEAB'}</Text>
                      <Text style={styles.noAccessSlotText}>No Access</Text>
                    </>
                  ) : hasBefore ? (
                    <>
                      <View style={styles.capturedIconContainer}>
                        <Text style={styles.capturedCheck}>{'\u2713'}</Text>
                      </View>
                      <Text style={styles.capturedLabel}>Before</Text>
                      <Text style={styles.capturedHint}>Tap to retake</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.cameraIcon}>{'\uD83D\uDCF7'}</Text>
                      <Text style={styles.emptySlotLabel}>Before</Text>
                      <Text style={styles.emptySlotHint}>Tap to capture</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* After Slot */}
                <TouchableOpacity
                  style={[
                    styles.photoSlot,
                    hasAfter && styles.photoSlotCaptured,
                    isNoAccess && styles.photoSlotNoAccess,
                  ]}
                  onPress={() => !isNoAccess && handleCapture(comp.key, 'after')}
                  activeOpacity={isNoAccess ? 1 : 0.7}
                  disabled={isNoAccess}
                >
                  {isNoAccess ? (
                    <>
                      <Text style={styles.noAccessIcon}>{'\uD83D\uDEAB'}</Text>
                      <Text style={styles.noAccessSlotText}>No Access</Text>
                    </>
                  ) : hasAfter ? (
                    <>
                      <View style={styles.capturedIconContainer}>
                        <Text style={styles.capturedCheck}>{'\u2713'}</Text>
                      </View>
                      <Text style={styles.capturedLabel}>After</Text>
                      <Text style={styles.capturedHint}>Tap to retake</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.cameraIcon}>{'\uD83D\uDCF7'}</Text>
                      <Text style={styles.emptySlotLabel}>After</Text>
                      <Text style={styles.emptySlotHint}>Tap to capture</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        {!isComplete && (
          <Text style={styles.warningText}>
            {missingCount} more photo{missingCount !== 1 ? 's' : ''} required before submitting
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.continueButton,
            !isComplete && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          activeOpacity={0.8}
          disabled={!isComplete}
        >
          <Text
            style={[
              styles.continueButtonText,
              !isComplete && styles.continueButtonTextDisabled,
            ]}
          >
            Continue to Review
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.lightBg,
  },
  header: {
    backgroundColor: BRAND.darkBg,
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backArrow: {
    fontSize: 26,
    color: BRAND.white,
    marginTop: -2,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: BRAND.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: BRAND.gray,
    marginTop: 2,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BRAND.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#E8EDF5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  componentRow: {
    backgroundColor: BRAND.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  componentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  componentLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: BRAND.textPrimary,
  },
  componentLabelDisabled: {
    color: BRAND.gray,
  },
  completeBadge: {
    backgroundColor: BRAND.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND.green,
  },
  noAccessBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  noAccessBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: BRAND.gray,
  },
  photoSlotsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoSlot: {
    flex: 1,
    height: 120,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: BRAND.grayLight,
    backgroundColor: '#FAFBFE',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoSlotCaptured: {
    borderStyle: 'solid',
    borderColor: BRAND.green,
    backgroundColor: '#F0FDF4',
  },
  photoSlotNoAccess: {
    borderStyle: 'solid',
    borderColor: '#E8EDF5',
    backgroundColor: '#F8F9FC',
  },
  cameraIcon: {
    fontSize: 28,
  },
  emptySlotLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.textSecondary,
  },
  emptySlotHint: {
    fontSize: 11,
    color: BRAND.gray,
  },
  capturedIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capturedCheck: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND.green,
  },
  capturedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.green,
  },
  capturedHint: {
    fontSize: 11,
    color: BRAND.gray,
  },
  noAccessIcon: {
    fontSize: 24,
  },
  noAccessSlotText: {
    fontSize: 12,
    color: BRAND.gray,
    fontWeight: '500',
  },
  bottomBar: {
    backgroundColor: BRAND.white,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    alignItems: 'center',
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND.orange,
    marginBottom: 10,
  },
  continueButton: {
    backgroundColor: BRAND.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  continueButtonDisabled: {
    backgroundColor: '#B8C4D8',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND.white,
  },
  continueButtonTextDisabled: {
    color: '#E8EDF5',
  },
});
