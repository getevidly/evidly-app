import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

/* ------------------------------------------------------------------ */
/*  Menu items                                                        */
/* ------------------------------------------------------------------ */

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  description: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'customer-lookup',
    icon: '\uD83D\uDD0D',
    label: 'Customer Lookup',
    description: 'Search customers & service history',
  },
  {
    id: 'reports',
    icon: '\uD83D\uDCCA',
    label: 'Reports',
    description: 'View and export service reports',
  },
  {
    id: 'settings',
    icon: '\u2699\uFE0F',
    label: 'Settings',
    description: 'App preferences & account settings',
  },
  {
    id: 'notifications',
    icon: '\uD83D\uDD14',
    label: 'Notifications',
    description: 'Manage alerts & push notifications',
  },
  {
    id: 'billing',
    icon: '\uD83D\uDCB3',
    label: 'Billing',
    description: 'Invoices, payments & pricing',
  },
  {
    id: 'help',
    icon: '\u2753',
    label: 'Help',
    description: 'Support, guides & contact info',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function AdminMoreScreen() {
  const handlePress = (item: MenuItem) => {
    Alert.alert(item.label, `Navigate to ${item.label} screen`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
        <Text style={styles.headerSubtitle}>Admin tools & settings</Text>
      </View>

      {/* Menu grid */}
      <View style={styles.grid}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.tile}
            onPress={() => handlePress(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.tileIcon}>{item.icon}</Text>
            <Text style={styles.tileLabel}>{item.label}</Text>
            <Text style={styles.tileDescription}>{item.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Footer info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>HoodOps Admin v1.0.0</Text>
        <Text style={styles.footerSubtext}>Hood cleaning operations platform</Text>
      </View>
    </ScrollView>
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
  content: {
    paddingBottom: 32,
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
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7F96',
    marginTop: 4,
  },

  /* Grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: 16,
  },
  tile: {
    width: '46%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    margin: '2%',
    borderWidth: 1,
    borderColor: '#D1D9E6',
    alignItems: 'center',
  },
  tileIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  tileLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B1628',
    textAlign: 'center',
  },
  tileDescription: {
    fontSize: 11,
    color: '#6B7F96',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },

  /* Footer */
  footer: {
    alignItems: 'center',
    marginTop: 36,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7F96',
  },
  footerSubtext: {
    fontSize: 11,
    color: '#B8C4D8',
    marginTop: 4,
  },
});
