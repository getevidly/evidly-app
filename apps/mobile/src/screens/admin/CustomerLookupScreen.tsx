import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ServiceRecord {
  date: string;
  type: string;
  technician: string;
}

interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  nextScheduled: string;
  complianceStatus: 'current' | 'due_soon' | 'overdue';
  serviceHistory: ServiceRecord[];
}

/* ------------------------------------------------------------------ */
/*  Demo data                                                         */
/* ------------------------------------------------------------------ */

const COMPLIANCE_CONFIG: Record<
  Customer['complianceStatus'],
  { label: string; color: string; bgColor: string }
> = {
  current: { label: 'Current', color: '#27ae60', bgColor: '#eafaf1' },
  due_soon: { label: 'Due Soon', color: '#f39c12', bgColor: '#fef5e7' },
  overdue: { label: 'Overdue', color: '#c0392b', bgColor: '#fdedec' },
};

const CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    name: 'Marriott Downtown',
    address: '100 Main St, Los Angeles, CA 90012',
    phone: '(213) 555-0101',
    nextScheduled: 'Mar 28, 2026',
    complianceStatus: 'current',
    serviceHistory: [
      { date: 'Mar 14, 2026', type: 'KEC', technician: 'Mike Rodriguez' },
      { date: 'Dec 10, 2025', type: 'KEC', technician: 'Mike Rodriguez' },
      { date: 'Sep 5, 2025', type: 'FSI', technician: 'James Lee' },
    ],
  },
  {
    id: 'c2',
    name: 'Chipotle #4412',
    address: '220 Oak Ave, Los Angeles, CA 90015',
    phone: '(213) 555-0202',
    nextScheduled: 'Apr 2, 2026',
    complianceStatus: 'current',
    serviceHistory: [
      { date: 'Mar 14, 2026', type: 'KEC', technician: 'Sarah Thompson' },
      { date: 'Nov 20, 2025', type: 'KEC', technician: 'Sarah Thompson' },
    ],
  },
  {
    id: 'c3',
    name: 'Hilton Airport',
    address: '500 Airport Blvd, Los Angeles, CA 90045',
    phone: '(310) 555-0303',
    nextScheduled: 'Mar 20, 2026',
    complianceStatus: 'due_soon',
    serviceHistory: [
      { date: 'Mar 13, 2026', type: 'FPM', technician: 'Ana Garcia' },
      { date: 'Jan 15, 2026', type: 'KEC', technician: 'Mike Rodriguez' },
      { date: 'Oct 8, 2025', type: 'FSI', technician: 'James Lee' },
      { date: 'Jul 2, 2025', type: 'KEC', technician: 'Mike Rodriguez' },
    ],
  },
  {
    id: 'c4',
    name: 'Wingstop #221',
    address: '340 Elm St, Pasadena, CA 91101',
    phone: '(626) 555-0404',
    nextScheduled: 'Overdue',
    complianceStatus: 'overdue',
    serviceHistory: [
      { date: 'Mar 13, 2026', type: 'FSI', technician: 'James Lee' },
      { date: 'Aug 22, 2025', type: 'KEC', technician: 'David Kim' },
    ],
  },
  {
    id: 'c5',
    name: 'Panera Bread University',
    address: '800 College Dr, Westwood, CA 90024',
    phone: '(310) 555-0505',
    nextScheduled: 'Apr 10, 2026',
    complianceStatus: 'current',
    serviceHistory: [
      { date: 'Mar 12, 2026', type: 'KEC', technician: 'Mike Rodriguez' },
      { date: 'Dec 1, 2025', type: 'KEC', technician: 'Sarah Thompson' },
      { date: 'Sep 15, 2025', type: 'FPM', technician: 'Ana Garcia' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function CustomerLookupScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  const filtered = searchQuery.trim()
    ? CUSTOMERS.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.address.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : CUSTOMERS;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customer Lookup</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or address..."
          placeholderTextColor="#6B7F96"
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            setSelectedCustomer(null);
          }}
        />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Selected customer detail */}
        {selectedCustomer && (
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <View style={styles.detailHeaderLeft}>
                <Text style={styles.detailName}>{selectedCustomer.name}</Text>
                <Text style={styles.detailAddress}>
                  {selectedCustomer.address}
                </Text>
                <Text style={styles.detailPhone}>
                  {selectedCustomer.phone}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
                <Text style={styles.closeBtn}>X</Text>
              </TouchableOpacity>
            </View>

            {/* Status row */}
            <View style={styles.detailStatusRow}>
              <View style={styles.detailStatusItem}>
                <Text style={styles.detailStatusLabel}>Next Scheduled</Text>
                <Text style={styles.detailStatusValue}>
                  {selectedCustomer.nextScheduled}
                </Text>
              </View>
              <View style={styles.detailStatusItem}>
                <Text style={styles.detailStatusLabel}>Compliance</Text>
                <View
                  style={[
                    styles.complianceBadge,
                    {
                      backgroundColor:
                        COMPLIANCE_CONFIG[selectedCustomer.complianceStatus]
                          .bgColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.complianceBadgeText,
                      {
                        color:
                          COMPLIANCE_CONFIG[selectedCustomer.complianceStatus]
                            .color,
                      },
                    ]}
                  >
                    {
                      COMPLIANCE_CONFIG[selectedCustomer.complianceStatus]
                        .label
                    }
                  </Text>
                </View>
              </View>
            </View>

            {/* Service history */}
            <Text style={styles.historyTitle}>Service History</Text>
            {selectedCustomer.serviceHistory.map((record, idx) => (
              <View key={idx} style={styles.historyRow}>
                <Text style={styles.historyDate}>{record.date}</Text>
                <View style={styles.historyTypeBadge}>
                  <Text style={styles.historyTypeText}>{record.type}</Text>
                </View>
                <Text style={styles.historyTech}>{record.technician}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Customer list */}
        {!selectedCustomer && (
          <View>
            <Text style={styles.listLabel}>
              {searchQuery.trim() ? 'Search Results' : 'Recent Customers'}
            </Text>
            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No customers found</Text>
              </View>
            ) : (
              filtered.map((customer) => {
                const cfg = COMPLIANCE_CONFIG[customer.complianceStatus];
                return (
                  <TouchableOpacity
                    key={customer.id}
                    style={styles.customerRow}
                    onPress={() => setSelectedCustomer(customer)}
                  >
                    <View style={styles.customerRowLeft}>
                      <Text style={styles.customerName}>{customer.name}</Text>
                      <Text style={styles.customerAddress}>
                        {customer.address}
                      </Text>
                      <Text style={styles.customerNext}>
                        Next: {customer.nextScheduled}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.complianceDot,
                        { backgroundColor: cfg.color },
                      ]}
                    />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },

  /* Header */
  header: {
    backgroundColor: '#07111F',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Search */
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0B1628',
    borderWidth: 1,
    borderColor: '#D1D9E6',
  },

  /* Scroll */
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  /* List label */
  listLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7F96',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Customer row */
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D1D9E6',
  },
  customerRowLeft: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0B1628',
  },
  customerAddress: {
    fontSize: 12,
    color: '#6B7F96',
    marginTop: 2,
  },
  customerNext: {
    fontSize: 12,
    color: '#3D5068',
    marginTop: 4,
  },
  complianceDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 10,
  },

  /* Empty */
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7F96',
  },

  /* Detail card */
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#D1D9E6',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailHeaderLeft: {
    flex: 1,
  },
  detailName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0B1628',
  },
  detailAddress: {
    fontSize: 13,
    color: '#6B7F96',
    marginTop: 4,
  },
  detailPhone: {
    fontSize: 13,
    color: '#1e4d6b',
    marginTop: 4,
    fontWeight: '600',
  },
  closeBtn: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7F96',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  /* Detail status */
  detailStatusRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
  },
  detailStatusItem: {
    flex: 1,
  },
  detailStatusLabel: {
    fontSize: 11,
    color: '#6B7F96',
  },
  detailStatusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0B1628',
    marginTop: 4,
  },
  complianceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
  },
  complianceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* Service history */
  historyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0B1628',
    marginTop: 18,
    marginBottom: 10,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
  },
  historyDate: {
    fontSize: 13,
    color: '#3D5068',
    width: 110,
  },
  historyTypeBadge: {
    backgroundColor: '#1e4d6b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 10,
  },
  historyTypeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  historyTech: {
    fontSize: 13,
    color: '#6B7F96',
    flex: 1,
  },
});
