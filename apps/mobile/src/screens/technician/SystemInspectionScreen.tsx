import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FieldType = 'select' | 'micron' | 'boolean' | 'text' | 'condition';

interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  nfpaRef?: string;
  deficiencyThreshold?: number; // micron value that triggers deficiency
  conditionalOn?: string;       // field id this depends on
  forcedValue?: string;         // value forced when condition met
  disabled?: boolean;
}

interface SectionDef {
  key: string;
  label: string;
  nfpaRef: string;
  fields: FieldDef[];
}

type GreaseLevel = 'Clean' | 'Light' | 'Moderate' | 'Heavy' | 'Excessive';

// ---------------------------------------------------------------------------
// Section Configs
// ---------------------------------------------------------------------------

const GREASE_COMPONENTS = [
  'Filter Tract', 'Hood Interior', 'Vertical Duct', 'Horizontal Duct',
  'Plenum', 'Fan Blades', 'Fan Bowl',
];

const SECTIONS: SectionDef[] = [
  {
    key: 'grease_levels',
    label: 'Grease Levels',
    nfpaRef: 'NFPA 96 \u00a711.4',
    fields: GREASE_COMPONENTS.map((comp) => ({
      id: `grease_${comp.toLowerCase().replace(/\s+/g, '_')}`,
      label: comp,
      type: 'micron' as FieldType,
      deficiencyThreshold: 2000,
    })),
  },
  {
    key: 'hood_data',
    label: 'Hood',
    nfpaRef: 'NFPA 96 \u00a711.3',
    fields: [
      { id: 'hood_condition', label: 'Hood Condition', type: 'condition' },
      { id: 'hood_lights', label: 'Hood Lights Functional', type: 'boolean' },
      { id: 'drip_tray', label: 'Drip Tray Clean', type: 'boolean' },
      { id: 'access_panels', label: 'Access Panels Present', type: 'boolean' },
      { id: 'panels_accessible', label: 'Panels Accessible', type: 'boolean', conditionalOn: 'access_panels' },
    ],
  },
  {
    key: 'filter_data',
    label: 'Filters',
    nfpaRef: 'NFPA 96 \u00a711.5',
    fields: [
      { id: 'filter_type', label: 'Filter Type', type: 'select', options: ['Baffle', 'Mesh', 'Cartridge', 'Other'] },
      { id: 'filter_condition', label: 'Filter Condition', type: 'condition' },
      { id: 'filter_compliance', label: 'UL 1046 Compliant', type: 'boolean', nfpaRef: 'UL 1046' },
    ],
  },
  {
    key: 'duct_data',
    label: 'Ductwork',
    nfpaRef: 'NFPA 96 \u00a77.3',
    fields: [
      { id: 'duct_condition', label: 'Duct Condition', type: 'condition' },
      { id: 'leak_test', label: 'Leak Test Pass', type: 'boolean' },
      { id: 'access_panels_duct', label: 'Access Panels Present', type: 'boolean' },
      { id: 'cleanout_ports', label: 'Cleanout Ports Accessible', type: 'boolean' },
    ],
  },
  {
    key: 'fan_mechanical',
    label: 'Fan \u2014 Mechanical',
    nfpaRef: 'NFPA 96 \u00a77.8',
    fields: [
      { id: 'hinge_installed', label: 'Hinge Kit Installed', type: 'boolean' },
      { id: 'hinge_functional', label: 'Hinge Functional', type: 'boolean' },
      { id: 'belt_tension', label: 'Belt Tension', type: 'select', options: ['Tight', 'Adequate', 'Loose', 'Direct Drive'] },
      { id: 'belt_condition', label: 'Belt Condition', type: 'condition', conditionalOn: 'belt_tension' },
      { id: 'bearings', label: 'Bearings Condition', type: 'condition' },
      { id: 'containment_device', label: 'Grease Containment', type: 'boolean' },
    ],
  },
  {
    key: 'fan_electrical',
    label: 'Fan \u2014 Electrical',
    nfpaRef: 'NFPA 96 \u00a77.9',
    fields: [
      { id: 'disconnect_present', label: 'Disconnect Present', type: 'boolean' },
      { id: 'disconnect_functional', label: 'Disconnect Functional', type: 'boolean' },
      { id: 'wiring_condition', label: 'Wiring Condition', type: 'condition' },
    ],
  },
  {
    key: 'solid_fuel',
    label: 'Solid Fuel',
    nfpaRef: 'NFPA 96 \u00a714',
    fields: [
      { id: 'solid_fuel_buildup', label: 'Solid Fuel Buildup', type: 'condition' },
      { id: 'hearth_condition', label: 'Hearth Condition', type: 'condition' },
      { id: 'chimney_condition', label: 'Chimney Condition', type: 'condition' },
    ],
  },
  {
    key: 'post_cleaning',
    label: 'Post Cleaning',
    nfpaRef: 'NFPA 96 \u00a711.6',
    fields: [
      ...GREASE_COMPONENTS.map((comp) => ({
        id: `post_grease_${comp.toLowerCase().replace(/\s+/g, '_')}`,
        label: `Post — ${comp}`,
        type: 'micron' as FieldType,
      })),
      { id: 'final_inspection_pass', label: 'Final Inspection Pass', type: 'boolean' },
    ],
  },
  {
    key: 'fire_safety',
    label: 'Fire Safety',
    nfpaRef: 'NFPA 96 \u00a710',
    fields: [
      { id: 'suppression_type', label: 'Suppression Type', type: 'select', options: ['Wet Chemical', 'Dry Chemical', 'Water Mist', 'CO2', 'None'] },
      { id: 'suppression_current', label: 'Inspection Current', type: 'boolean' },
      { id: 'suppression_tag_date', label: 'Last Tag Date', type: 'text' },
      { id: 'nozzle_caps', label: 'Nozzle Caps Intact', type: 'boolean' },
      { id: 'fusible_links', label: 'Fusible Links Condition', type: 'condition' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Demo pre-filled data (Grease Levels for system 1)
// ---------------------------------------------------------------------------

const DEMO_VALUES: Record<string, string | number | boolean> = {
  grease_filter_tract: 800,
  grease_hood_interior: 1200,
  grease_vertical_duct: 1600,
  grease_horizontal_duct: 2400,
  grease_plenum: 900,
  grease_fan_blades: 3100,
  grease_fan_bowl: 1400,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMicronLevel(microns: number): GreaseLevel {
  if (microns <= 500) return 'Clean';
  if (microns <= 1000) return 'Light';
  if (microns <= 2000) return 'Moderate';
  if (microns <= 3500) return 'Heavy';
  return 'Excessive';
}

function getMicronColor(microns: number): string {
  if (microns <= 500) return '#059669';
  if (microns <= 1000) return '#0d9488';
  if (microns <= 2000) return '#d4af37';
  if (microns <= 3500) return '#ea580c';
  return '#DC2626';
}

const CONDITION_OPTIONS = ['Good', 'Fair', 'Poor', 'N/A'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SystemInspectionScreen() {
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [values, setValues] = useState<Record<string, string | number | boolean>>(DEMO_VALUES);
  const scrollRef = useRef<ScrollView>(null);

  const section = SECTIONS[activeSectionIdx];

  const setValue = (fieldId: string, val: string | number | boolean) => {
    setValues((prev) => ({ ...prev, [fieldId]: val }));
  };

  const handlePhoto = (fieldId: string) => {
    Alert.alert('Photo', `Open camera for ${fieldId} (demo).`);
  };

  const handlePrev = () => {
    if (activeSectionIdx > 0) {
      setActiveSectionIdx(activeSectionIdx - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handleNext = () => {
    if (activeSectionIdx < SECTIONS.length - 1) {
      setActiveSectionIdx(activeSectionIdx + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  // Check if a field should be disabled by conditional logic
  const isFieldDisabled = (field: FieldDef): boolean => {
    if (!field.conditionalOn) return false;
    const parentVal = values[field.conditionalOn];
    // panels_accessible disabled if access_panels = false
    if (field.id === 'panels_accessible' && parentVal === false) return true;
    // belt_condition forced to "Direct Drive" when belt_tension = Direct Drive
    if (field.id === 'belt_condition' && parentVal === 'Direct Drive') return true;
    return false;
  };

  const getForcedValue = (field: FieldDef): string | null => {
    if (field.id === 'belt_condition' && values['belt_tension'] === 'Direct Drive') {
      return 'Direct Drive';
    }
    return null;
  };

  // ---------------------------------------------------------------------------
  // Field Renderers
  // ---------------------------------------------------------------------------

  const renderMicronField = (field: FieldDef) => {
    const val = values[field.id] as number | undefined;
    const microns = val ?? 0;
    const level = getMicronLevel(microns);
    const color = getMicronColor(microns);
    const hasDeficiency = field.deficiencyThreshold && microns > field.deficiencyThreshold;

    return (
      <View>
        <View style={styles.micronRow}>
          <TextInput
            style={styles.micronInput}
            placeholder="0"
            placeholderTextColor="#6B7F96"
            keyboardType="numeric"
            value={val !== undefined ? String(val) : ''}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              setValue(field.id, isNaN(num) ? 0 : num);
            }}
          />
          <Text style={styles.micronUnit}>{'\u00b5m'}</Text>
          <View style={[styles.levelBadge, { backgroundColor: `${color}18` }]}>
            <View style={[styles.levelDot, { backgroundColor: color }]} />
            <Text style={[styles.levelText, { color }]}>{level}</Text>
          </View>
        </View>
        {/* Grease bar visual */}
        <View style={styles.greaseBarTrack}>
          <View
            style={[
              styles.greaseBarFill,
              { width: `${Math.min((microns / 5000) * 100, 100)}%`, backgroundColor: color },
            ]}
          />
        </View>
        {hasDeficiency && (
          <View style={styles.deficiencyBanner}>
            <Text style={styles.deficiencyBannerIcon}>{'!'}</Text>
            <View style={styles.deficiencyBannerContent}>
              <Text style={styles.deficiencyBannerTitle}>
                Deficiency Detected
              </Text>
              <Text style={styles.deficiencyBannerText}>
                Grease depth exceeds {field.deficiencyThreshold}{'\u00b5m'} — {field.nfpaRef ?? section.nfpaRef}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderBooleanField = (field: FieldDef, disabled: boolean) => {
    const val = values[field.id];
    return (
      <View style={[styles.toggleRow, disabled && styles.disabledOverlay]}>
        <TouchableOpacity
          style={[styles.toggleButton, val === true && styles.toggleYes]}
          onPress={() => !disabled && setValue(field.id, true)}
          disabled={disabled}
        >
          <Text style={[styles.toggleText, val === true && styles.toggleTextActive]}>
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, val === false && styles.toggleNo]}
          onPress={() => !disabled && setValue(field.id, false)}
          disabled={disabled}
        >
          <Text style={[styles.toggleText, val === false && styles.toggleTextActive]}>
            No
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSelectField = (field: FieldDef) => {
    const val = values[field.id] as string | undefined;
    return (
      <View style={styles.selectRow}>
        {(field.options ?? []).map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.selectChip, val === opt && styles.selectChipActive]}
            onPress={() => setValue(field.id, opt)}
          >
            <Text
              style={[
                styles.selectChipText,
                val === opt && styles.selectChipTextActive,
              ]}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderConditionField = (field: FieldDef, disabled: boolean, forced: string | null) => {
    const displayVal = forced ?? (values[field.id] as string | undefined);
    return (
      <View style={[styles.conditionRow, disabled && styles.disabledOverlay]}>
        {forced && (
          <View style={styles.lockedIndicator}>
            <Text style={styles.lockedText}>Locked</Text>
          </View>
        )}
        {CONDITION_OPTIONS.map((opt) => {
          const isSelected = displayVal === opt;
          let activeBg = '#1e4d6b';
          if (opt === 'Good') activeBg = '#059669';
          if (opt === 'Poor') activeBg = '#DC2626';
          if (opt === 'N/A') activeBg = '#6B7F96';

          return (
            <TouchableOpacity
              key={opt}
              style={[
                styles.conditionChip,
                isSelected && { backgroundColor: activeBg, borderColor: activeBg },
              ]}
              onPress={() => !disabled && !forced && setValue(field.id, opt)}
              disabled={disabled || !!forced}
            >
              <Text
                style={[
                  styles.conditionChipText,
                  isSelected && styles.conditionChipTextActive,
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderTextField = (field: FieldDef) => {
    const val = values[field.id] as string | undefined;
    return (
      <TextInput
        style={styles.textInput}
        placeholder="Enter value..."
        placeholderTextColor="#6B7F96"
        value={val ?? ''}
        onChangeText={(text) => setValue(field.id, text)}
      />
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>System #1 — Main Hood Line</Text>
        <Text style={styles.topBarSubtitle}>
          Section {activeSectionIdx + 1} of {SECTIONS.length}
        </Text>
      </View>

      {/* Section Tabs */}
      <View style={styles.sectionTabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sectionTabScroll}
        >
          {SECTIONS.map((sec, idx) => {
            const isActive = idx === activeSectionIdx;
            return (
              <TouchableOpacity
                key={sec.key}
                style={[styles.sectionTab, isActive && styles.sectionTabActive]}
                onPress={() => {
                  setActiveSectionIdx(idx);
                  scrollRef.current?.scrollTo({ y: 0, animated: true });
                }}
              >
                <Text
                  style={[
                    styles.sectionTabText,
                    isActive && styles.sectionTabTextActive,
                  ]}
                >
                  {sec.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Section Content */}
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent}>
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderTitle}>{section.label}</Text>
          <View style={styles.nfpaBadge}>
            <Text style={styles.nfpaBadgeText}>{section.nfpaRef}</Text>
          </View>
        </View>

        {/* Fields */}
        {section.fields.map((field) => {
          const disabled = isFieldDisabled(field);
          const forced = getForcedValue(field);

          return (
            <View
              key={field.id}
              style={[styles.fieldCard, disabled && styles.fieldCardDisabled]}
            >
              <View style={styles.fieldHeader}>
                <Text style={[styles.fieldLabel, disabled && styles.fieldLabelDisabled]}>
                  {field.label}
                </Text>
                {field.nfpaRef && (
                  <Text style={styles.fieldNfpaRef}>{field.nfpaRef}</Text>
                )}
              </View>

              {/* Field control */}
              <View style={styles.fieldControl}>
                {field.type === 'micron' && renderMicronField(field)}
                {field.type === 'boolean' && renderBooleanField(field, disabled)}
                {field.type === 'select' && renderSelectField(field)}
                {field.type === 'condition' && renderConditionField(field, disabled, forced)}
                {field.type === 'text' && renderTextField(field)}
              </View>

              {/* Photo button */}
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => handlePhoto(field.id)}
              >
                <Text style={styles.photoButtonText}>Add Photo</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* Navigation Footer */}
      <View style={styles.navFooter}>
        <TouchableOpacity
          style={[styles.navButton, activeSectionIdx === 0 && styles.navButtonDisabled]}
          onPress={handlePrev}
          disabled={activeSectionIdx === 0}
        >
          <Text
            style={[
              styles.navButtonText,
              activeSectionIdx === 0 && styles.navButtonTextDisabled,
            ]}
          >
            Previous
          </Text>
        </TouchableOpacity>
        <Text style={styles.navPageIndicator}>
          {activeSectionIdx + 1} / {SECTIONS.length}
        </Text>
        <TouchableOpacity
          style={[
            styles.navButton,
            styles.navButtonPrimary,
            activeSectionIdx === SECTIONS.length - 1 && styles.navButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={activeSectionIdx === SECTIONS.length - 1}
        >
          <Text
            style={[
              styles.navButtonTextPrimary,
              activeSectionIdx === SECTIONS.length - 1 && styles.navButtonTextDisabled,
            ]}
          >
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  topBar: {
    backgroundColor: '#1e4d6b',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topBarSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },

  // Section tabs
  sectionTabBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
  },
  sectionTabScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  sectionTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F4F6FA',
    marginRight: 4,
  },
  sectionTabActive: {
    backgroundColor: '#1e4d6b',
  },
  sectionTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7F96',
  },
  sectionTabTextActive: {
    color: '#FFFFFF',
  },

  // Scroll
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0B1628',
  },
  nfpaBadge: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  nfpaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b8960f',
  },

  // Field card
  fieldCard: {
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
  fieldCardDisabled: {
    opacity: 0.5,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0B1628',
    flex: 1,
  },
  fieldLabelDisabled: {
    color: '#6B7F96',
  },
  fieldNfpaRef: {
    fontSize: 10,
    color: '#d4af37',
    fontWeight: '600',
  },
  fieldControl: {
    marginBottom: 8,
  },

  // Micron
  micronRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  micronInput: {
    width: 80,
    borderWidth: 1,
    borderColor: '#D1D9E6',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#0B1628',
    textAlign: 'center',
  },
  micronUnit: {
    fontSize: 14,
    color: '#6B7F96',
    fontWeight: '500',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  greaseBarTrack: {
    height: 4,
    backgroundColor: '#E8EDF5',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  greaseBarFill: {
    height: 4,
    borderRadius: 2,
  },

  // Deficiency banner
  deficiencyBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(234,88,12,0.08)',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#ea580c',
    alignItems: 'flex-start',
    gap: 8,
  },
  deficiencyBannerIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ea580c',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    overflow: 'hidden',
  },
  deficiencyBannerContent: {
    flex: 1,
  },
  deficiencyBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
  deficiencyBannerText: {
    fontSize: 11,
    color: '#9a3412',
    marginTop: 2,
    lineHeight: 16,
  },

  // Boolean toggles
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
  toggleYes: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  toggleNo: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D5068',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  disabledOverlay: {
    opacity: 0.4,
  },

  // Select
  selectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D9E6',
    backgroundColor: '#F4F6FA',
  },
  selectChipActive: {
    backgroundColor: '#1e4d6b',
    borderColor: '#1e4d6b',
  },
  selectChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D5068',
  },
  selectChipTextActive: {
    color: '#FFFFFF',
  },

  // Condition
  conditionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D9E6',
  },
  conditionChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D5068',
  },
  conditionChipTextActive: {
    color: '#FFFFFF',
  },
  lockedIndicator: {
    backgroundColor: 'rgba(107,127,150,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  lockedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7F96',
  },

  // Text input
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D9E6',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#0B1628',
  },

  // Photo button
  photoButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(30,77,107,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e4d6b',
    borderStyle: 'dashed',
  },
  photoButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e4d6b',
  },

  // Navigation footer
  navFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  navButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D9E6',
    backgroundColor: '#FFFFFF',
  },
  navButtonPrimary: {
    backgroundColor: '#1e4d6b',
    borderColor: '#1e4d6b',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0B1628',
  },
  navButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  navButtonTextDisabled: {
    color: '#6B7F96',
  },
  navPageIndicator: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7F96',
  },
});
