import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
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
  redLight: '#FEE2E2',
  gray: '#6B7F96',
  grayLight: '#D1D9E6',
  textPrimary: '#0B1628',
  textSecondary: '#3D5068',
};

interface ComponentConfig {
  key: string;
  label: string;
}

const COMPONENTS: ComponentConfig[] = [
  { key: 'filter_tract', label: 'Filter Tract' },
  { key: 'hood_interior', label: 'Hood Interior' },
  { key: 'vertical_duct', label: 'Vertical Duct' },
  { key: 'horizontal_duct', label: 'Horizontal Duct' },
  { key: 'plenum', label: 'Plenum' },
  { key: 'fan_blades', label: 'Fan Blades' },
  { key: 'fan_bowl', label: 'Fan Bowl' },
];

interface BeforeAfterOption {
  label: string;
  value: string;
  color: string;
}

const BEFORE_OPTIONS: BeforeAfterOption[] = [
  { label: 'Normal', value: 'normal', color: BRAND.green },
  { label: 'Heavy', value: 'heavy', color: BRAND.orange },
  { label: 'Extreme', value: 'extreme', color: BRAND.red },
];

const AFTER_OPTIONS: BeforeAfterOption[] = [
  { label: 'Bare Metal', value: 'bare_metal', color: BRAND.green },
  { label: 'N/A', value: 'na', color: BRAND.gray },
];

interface ComponentState {
  before: string | null;
  after: string | null;
  noAccess: boolean;
  noAccessReason: string;
}

type GreaseState = Record<string, ComponentState>;

const INITIAL_STATE: GreaseState = {
  filter_tract: { before: 'normal', after: 'bare_metal', noAccess: false, noAccessReason: '' },
  hood_interior: { before: 'normal', after: 'bare_metal', noAccess: false, noAccessReason: '' },
  vertical_duct: { before: 'normal', after: 'bare_metal', noAccess: false, noAccessReason: '' },
  horizontal_duct: { before: null, after: null, noAccess: false, noAccessReason: '' },
  plenum: { before: null, after: null, noAccess: false, noAccessReason: '' },
  fan_blades: { before: null, after: null, noAccess: false, noAccessReason: '' },
  fan_bowl: { before: null, after: null, noAccess: false, noAccessReason: '' },
};

export function GreaseLevelsScreen() {
  const [greaseData, setGreaseData] = useState<GreaseState>(INITIAL_STATE);

  const updateComponent = (
    componentKey: string,
    field: keyof ComponentState,
    value: string | boolean
  ) => {
    setGreaseData(prev => ({
      ...prev,
      [componentKey]: {
        ...prev[componentKey],
        [field]: value,
      },
    }));
  };

  const filledCount = Object.values(greaseData).filter(
    c => c.noAccess || (c.before !== null && c.after !== null)
  ).length;

  const handleSave = () => {
    Alert.alert(
      'Grease Levels Saved',
      `${filledCount}/${COMPONENTS.length} components recorded.`,
      [{ text: 'OK' }]
    );
  };

  const renderChips = (
    options: BeforeAfterOption[],
    selected: string | null,
    disabled: boolean,
    onSelect: (value: string) => void
  ) => (
    <View style={styles.chipRow}>
      {options.map(opt => {
        const isSelected = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.chip,
              isSelected && { backgroundColor: opt.color, borderColor: opt.color },
              disabled && styles.chipDisabled,
            ]}
            onPress={() => !disabled && onSelect(opt.value)}
            activeOpacity={disabled ? 1 : 0.7}
            disabled={disabled}
          >
            <Text
              style={[
                styles.chipText,
                isSelected && styles.chipTextSelected,
                disabled && styles.chipTextDisabled,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => Alert.alert('Back', 'Navigate to ReportNavigator')}>
          <Text style={styles.backArrow}>{'\u2039'}</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Grease Levels</Text>
          <Text style={styles.headerSubtitle}>
            System 1 \u00B7 Hood #A-1 (Main Line)
          </Text>
        </View>
        <View style={styles.progressBadge}>
          <Text style={styles.progressBadgeText}>
            {filledCount}/{COMPONENTS.length}
          </Text>
        </View>
      </View>

      {/* Component Rows */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {COMPONENTS.map((comp, idx) => {
          const state = greaseData[comp.key];
          const isNoAccess = state.noAccess;
          const isExtreme = state.before === 'extreme';

          return (
            <View
              key={comp.key}
              style={[
                styles.componentCard,
                isNoAccess && styles.componentCardDisabled,
              ]}
            >
              {/* Component Header */}
              <View style={styles.componentHeader}>
                <View style={styles.componentLabelRow}>
                  <View style={styles.componentNumberCircle}>
                    <Text style={styles.componentNumberText}>{idx + 1}</Text>
                  </View>
                  <Text
                    style={[
                      styles.componentLabel,
                      isNoAccess && styles.componentLabelDisabled,
                    ]}
                  >
                    {comp.label}
                  </Text>
                </View>
                <View style={styles.noAccessRow}>
                  <Text style={styles.noAccessLabel}>No Access</Text>
                  <Switch
                    value={isNoAccess}
                    onValueChange={(val: boolean) =>
                      updateComponent(comp.key, 'noAccess', val)
                    }
                    trackColor={{ false: '#E8EDF5', true: BRAND.orange }}
                    thumbColor={BRAND.white}
                  />
                </View>
              </View>

              {/* No Access Reason */}
              {isNoAccess && (
                <View style={styles.noAccessReasonContainer}>
                  <Text style={styles.fieldLabel}>Reason for No Access</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., Sealed panel, equipment blocking"
                    placeholderTextColor={BRAND.grayLight}
                    value={state.noAccessReason}
                    onChangeText={(text: string) =>
                      updateComponent(comp.key, 'noAccessReason', text)
                    }
                  />
                </View>
              )}

              {/* Before / After Dropdowns */}
              {!isNoAccess && (
                <View style={styles.selectionsContainer}>
                  <View style={styles.selectionGroup}>
                    <Text style={styles.fieldLabel}>Before Cleaning</Text>
                    {renderChips(BEFORE_OPTIONS, state.before, isNoAccess, val =>
                      updateComponent(comp.key, 'before', val)
                    )}
                  </View>
                  <View style={styles.selectionGroup}>
                    <Text style={styles.fieldLabel}>After Cleaning</Text>
                    {renderChips(AFTER_OPTIONS, state.after, isNoAccess, val =>
                      updateComponent(comp.key, 'after', val)
                    )}
                  </View>
                </View>
              )}

              {/* Extreme Warning */}
              {isExtreme && !isNoAccess && (
                <View style={styles.warningBanner}>
                  <Text style={styles.warningIcon}>{'\u26A0\uFE0F'}</Text>
                  <View style={styles.warningContent}>
                    <Text style={styles.warningTitle}>Deficiency Detected</Text>
                    <Text style={styles.warningText}>
                      Extreme grease buildup per NFPA 96 {'\u00A7'}12.6.1.1.3.
                      Increased fire risk documented.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>Save Grease Levels</Text>
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
  progressBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  progressBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND.gold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  componentCard: {
    backgroundColor: BRAND.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  componentCardDisabled: {
    backgroundColor: '#F8F9FC',
    borderColor: BRAND.grayLight,
  },
  componentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  componentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  componentNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BRAND.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  componentNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND.white,
  },
  componentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND.textPrimary,
  },
  componentLabelDisabled: {
    color: BRAND.gray,
  },
  noAccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noAccessLabel: {
    fontSize: 12,
    color: BRAND.gray,
    fontWeight: '500',
  },
  noAccessReasonContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
  },
  selectionsContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    gap: 14,
  },
  selectionGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND.textSecondary,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: BRAND.grayLight,
    backgroundColor: BRAND.white,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.textSecondary,
  },
  chipTextSelected: {
    color: BRAND.white,
  },
  chipTextDisabled: {
    color: BRAND.grayLight,
  },
  textInput: {
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: BRAND.grayLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: BRAND.orangeLight,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningIcon: {
    fontSize: 18,
    marginTop: 1,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  bottomBar: {
    backgroundColor: BRAND.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
  },
  saveButton: {
    backgroundColor: BRAND.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND.white,
  },
});
