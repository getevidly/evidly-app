import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';

type Severity = 'critical' | 'major' | 'minor';

interface Deficiency {
  id: string;
  component: string;
  description: string;
  severity: Severity;
  nfpaCode: string;
  hasPhoto: boolean;
  timestamp: string;
}

const SEVERITY_CONFIG: Record<Severity, { color: string; bg: string; label: string }> = {
  critical: { color: '#DC2626', bg: 'rgba(220,38,38,0.1)', label: 'Critical' },
  major: { color: '#EA580C', bg: 'rgba(234,88,12,0.1)', label: 'Major' },
  minor: { color: '#CA8A04', bg: 'rgba(202,138,4,0.1)', label: 'Minor' },
};

const COMPONENT_OPTIONS = [
  'Hood Body',
  'Filters',
  'Ductwork',
  'Exhaust Fan',
  'Fire Suppression',
  'Access Panels',
  'Rooftop Unit',
  'Grease Containment',
];

const DEMO_DEFICIENCIES: Deficiency[] = [
  {
    id: 'd1',
    component: 'Ductwork',
    description: 'Horizontal duct section has grease buildup exceeding 2mm. Requires additional cleaning pass and possible re-inspection.',
    severity: 'critical',
    nfpaCode: 'NFPA 96 §11.4.1',
    hasPhoto: true,
    timestamp: '8:47 AM',
  },
  {
    id: 'd2',
    component: 'Access Panels',
    description: 'Access panel #3 hinge is bent, does not close flush. Functional but should be replaced.',
    severity: 'minor',
    nfpaCode: 'NFPA 96 §7.3.2',
    hasPhoto: false,
    timestamp: '9:12 AM',
  },
];

export function DeficienciesScreen() {
  const [deficiencies, setDeficiencies] = useState<Deficiency[]>(DEMO_DEFICIENCIES);
  const [showForm, setShowForm] = useState(false);
  const [formComponent, setFormComponent] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSeverity, setFormSeverity] = useState<Severity>('minor');
  const [formNfpaCode, setFormNfpaCode] = useState('');

  const handleAdd = () => {
    if (!formComponent || !formDescription) {
      Alert.alert('Required', 'Please fill in component and description.');
      return;
    }
    const newDef: Deficiency = {
      id: `d${deficiencies.length + 1}`,
      component: formComponent,
      description: formDescription,
      severity: formSeverity,
      nfpaCode: formNfpaCode || 'N/A',
      hasPhoto: false,
      timestamp: new Date().toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      }),
    };
    setDeficiencies([...deficiencies, newDef]);
    setFormComponent('');
    setFormDescription('');
    setFormSeverity('minor');
    setFormNfpaCode('');
    setShowForm(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Deficiencies</Text>
        <Text style={styles.headerCount}>{deficiencies.length} found</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {deficiencies.map((def) => {
          const sev = SEVERITY_CONFIG[def.severity];
          return (
            <View key={def.id} style={styles.defCard}>
              <View style={styles.defHeader}>
                <View style={[styles.severityBadge, { backgroundColor: sev.bg }]}>
                  <Text style={[styles.severityText, { color: sev.color }]}>
                    {sev.label}
                  </Text>
                </View>
                <Text style={styles.defTimestamp}>{def.timestamp}</Text>
              </View>
              <Text style={styles.defComponent}>{def.component}</Text>
              <Text style={styles.defDescription}>{def.description}</Text>
              <View style={styles.defFooter}>
                <Text style={styles.nfpaCode}>{def.nfpaCode}</Text>
                {def.hasPhoto && (
                  <View style={styles.photoBadge}>
                    <Text style={styles.photoBadgeText}>Photo Attached</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowForm(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add Deficiency Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Deficiency</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              {/* Component Selector */}
              <Text style={styles.formLabel}>Component</Text>
              <View style={styles.componentGrid}>
                {COMPONENT_OPTIONS.map((comp) => (
                  <TouchableOpacity
                    key={comp}
                    style={[
                      styles.componentChip,
                      formComponent === comp
                        ? styles.componentChipActive
                        : null,
                    ]}
                    onPress={() => setFormComponent(comp)}
                  >
                    <Text
                      style={[
                        styles.componentChipText,
                        formComponent === comp
                          ? styles.componentChipTextActive
                          : null,
                      ]}
                    >
                      {comp}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Description */}
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={styles.descInput}
                placeholder="Describe the deficiency..."
                placeholderTextColor="#6B7F96"
                value={formDescription}
                onChangeText={setFormDescription}
                multiline
              />

              {/* Severity Picker */}
              <Text style={styles.formLabel}>Severity</Text>
              <View style={styles.severityRow}>
                {(Object.keys(SEVERITY_CONFIG) as Severity[]).map((sev) => (
                  <TouchableOpacity
                    key={sev}
                    style={[
                      styles.severityOption,
                      formSeverity === sev
                        ? {
                            backgroundColor: SEVERITY_CONFIG[sev].bg,
                            borderColor: SEVERITY_CONFIG[sev].color,
                          }
                        : null,
                    ]}
                    onPress={() => setFormSeverity(sev)}
                  >
                    <Text
                      style={[
                        styles.severityOptionText,
                        formSeverity === sev
                          ? { color: SEVERITY_CONFIG[sev].color }
                          : null,
                      ]}
                    >
                      {SEVERITY_CONFIG[sev].label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* NFPA Code */}
              <Text style={styles.formLabel}>NFPA Code Reference</Text>
              <TextInput
                style={styles.nfpaInput}
                placeholder="e.g., NFPA 96 §11.4"
                placeholderTextColor="#6B7F96"
                value={formNfpaCode}
                onChangeText={setFormNfpaCode}
              />

              {/* Photo Attachment */}
              <Text style={styles.formLabel}>Photo</Text>
              <TouchableOpacity style={styles.attachPhotoButton}>
                <Text style={styles.attachPhotoText}>Attach Photo</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.submitButton} onPress={handleAdd}>
              <Text style={styles.submitButtonText}>Add Deficiency</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0B1628',
  },
  headerCount: {
    fontSize: 13,
    color: '#6B7F96',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  defCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  defHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  defTimestamp: {
    fontSize: 12,
    color: '#6B7F96',
  },
  defComponent: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1628',
    marginBottom: 4,
  },
  defDescription: {
    fontSize: 13,
    color: '#3D5068',
    lineHeight: 19,
  },
  defFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
  },
  nfpaCode: {
    fontSize: 12,
    color: '#d4af37',
    fontWeight: '500',
  },
  photoBadge: {
    backgroundColor: 'rgba(30,77,107,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  photoBadgeText: {
    fontSize: 11,
    color: '#1e4d6b',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#d4af37',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    color: '#07111F',
    fontWeight: '700',
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0B1628',
  },
  modalClose: {
    fontSize: 14,
    color: '#1e4d6b',
    fontWeight: '600',
  },
  modalForm: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D5068',
    marginBottom: 8,
    marginTop: 16,
  },
  componentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  componentChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D9E6',
    backgroundColor: '#FFFFFF',
  },
  componentChipActive: {
    backgroundColor: '#1e4d6b',
    borderColor: '#1e4d6b',
  },
  componentChipText: {
    fontSize: 13,
    color: '#3D5068',
  },
  componentChipTextActive: {
    color: '#FFFFFF',
  },
  descInput: {
    borderWidth: 1,
    borderColor: '#D1D9E6',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#0B1628',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D9E6',
    alignItems: 'center',
  },
  severityOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D5068',
  },
  nfpaInput: {
    borderWidth: 1,
    borderColor: '#D1D9E6',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#0B1628',
  },
  attachPhotoButton: {
    borderWidth: 1,
    borderColor: '#1e4d6b',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(30,77,107,0.04)',
    marginBottom: 16,
  },
  attachPhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e4d6b',
  },
  submitButton: {
    marginHorizontal: 20,
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
