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

const SUPPRESSION_TYPES = [
  { label: 'Ansul R-102', value: 'ansul_r102' },
  { label: 'Kidde', value: 'kidde' },
  { label: 'Range Guard', value: 'range_guard' },
  { label: 'Pyro-Chem', value: 'pyro_chem' },
  { label: 'Other', value: 'other' },
  { label: 'None', value: 'none' },
];

interface Extinguisher {
  id: string;
  location: string;
  type: string;
  size: string;
  lastInspection: string;
  expiry: string;
  condition: 'Current' | 'Expired';
  tagCurrent: boolean;
}

interface SuppressionState {
  type: string | null;
  company: string;
  phone: string;
  email: string;
  nozzleCaps: boolean | null;
  nozzlesClean: boolean | null;
  inspectionCurrent: boolean | null;
  tagVisible: boolean | null;
  notes: string;
}

interface ExtinguisherVendor {
  company: string;
  phone: string;
  email: string;
}

export function FireSafetyScreen() {
  const [suppression, setSuppression] = useState<SuppressionState>({
    type: 'ansul_r102',
    company: 'ABC Fire Protection',
    phone: '(555) 123-4567',
    email: 'service@abcfire.com',
    nozzleCaps: true,
    nozzlesClean: true,
    inspectionCurrent: true,
    tagVisible: true,
    notes: '',
  });

  const [extinguisherVendor, setExtinguisherVendor] = useState<ExtinguisherVendor>({
    company: 'SafeGuard Fire Inc.',
    phone: '(555) 987-6543',
    email: 'inspect@safeguardfire.com',
  });

  const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([
    {
      id: 'ext-1',
      location: 'East Wall',
      type: 'K-Class',
      size: '6 lb',
      lastInspection: '2026-01-15',
      expiry: '2027-01-15',
      condition: 'Current',
      tagCurrent: true,
    },
    {
      id: 'ext-2',
      location: 'West Wall',
      type: 'K-Class',
      size: '6 lb',
      lastInspection: '2024-06-10',
      expiry: '2025-06-10',
      condition: 'Expired',
      tagCurrent: false,
    },
  ]);

  const updateSuppression = (field: keyof SuppressionState, value: string | boolean | null) => {
    setSuppression(prev => ({ ...prev, [field]: value }));
  };

  const handleAddExtinguisher = () => {
    const newExt: Extinguisher = {
      id: `ext-${Date.now()}`,
      location: '',
      type: 'K-Class',
      size: '6 lb',
      lastInspection: '',
      expiry: '',
      condition: 'Current',
      tagCurrent: true,
    };
    setExtinguishers(prev => [...prev, newExt]);
  };

  const handleDeleteExtinguisher = (id: string) => {
    Alert.alert('Delete Extinguisher', 'Remove this extinguisher entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setExtinguishers(prev => prev.filter(e => e.id !== id)),
      },
    ]);
  };

  const handleCaptureTagPhoto = () => {
    Alert.alert('Camera', 'Suppression tag photo capture would open here.');
  };

  const handleSendCourtesyReport = () => {
    Alert.alert(
      'Send Courtesy Report',
      `Courtesy report will be sent to ${suppression.company} at ${suppression.email}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => Alert.alert('Sent', 'Courtesy report queued.') },
      ]
    );
  };

  const handleSave = () => {
    Alert.alert('Saved', 'Fire safety data saved successfully.');
  };

  const renderYesNo = (
    value: boolean | null,
    onSelect: (val: boolean) => void,
    warningOnNo?: boolean
  ) => (
    <View style={styles.yesNoRow}>
      <TouchableOpacity
        style={[styles.yesNoChip, value === true && styles.yesNoChipYes]}
        onPress={() => onSelect(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.yesNoText, value === true && styles.yesNoTextSelected]}
        >
          Yes
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.yesNoChip, value === false && styles.yesNoChipNo]}
        onPress={() => onSelect(false)}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.yesNoText, value === false && styles.yesNoTextSelected]}
        >
          No
        </Text>
      </TouchableOpacity>
      {warningOnNo && value === false && (
        <View style={styles.inlineWarning}>
          <Text style={styles.inlineWarningText}>{'\u26A0\uFE0F'} Not Current</Text>
        </View>
      )}
    </View>
  );

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
          <Text style={styles.headerTitle}>
            {'\uD83E\uDDEF'} Fire Safety Capture
          </Text>
          <Text style={styles.headerSubtitle}>
            Courtesy to client's fire vendors
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Suppression System Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Suppression System</Text>

          {/* Type Chips */}
          <Text style={styles.fieldLabel}>System Type</Text>
          <View style={styles.typeChipRow}>
            {SUPPRESSION_TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.typeChip,
                  suppression.type === t.value && styles.typeChipSelected,
                ]}
                onPress={() => updateSuppression('type', t.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    suppression.type === t.value && styles.typeChipTextSelected,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Contact Fields */}
          <Text style={styles.fieldLabel}>Company Name</Text>
          <TextInput
            style={styles.textInput}
            value={suppression.company}
            onChangeText={(v: string) => updateSuppression('company', v)}
            placeholder="Company name"
            placeholderTextColor={BRAND.grayLight}
          />

          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={styles.textInput}
            value={suppression.phone}
            onChangeText={(v: string) => updateSuppression('phone', v)}
            placeholder="(555) 000-0000"
            placeholderTextColor={BRAND.grayLight}
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.textInput}
            value={suppression.email}
            onChangeText={(v: string) => updateSuppression('email', v)}
            placeholder="email@company.com"
            placeholderTextColor={BRAND.grayLight}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Toggle Questions */}
          <View style={styles.toggleSection}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Nozzle Caps Installed</Text>
              {renderYesNo(suppression.nozzleCaps, v => updateSuppression('nozzleCaps', v))}
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Nozzles Clean</Text>
              {renderYesNo(suppression.nozzlesClean, v => updateSuppression('nozzlesClean', v))}
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Inspection Current</Text>
              {renderYesNo(
                suppression.inspectionCurrent,
                v => updateSuppression('inspectionCurrent', v),
                true
              )}
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Tag Visible</Text>
              {renderYesNo(suppression.tagVisible, v => updateSuppression('tagVisible', v))}
            </View>
          </View>

          {/* Capture Tag Photo */}
          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleCaptureTagPhoto}
            activeOpacity={0.7}
          >
            <Text style={styles.captureButtonText}>
              {'\uD83D\uDCF7'} Capture Tag Photo
            </Text>
          </TouchableOpacity>

          {/* Notes */}
          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={suppression.notes}
            onChangeText={(v: string) => updateSuppression('notes', v)}
            placeholder="Additional notes about suppression system..."
            placeholderTextColor={BRAND.grayLight}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Extinguishers Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Extinguishers</Text>

          {/* Vendor Contact */}
          <Text style={styles.fieldLabel}>Company Name</Text>
          <TextInput
            style={styles.textInput}
            value={extinguisherVendor.company}
            onChangeText={(v: string) =>
              setExtinguisherVendor(prev => ({ ...prev, company: v }))
            }
            placeholder="Company name"
            placeholderTextColor={BRAND.grayLight}
          />

          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={styles.textInput}
            value={extinguisherVendor.phone}
            onChangeText={(v: string) =>
              setExtinguisherVendor(prev => ({ ...prev, phone: v }))
            }
            placeholder="(555) 000-0000"
            placeholderTextColor={BRAND.grayLight}
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.textInput}
            value={extinguisherVendor.email}
            onChangeText={(v: string) =>
              setExtinguisherVendor(prev => ({ ...prev, email: v }))
            }
            placeholder="email@company.com"
            placeholderTextColor={BRAND.grayLight}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Extinguisher Cards */}
          {extinguishers.map(ext => {
            const isExpired = ext.condition === 'Expired';
            return (
              <View
                key={ext.id}
                style={[
                  styles.extCard,
                  isExpired && styles.extCardExpired,
                ]}
              >
                <View style={styles.extHeader}>
                  <View style={styles.extLocationRow}>
                    <Text style={styles.extLocation}>{ext.location || 'New Extinguisher'}</Text>
                    <View
                      style={[
                        styles.conditionBadge,
                        isExpired ? styles.conditionExpired : styles.conditionCurrent,
                      ]}
                    >
                      <Text
                        style={[
                          styles.conditionText,
                          isExpired
                            ? styles.conditionTextExpired
                            : styles.conditionTextCurrent,
                        ]}
                      >
                        {isExpired ? '\u26A0\uFE0F Expired' : '\u2713 Current'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteExtinguisher(ext.id)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>{'\u2715'}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.extDetailGrid}>
                  <View style={styles.extDetailItem}>
                    <Text style={styles.extDetailLabel}>Type</Text>
                    <Text style={styles.extDetailValue}>{ext.type}</Text>
                  </View>
                  <View style={styles.extDetailItem}>
                    <Text style={styles.extDetailLabel}>Size</Text>
                    <Text style={styles.extDetailValue}>{ext.size}</Text>
                  </View>
                  <View style={styles.extDetailItem}>
                    <Text style={styles.extDetailLabel}>Last Inspection</Text>
                    <Text style={styles.extDetailValue}>{ext.lastInspection || '\u2014'}</Text>
                  </View>
                  <View style={styles.extDetailItem}>
                    <Text style={styles.extDetailLabel}>Expiry</Text>
                    <Text
                      style={[
                        styles.extDetailValue,
                        isExpired && styles.extDetailValueExpired,
                      ]}
                    >
                      {ext.expiry || '\u2014'}
                    </Text>
                  </View>
                </View>

                <View style={styles.extTagRow}>
                  <Text style={styles.extTagLabel}>Tag Current</Text>
                  <Text
                    style={[
                      styles.extTagValue,
                      ext.tagCurrent ? styles.extTagYes : styles.extTagNo,
                    ]}
                  >
                    {ext.tagCurrent ? 'Yes' : 'No'}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Add Extinguisher */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddExtinguisher}
            activeOpacity={0.7}
          >
            <Text style={styles.addButtonText}>{'\u2795'} Add Extinguisher</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.courtesyButton}
          onPress={handleSendCourtesyReport}
          activeOpacity={0.8}
        >
          <Text style={styles.courtesyButtonText}>
            {'\uD83D\uDCE7'} Send Courtesy Report
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>Save</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sectionCard: {
    backgroundColor: BRAND.white,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND.textPrimary,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND.textSecondary,
    marginBottom: 6,
    marginTop: 14,
  },
  textInput: {
    backgroundColor: BRAND.lightBg,
    borderWidth: 1,
    borderColor: BRAND.grayLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  typeChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: BRAND.grayLight,
    backgroundColor: BRAND.white,
  },
  typeChipSelected: {
    backgroundColor: BRAND.primary,
    borderColor: BRAND.primary,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND.textSecondary,
  },
  typeChipTextSelected: {
    color: BRAND.white,
  },
  toggleSection: {
    marginTop: 18,
    gap: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: BRAND.textPrimary,
    flex: 1,
  },
  yesNoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  yesNoChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: BRAND.grayLight,
    backgroundColor: BRAND.white,
  },
  yesNoChipYes: {
    backgroundColor: BRAND.greenLight,
    borderColor: BRAND.green,
  },
  yesNoChipNo: {
    backgroundColor: BRAND.redLight,
    borderColor: BRAND.red,
  },
  yesNoText: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND.textSecondary,
  },
  yesNoTextSelected: {
    color: BRAND.textPrimary,
  },
  inlineWarning: {
    backgroundColor: BRAND.orangeLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  inlineWarningText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  captureButton: {
    backgroundColor: BRAND.lightBg,
    borderWidth: 1.5,
    borderColor: BRAND.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  captureButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.primary,
  },
  extCard: {
    backgroundColor: BRAND.lightBg,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  extCardExpired: {
    borderColor: BRAND.red,
    backgroundColor: '#FFF5F5',
  },
  extHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  extLocationRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  extLocation: {
    fontSize: 15,
    fontWeight: '700',
    color: BRAND.textPrimary,
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  conditionCurrent: {
    backgroundColor: BRAND.greenLight,
  },
  conditionExpired: {
    backgroundColor: BRAND.redLight,
  },
  conditionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  conditionTextCurrent: {
    color: BRAND.green,
  },
  conditionTextExpired: {
    color: BRAND.red,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(220,38,38,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
    color: BRAND.red,
    fontWeight: '600',
  },
  extDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  extDetailItem: {
    width: '47%',
    marginBottom: 4,
  },
  extDetailLabel: {
    fontSize: 11,
    color: BRAND.gray,
    fontWeight: '500',
  },
  extDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.textPrimary,
    marginTop: 2,
  },
  extDetailValueExpired: {
    color: BRAND.red,
  },
  extTagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
  },
  extTagLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: BRAND.textSecondary,
  },
  extTagValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  extTagYes: {
    color: BRAND.green,
  },
  extTagNo: {
    color: BRAND.red,
  },
  addButton: {
    borderWidth: 1.5,
    borderColor: BRAND.grayLight,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.primary,
  },
  bottomBar: {
    backgroundColor: BRAND.white,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    gap: 10,
  },
  courtesyButton: {
    backgroundColor: BRAND.gold,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  courtesyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND.darkBg,
  },
  saveButton: {
    backgroundColor: BRAND.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: BRAND.white,
  },
});
