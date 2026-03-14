import React, { useState, useMemo } from 'react';
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

type Severity = 'critical' | 'major' | 'minor';

interface NfpaCode {
  id: string;
  code: string;
  title: string;
  deficiency_text: string;
  corrective_action: string;
  severity: Severity;
}

// ---------------------------------------------------------------------------
// NFPA 96 Seed Data (15 codes)
// ---------------------------------------------------------------------------

const NFPA_CODES: NfpaCode[] = [
  {
    id: 'nfpa1',
    code: 'NFPA 96 \u00a74.1.8',
    title: 'Grease Accumulation',
    deficiency_text: 'Grease-laden vapor deposits exceed acceptable levels on exhaust system interior surfaces.',
    corrective_action: 'Re-clean affected areas until grease depth is below 2000\u00b5m on all surfaces.',
    severity: 'critical',
  },
  {
    id: 'nfpa2',
    code: 'NFPA 96 \u00a77.1.1',
    title: 'Exhaust System Construction',
    deficiency_text: 'Exhaust ductwork not constructed of minimum 16-gauge carbon steel or 18-gauge stainless steel.',
    corrective_action: 'Replace non-compliant duct sections with properly rated materials.',
    severity: 'critical',
  },
  {
    id: 'nfpa3',
    code: 'NFPA 96 \u00a77.3.1',
    title: 'Duct Access Panels',
    deficiency_text: 'Access panels not provided at each change of direction and at intervals not exceeding 12 ft.',
    corrective_action: 'Install access panels at required intervals per NFPA 96 \u00a77.3.1.',
    severity: 'major',
  },
  {
    id: 'nfpa4',
    code: 'NFPA 96 \u00a77.8.1',
    title: 'Exhaust Fan Access',
    deficiency_text: 'Exhaust fan not equipped with hinge kit or other approved method for inspection and cleaning access.',
    corrective_action: 'Install an approved hinge kit on the exhaust fan for proper access.',
    severity: 'major',
  },
  {
    id: 'nfpa5',
    code: 'NFPA 96 \u00a77.8.2',
    title: 'Fan Grease Containment',
    deficiency_text: 'Exhaust fan does not have an approved grease containment device (drip cup/drain).',
    corrective_action: 'Install a grease containment device on the fan unit.',
    severity: 'major',
  },
  {
    id: 'nfpa6',
    code: 'NFPA 96 \u00a77.9.1',
    title: 'Electrical Disconnect',
    deficiency_text: 'No listed electrical disconnect present within sight of exhaust fan.',
    corrective_action: 'Install a listed disconnect switch within sight per NEC requirements.',
    severity: 'critical',
  },
  {
    id: 'nfpa7',
    code: 'NFPA 96 \u00a78.1.1',
    title: 'Hood Installation',
    deficiency_text: 'Hood not installed in accordance with listing and manufacturer instructions.',
    corrective_action: 'Correct hood installation per manufacturer specifications.',
    severity: 'major',
  },
  {
    id: 'nfpa8',
    code: 'NFPA 96 \u00a710.1.1',
    title: 'Fire Suppression System',
    deficiency_text: 'Fire extinguishing system not installed in accordance with NFPA 96 and applicable standards.',
    corrective_action: 'Have a licensed contractor inspect and bring the system into compliance.',
    severity: 'critical',
  },
  {
    id: 'nfpa9',
    code: 'NFPA 96 \u00a710.2.1',
    title: 'Suppression Nozzles',
    deficiency_text: 'Fire suppression nozzle caps missing or damaged.',
    corrective_action: 'Replace missing or damaged blow-off caps on all nozzles.',
    severity: 'major',
  },
  {
    id: 'nfpa10',
    code: 'NFPA 96 \u00a710.5.1',
    title: 'Fusible Links',
    deficiency_text: 'Fusible links not replaced semi-annually or show signs of grease loading.',
    corrective_action: 'Replace all fusible links per the semi-annual requirement.',
    severity: 'major',
  },
  {
    id: 'nfpa11',
    code: 'NFPA 96 \u00a711.4.1',
    title: 'Cleaning Standard',
    deficiency_text: 'Hood system not cleaned to bare metal per NFPA 96 requirements.',
    corrective_action: 'Re-clean hood system surfaces to bare metal standard.',
    severity: 'critical',
  },
  {
    id: 'nfpa12',
    code: 'NFPA 96 \u00a711.5.1',
    title: 'Filter Listing',
    deficiency_text: 'Grease filters are not listed (UL 1046) or are improperly sized for the hood opening.',
    corrective_action: 'Replace with properly sized UL 1046 listed grease filters.',
    severity: 'minor',
  },
  {
    id: 'nfpa13',
    code: 'NFPA 96 \u00a711.5.2',
    title: 'Filter Maintenance',
    deficiency_text: 'Filters not maintained in proper operating condition or show excessive grease loading.',
    corrective_action: 'Clean or replace filters as required by manufacturer schedule.',
    severity: 'minor',
  },
  {
    id: 'nfpa14',
    code: 'NFPA 96 \u00a714.3.1',
    title: 'Solid Fuel Buildup',
    deficiency_text: 'Solid fuel cooking equipment shows excessive creosote/ash buildup on interior surfaces.',
    corrective_action: 'Clean all surfaces to remove creosote and ash deposits.',
    severity: 'major',
  },
  {
    id: 'nfpa15',
    code: 'NFPA 96 \u00a714.4',
    title: 'Chimney Condition',
    deficiency_text: 'Chimney or flue connector for solid fuel equipment in deteriorated condition.',
    corrective_action: 'Repair or replace deteriorated chimney/flue components.',
    severity: 'minor',
  },
];

const SEVERITY_FILTERS: { key: 'all' | Severity; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'major', label: 'Major' },
  { key: 'minor', label: 'Minor' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSeverityColor(sev: Severity): { bg: string; text: string; border: string } {
  switch (sev) {
    case 'critical':
      return { bg: 'rgba(220,38,38,0.10)', text: '#DC2626', border: '#DC2626' };
    case 'major':
      return { bg: 'rgba(234,88,12,0.10)', text: '#ea580c', border: '#ea580c' };
    case 'minor':
      return { bg: 'rgba(212,175,55,0.12)', text: '#b8960f', border: '#d4af37' };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NfpaLookupScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const filteredCodes = useMemo(() => {
    let codes = NFPA_CODES;

    // Severity filter
    if (severityFilter !== 'all') {
      codes = codes.filter((c) => c.severity === severityFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      codes = codes.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.deficiency_text.toLowerCase().includes(q),
      );
    }

    return codes;
  }, [searchQuery, severityFilter]);

  const handleAddDeficiency = (code: NfpaCode) => {
    if (addedIds.has(code.id)) {
      Alert.alert('Already Added', `This deficiency has already been added to the current system.`);
      return;
    }

    Alert.alert(
      'Deficiency Added',
      `${code.deficiency_text}`,
      [
        {
          text: 'OK',
          onPress: () => {
            setAddedIds((prev) => new Set(prev).add(code.id));
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NFPA Code Lookup</Text>
        <Text style={styles.headerSubtitle}>
          15 NFPA 96 codes available
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by code, title, or text..."
          placeholderTextColor="#6B7F96"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.searchClear}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.searchClearText}>{'X'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Severity Filter Chips */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {SEVERITY_FILTERS.map((filter) => {
            const isActive = severityFilter === filter.key;
            let chipBg = '#F4F6FA';
            let chipText = '#6B7F96';
            if (isActive) {
              if (filter.key === 'all') {
                chipBg = '#1e4d6b';
                chipText = '#FFFFFF';
              } else {
                const colors = getSeverityColor(filter.key);
                chipBg = colors.text;
                chipText = '#FFFFFF';
              }
            }
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterChip, { backgroundColor: chipBg }]}
                onPress={() => setSeverityFilter(filter.key)}
              >
                <Text style={[styles.filterChipText, { color: chipText }]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <Text style={styles.resultCount}>
          {filteredCodes.length} result{filteredCodes.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Code List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredCodes.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{'?'}</Text>
            <Text style={styles.emptyTitle}>No codes found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your search or filter.
            </Text>
          </View>
        )}

        {filteredCodes.map((code) => {
          const colors = getSeverityColor(code.severity);
          const isAdded = addedIds.has(code.id);

          return (
            <View
              key={code.id}
              style={[
                styles.codeCard,
                { borderLeftColor: colors.border },
              ]}
            >
              {/* Code badge + severity */}
              <View style={styles.codeCardHeader}>
                <View style={[styles.codeBadge, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.codeBadgeText, { color: colors.text }]}>
                    {code.code}
                  </Text>
                </View>
                <View style={[styles.severityBadge, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.severityBadgeText, { color: colors.text }]}>
                    {code.severity.charAt(0).toUpperCase() + code.severity.slice(1)}
                  </Text>
                </View>
              </View>

              {/* Title */}
              <Text style={styles.codeTitle}>{code.title}</Text>

              {/* Deficiency text */}
              <Text style={styles.codeDeficiency}>{code.deficiency_text}</Text>

              {/* Corrective action */}
              <View style={styles.correctiveSection}>
                <Text style={styles.correctiveLabel}>Corrective Action:</Text>
                <Text style={styles.correctiveText}>
                  {code.corrective_action}
                </Text>
              </View>

              {/* Add button */}
              <TouchableOpacity
                style={[
                  styles.addButton,
                  isAdded && styles.addButtonAdded,
                ]}
                onPress={() => handleAddDeficiency(code)}
                disabled={isAdded}
              >
                <Text
                  style={[
                    styles.addButtonText,
                    isAdded && styles.addButtonTextAdded,
                  ]}
                >
                  {isAdded ? '\u2713  Added' : 'Add Deficiency'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
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
  header: {
    backgroundColor: '#1e4d6b',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },

  // Search
  searchBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F4F6FA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0B1628',
    borderWidth: 1,
    borderColor: '#D1D9E6',
  },
  searchClear: {
    marginLeft: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8EDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchClearText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7F96',
  },

  // Filter bar
  filterBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
    paddingBottom: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    marginRight: 4,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultCount: {
    fontSize: 12,
    color: '#6B7F96',
    paddingHorizontal: 16,
    marginTop: 6,
  },

  // Scroll
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 36,
    color: '#6B7F96',
    marginBottom: 10,
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1628',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7F96',
  },

  // Code card
  codeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 4,
  },
  codeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  codeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1628',
    marginBottom: 6,
  },
  codeDeficiency: {
    fontSize: 13,
    color: '#3D5068',
    lineHeight: 20,
    marginBottom: 10,
  },

  // Corrective action
  correctiveSection: {
    backgroundColor: '#F4F6FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  correctiveLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7F96',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  correctiveText: {
    fontSize: 13,
    color: '#0B1628',
    lineHeight: 18,
  },

  // Add button
  addButton: {
    backgroundColor: '#1e4d6b',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonAdded: {
    backgroundColor: 'rgba(5,150,105,0.10)',
    borderWidth: 1,
    borderColor: '#059669',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addButtonTextAdded: {
    color: '#059669',
  },
});
