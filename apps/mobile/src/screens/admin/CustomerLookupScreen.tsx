import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';

// ── Brand tokens ──────────────────────────────────────────────
const BRAND = '#1e4d6b';
const BRAND_DARK = '#163a52';
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

// ── Placeholder data ──────────────────────────────────────────
// TODO: Replace with live data from useCustomers() hook + Supabase search

interface Location {
  id: string;
  name: string;
  address: string;
}

interface Equipment {
  id: string;
  type: string;
  model: string;
  lastServiceDate: string;
}

interface ServiceHistoryItem {
  id: string;
  date: string;
  serviceType: string;
  technician: string;
  status: 'completed' | 'cancelled' | 'scheduled';
  jobNumber: string;
}

interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  lastServiceDate: string;
  locations: Location[];
  equipment: Equipment[];
  serviceHistory: ServiceHistoryItem[];
  upcomingJobs: ServiceHistoryItem[];
}

const CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    name: "Mario's Italian Kitchen",
    contactPerson: 'Mario Rossi',
    phone: '+15551234567',
    email: 'mario@marioskitchen.com',
    address: '1425 Main St, Suite B, Los Angeles, CA 90012',
    lastServiceDate: 'Mar 10, 2026',
    locations: [
      { id: 'l1', name: 'Main Kitchen', address: '1425 Main St, Suite B' },
      { id: 'l2', name: 'Prep Kitchen', address: '1425 Main St, Suite D' },
    ],
    equipment: [
      { id: 'e1', type: 'Type I Hood', model: 'CaptiveAire 5424ND', lastServiceDate: 'Mar 10, 2026' },
      { id: 'e2', type: 'Exhaust Fan', model: 'Greenheck CUBE-300', lastServiceDate: 'Mar 10, 2026' },
      { id: 'e3', type: 'Fire Suppression', model: 'Ansul R-102', lastServiceDate: 'Jan 15, 2026' },
    ],
    serviceHistory: [
      { id: 'sh1', date: 'Mar 10, 2026', serviceType: 'Hood Cleaning', technician: 'Marcus W.', status: 'completed', jobNumber: '#1042' },
      { id: 'sh2', date: 'Feb 8, 2026', serviceType: 'Hood Cleaning', technician: 'Sarah K.', status: 'completed', jobNumber: '#0987' },
      { id: 'sh3', date: 'Jan 15, 2026', serviceType: 'Fire Suppression Inspection', technician: 'James R.', status: 'completed', jobNumber: '#0912' },
      { id: 'sh4', date: 'Dec 12, 2025', serviceType: 'Hood Cleaning', technician: 'Marcus W.', status: 'completed', jobNumber: '#0845' },
      { id: 'sh5', date: 'Nov 10, 2025', serviceType: 'Filter Exchange', technician: 'Emily T.', status: 'completed', jobNumber: '#0790' },
    ],
    upcomingJobs: [
      { id: 'uj1', date: 'Apr 8, 2026', serviceType: 'Hood Cleaning', technician: 'TBD', status: 'scheduled', jobNumber: '#1098' },
    ],
  },
  {
    id: 'c2',
    name: 'Blue Fin Sushi',
    contactPerson: 'Kenji Tanaka',
    phone: '+15559876543',
    email: 'kenji@bluefinsushi.com',
    address: '800 Harbor Blvd, Long Beach, CA 90802',
    lastServiceDate: 'Mar 8, 2026',
    locations: [
      { id: 'l3', name: 'Main Kitchen', address: '800 Harbor Blvd' },
    ],
    equipment: [
      { id: 'e4', type: 'Type I Hood', model: 'CaptiveAire 4818ND', lastServiceDate: 'Mar 8, 2026' },
      { id: 'e5', type: 'Exhaust Fan', model: 'Greenheck CUBE-200', lastServiceDate: 'Mar 8, 2026' },
    ],
    serviceHistory: [
      { id: 'sh6', date: 'Mar 8, 2026', serviceType: 'Hood Cleaning', technician: 'Sarah K.', status: 'completed', jobNumber: '#1038' },
      { id: 'sh7', date: 'Feb 5, 2026', serviceType: 'Hood Cleaning', technician: 'Marcus W.', status: 'completed', jobNumber: '#0972' },
      { id: 'sh8', date: 'Jan 3, 2026', serviceType: 'Hood Cleaning', technician: 'James R.', status: 'completed', jobNumber: '#0898' },
    ],
    upcomingJobs: [
      { id: 'uj2', date: 'Apr 5, 2026', serviceType: 'Hood Cleaning', technician: 'TBD', status: 'scheduled', jobNumber: '#1095' },
    ],
  },
  {
    id: 'c3',
    name: 'The Rustic Table',
    contactPerson: 'Amanda Chen',
    phone: '+15555551234',
    email: 'amanda@rustictable.com',
    address: '2200 Oak Ave, Pasadena, CA 91101',
    lastServiceDate: 'Mar 5, 2026',
    locations: [
      { id: 'l4', name: 'Main Kitchen', address: '2200 Oak Ave' },
      { id: 'l5', name: 'Outdoor Grill Station', address: '2200 Oak Ave (Patio)' },
    ],
    equipment: [
      { id: 'e6', type: 'Type I Hood', model: 'CaptiveAire 6030ND', lastServiceDate: 'Mar 5, 2026' },
      { id: 'e7', type: 'Type II Hood', model: 'CaptiveAire 4824VH', lastServiceDate: 'Mar 5, 2026' },
      { id: 'e8', type: 'Exhaust Fan', model: 'Greenheck CUBE-300', lastServiceDate: 'Mar 5, 2026' },
    ],
    serviceHistory: [
      { id: 'sh9', date: 'Mar 5, 2026', serviceType: 'Hood Cleaning', technician: 'Emily T.', status: 'completed', jobNumber: '#1035' },
      { id: 'sh10', date: 'Feb 3, 2026', serviceType: 'Hood Cleaning', technician: 'Marcus W.', status: 'completed', jobNumber: '#0968' },
    ],
    upcomingJobs: [],
  },
  {
    id: 'c4',
    name: 'Golden Dragon',
    contactPerson: 'Wei Zhang',
    phone: '+15558887777',
    email: 'wei@goldendragon.com',
    address: '550 Chinatown Plaza, Los Angeles, CA 90012',
    lastServiceDate: 'Mar 12, 2026',
    locations: [
      { id: 'l6', name: 'Main Kitchen', address: '550 Chinatown Plaza' },
    ],
    equipment: [
      { id: 'e9', type: 'Type I Hood (Wok)', model: 'CaptiveAire 7236ND', lastServiceDate: 'Mar 12, 2026' },
      { id: 'e10', type: 'Type I Hood (Grill)', model: 'CaptiveAire 6030ND', lastServiceDate: 'Mar 12, 2026' },
      { id: 'e11', type: 'Exhaust Fan', model: 'Greenheck CUBE-400', lastServiceDate: 'Mar 12, 2026' },
      { id: 'e12', type: 'Fire Suppression', model: 'Ansul R-102', lastServiceDate: 'Dec 20, 2025' },
    ],
    serviceHistory: [
      { id: 'sh11', date: 'Mar 12, 2026', serviceType: 'Hood Cleaning', technician: 'James R.', status: 'completed', jobNumber: '#1039' },
      { id: 'sh12', date: 'Feb 10, 2026', serviceType: 'Hood Cleaning', technician: 'Sarah K.', status: 'completed', jobNumber: '#0982' },
    ],
    upcomingJobs: [
      { id: 'uj3', date: 'Apr 10, 2026', serviceType: 'Hood Cleaning', technician: 'TBD', status: 'scheduled', jobNumber: '#1102' },
    ],
  },
  {
    id: 'c5',
    name: 'Seaside Grill',
    contactPerson: 'Carlos Mendez',
    phone: '+15554443333',
    email: 'carlos@seasidegrill.com',
    address: '100 Pier Way, Santa Monica, CA 90401',
    lastServiceDate: 'Feb 28, 2026',
    locations: [
      { id: 'l7', name: 'Main Kitchen', address: '100 Pier Way' },
    ],
    equipment: [
      { id: 'e13', type: 'Type I Hood', model: 'CaptiveAire 5424ND', lastServiceDate: 'Feb 28, 2026' },
    ],
    serviceHistory: [
      { id: 'sh13', date: 'Feb 28, 2026', serviceType: 'Hood Cleaning', technician: 'Emily T.', status: 'completed', jobNumber: '#0960' },
    ],
    upcomingJobs: [
      { id: 'uj4', date: 'Mar 28, 2026', serviceType: 'Hood Cleaning', technician: 'Marcus W.', status: 'scheduled', jobNumber: '#1088' },
    ],
  },
];

const RECENT_IDS = ['c1', 'c4', 'c2'];

const STATUS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  completed: { bg: '#dcfce7', text: SUCCESS },
  cancelled: { bg: '#fef2f2', text: DANGER },
  scheduled: { bg: '#dbeafe', text: '#2563eb' },
};

// ── Component ─────────────────────────────────────────────────

export function CustomerLookupScreen({ navigation }: { navigation?: any }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) {
      // Show recent customers
      return CUSTOMERS.filter((c) => RECENT_IDS.includes(c.id));
    }
    const q = searchQuery.toLowerCase();
    return CUSTOMERS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.contactPerson.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const isShowingRecent = !searchQuery.trim();

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`).catch(() => {});
  };

  const renderCustomerItem = ({ item: customer }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.customerCard}
      activeOpacity={0.7}
      onPress={() => setSelectedCustomer(customer)}
    >
      <View style={styles.customerCardTop}>
        <View style={styles.customerInitialCircle}>
          <Text style={styles.customerInitialText}>
            {customer.name.charAt(0)}
          </Text>
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerAddress} numberOfLines={1}>
            {customer.address}
          </Text>
          <Text style={styles.customerLastService}>
            Last service: {customer.lastServiceDate}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customer Lookup</Text>
      </View>

      {/* ── Search Bar ────────────────────────────────────── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>S</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, address, or phone..."
            placeholderTextColor={TEXT_TERTIARY}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearButton}>X</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Section Label ─────────────────────────────────── */}
      <View style={styles.sectionLabelRow}>
        <Text style={styles.sectionLabel}>
          {isShowingRecent ? 'Recent Customers' : `${filteredCustomers.length} Results`}
        </Text>
      </View>

      {/* ── Customer List ─────────────────────────────────── */}
      <FlatList
        data={filteredCustomers}
        keyExtractor={(item) => item.id}
        renderItem={renderCustomerItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.cardGap} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No customers found</Text>
            <Text style={styles.emptyStateSub}>
              Try a different search term
            </Text>
          </View>
        }
        keyboardShouldPersistTaps="handled"
      />

      {/* ── Customer Detail Modal ─────────────────────────── */}
      <Modal
        visible={selectedCustomer !== null}
        animationType="slide"
        onRequestClose={() => setSelectedCustomer(null)}
      >
        {selectedCustomer && (
          <SafeAreaView style={styles.detailSafeArea}>
            {/* Detail header */}
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
                <Text style={styles.detailBackText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.detailHeaderTitle} numberOfLines={1}>
                {selectedCustomer.name}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView
              style={styles.detailScroll}
              contentContainerStyle={styles.detailContent}
            >
              {/* ── Contact Info ─────────────────────────── */}
              <View style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>Contact Information</Text>
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>Contact</Text>
                  <Text style={styles.contactValue}>
                    {selectedCustomer.contactPerson}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => handleCall(selectedCustomer.phone)}
                >
                  <Text style={styles.contactLabel}>Phone</Text>
                  <Text style={[styles.contactValue, styles.contactLink]}>
                    {selectedCustomer.phone}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => handleEmail(selectedCustomer.email)}
                >
                  <Text style={styles.contactLabel}>Email</Text>
                  <Text style={[styles.contactValue, styles.contactLink]}>
                    {selectedCustomer.email}
                  </Text>
                </TouchableOpacity>
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>Address</Text>
                  <Text style={styles.contactValue}>
                    {selectedCustomer.address}
                  </Text>
                </View>

                {/* Quick action buttons */}
                <View style={styles.contactActions}>
                  <TouchableOpacity
                    style={styles.contactActionBtn}
                    onPress={() => handleCall(selectedCustomer.phone)}
                  >
                    <Text style={styles.contactActionBtnText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.contactActionBtn}
                    onPress={() => handleEmail(selectedCustomer.email)}
                  >
                    <Text style={styles.contactActionBtnText}>Email</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.contactActionBtnPrimary}
                    onPress={() => {
                      // TODO: Open maps/directions
                    }}
                  >
                    <Text style={styles.contactActionBtnPrimaryText}>
                      Directions
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── Locations ────────────────────────────── */}
              <View style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>
                  Locations ({selectedCustomer.locations.length})
                </Text>
                {selectedCustomer.locations.map((loc) => (
                  <View key={loc.id} style={styles.locationRow}>
                    <Text style={styles.locationName}>{loc.name}</Text>
                    <Text style={styles.locationAddress}>{loc.address}</Text>
                  </View>
                ))}
              </View>

              {/* ── Equipment ────────────────────────────── */}
              <View style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>
                  Equipment ({selectedCustomer.equipment.length})
                </Text>
                {selectedCustomer.equipment.map((eq) => (
                  <View key={eq.id} style={styles.equipmentRow}>
                    <View style={styles.equipmentInfo}>
                      <Text style={styles.equipmentType}>{eq.type}</Text>
                      <Text style={styles.equipmentModel}>{eq.model}</Text>
                    </View>
                    <Text style={styles.equipmentServiceDate}>
                      {eq.lastServiceDate}
                    </Text>
                  </View>
                ))}
              </View>

              {/* ── Service History ──────────────────────── */}
              <View style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>
                  Service History (Last 5)
                </Text>
                {selectedCustomer.serviceHistory.map((item) => {
                  const statusStyle = STATUS_BADGE_COLORS[item.status];
                  return (
                    <View key={item.id} style={styles.historyRow}>
                      <View style={styles.historyLeft}>
                        <Text style={styles.historyJobNumber}>
                          {item.jobNumber}
                        </Text>
                        <Text style={styles.historyService}>
                          {item.serviceType}
                        </Text>
                        <Text style={styles.historyMeta}>
                          {item.date} - {item.technician}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.historyStatusBadge,
                          { backgroundColor: statusStyle.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.historyStatusText,
                            { color: statusStyle.text },
                          ]}
                        >
                          {item.status.charAt(0).toUpperCase() +
                            item.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* ── Upcoming Jobs ────────────────────────── */}
              <View style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>Upcoming Jobs</Text>
                {selectedCustomer.upcomingJobs.length === 0 ? (
                  <Text style={styles.noUpcomingText}>
                    No upcoming jobs scheduled
                  </Text>
                ) : (
                  selectedCustomer.upcomingJobs.map((item) => (
                    <View key={item.id} style={styles.upcomingRow}>
                      <View style={styles.upcomingLeft}>
                        <Text style={styles.upcomingJobNumber}>
                          {item.jobNumber}
                        </Text>
                        <Text style={styles.upcomingService}>
                          {item.serviceType}
                        </Text>
                      </View>
                      <View style={styles.upcomingRight}>
                        <Text style={styles.upcomingDate}>{item.date}</Text>
                        <Text style={styles.upcomingTech}>
                          {item.technician}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },

  // Header
  header: {
    backgroundColor: CARD_BG,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },

  // Search
  searchContainer: {
    backgroundColor: CARD_BG,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIGHT_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_TERTIARY,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT_PRIMARY,
    padding: 0,
  },
  clearButton: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_TERTIARY,
    padding: 4,
  },

  // Section label
  sectionLabelRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  cardGap: {
    height: 10,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  emptyStateSub: {
    fontSize: 14,
    color: TEXT_TERTIARY,
  },

  // Customer card
  customerCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  customerCardTop: {
    flexDirection: 'row',
    gap: 12,
  },
  customerInitialCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInitialText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: '700',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  customerAddress: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginBottom: 2,
  },
  customerLastService: {
    fontSize: 12,
    color: TEXT_TERTIARY,
  },

  // ── Detail Modal Styles ────────────────────────────────
  detailSafeArea: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },
  detailHeader: {
    backgroundColor: BRAND,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  detailBackText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '600',
  },
  detailHeaderTitle: {
    color: WHITE,
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  detailScroll: {
    flex: 1,
  },
  detailContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },

  // Detail card
  detailCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 12,
  },

  // Contact info
  contactRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  contactLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_TERTIARY,
    width: 70,
  },
  contactValue: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    flex: 1,
  },
  contactLink: {
    color: BRAND,
    fontWeight: '600',
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  contactActionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  contactActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND,
  },
  contactActionBtnPrimary: {
    flex: 1,
    backgroundColor: BRAND,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  contactActionBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: WHITE,
  },

  // Locations
  locationRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },

  // Equipment
  equipmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  equipmentInfo: {
    flex: 1,
  },
  equipmentType: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  equipmentModel: {
    fontSize: 12,
    color: TEXT_TERTIARY,
  },
  equipmentServiceDate: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },

  // Service history
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  historyLeft: {
    flex: 1,
  },
  historyJobNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND,
    marginBottom: 2,
  },
  historyService: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  historyMeta: {
    fontSize: 12,
    color: TEXT_TERTIARY,
  },
  historyStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  historyStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Upcoming jobs
  noUpcomingText: {
    fontSize: 14,
    color: TEXT_TERTIARY,
    fontStyle: 'italic',
  },
  upcomingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  upcomingLeft: {
    flex: 1,
  },
  upcomingJobNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND,
    marginBottom: 2,
  },
  upcomingService: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  upcomingRight: {
    alignItems: 'flex-end',
  },
  upcomingDate: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  upcomingTech: {
    fontSize: 12,
    color: TEXT_TERTIARY,
  },
});
