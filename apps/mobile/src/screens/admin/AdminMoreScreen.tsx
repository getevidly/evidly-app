import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';

// ── Brand tokens ──────────────────────────────────────────────
const BRAND = '#1e4d6b';
const GOLD = '#d4af37';
const WHITE = '#ffffff';
const LIGHT_BG = '#F4F6FA';
const CARD_BG = '#ffffff';
const TEXT_PRIMARY = '#0B1628';
const TEXT_SECONDARY = '#3D5068';
const TEXT_TERTIARY = '#6B7F96';
const BORDER = '#D1D9E6';

// ── Menu config ───────────────────────────────────────────────

interface MenuItem {
  key: string;
  label: string;
  subtitle: string;
  icon: string;
  screen: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'Operations',
    items: [
      {
        key: 'customers',
        label: 'Customer Lookup',
        subtitle: 'Search and manage customer accounts',
        icon: 'CL',
        screen: 'CustomerLookup',
      },
      {
        key: 'qa',
        label: 'QA Review',
        subtitle: 'Review and approve completed jobs',
        icon: 'QA',
        screen: 'QAReview',
      },
    ],
  },
  {
    title: 'Analytics',
    items: [
      {
        key: 'reports',
        label: 'Reports',
        subtitle: 'Performance, revenue, and compliance reports',
        icon: 'RP',
        screen: 'Reports',
      },
      {
        key: 'analytics',
        label: 'Analytics Dashboard',
        subtitle: 'KPIs, trends, and team metrics',
        icon: 'AD',
        screen: 'Analytics',
      },
    ],
  },
  {
    title: 'Management',
    items: [
      {
        key: 'team',
        label: 'Team Management',
        subtitle: 'Manage technician profiles and certifications',
        icon: 'TM',
        screen: 'TeamManagement',
      },
      {
        key: 'equipment',
        label: 'Equipment Inventory',
        subtitle: 'Track vehicle and equipment inventory',
        icon: 'EQ',
        screen: 'Equipment',
      },
      {
        key: 'pricing',
        label: 'Pricing & Estimates',
        subtitle: 'Manage service pricing templates',
        icon: 'PR',
        screen: 'Pricing',
      },
    ],
  },
  {
    title: 'Settings',
    items: [
      {
        key: 'settings',
        label: 'Settings',
        subtitle: 'App preferences and account settings',
        icon: 'ST',
        screen: 'Settings',
      },
      {
        key: 'notifications',
        label: 'Notification Preferences',
        subtitle: 'Configure alerts and push notifications',
        icon: 'NP',
        screen: 'NotificationSettings',
      },
      {
        key: 'help',
        label: 'Help & Support',
        subtitle: 'FAQ, tutorials, and contact support',
        icon: 'HP',
        screen: 'Help',
      },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────

export function AdminMoreScreen({ navigation }: { navigation?: any }) {
  const handleMenuPress = (screen: string) => {
    // TODO: navigation.navigate(screen)
    // For now most screens are placeholders — wire up as they are built
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* ── Header ──────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>More</Text>
        </View>

        {/* ── Menu Sections ───────────────────────────────── */}
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.menuRow,
                    index < section.items.length - 1 && styles.menuRowBorder,
                  ]}
                  activeOpacity={0.6}
                  onPress={() => handleMenuPress(item.screen)}
                >
                  <View style={styles.menuIconCircle}>
                    <Text style={styles.menuIconText}>{item.icon}</Text>
                  </View>
                  <View style={styles.menuTextBlock}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Text style={styles.menuChevron}>{'>'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* ── App Info ────────────────────────────────────── */}
        <View style={styles.appInfoBlock}>
          <Text style={styles.appInfoName}>HoodOps Admin</Text>
          <Text style={styles.appInfoVersion}>Version 1.0.0 (build 1)</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },

  // Header
  header: {
    backgroundColor: CARD_BG,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },

  // Section
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },

  // Menu row
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
  },
  menuTextBlock: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: TEXT_TERTIARY,
  },
  menuChevron: {
    fontSize: 16,
    color: TEXT_TERTIARY,
    fontWeight: '600',
  },

  // App info
  appInfoBlock: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  appInfoName: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  appInfoVersion: {
    fontSize: 12,
    color: TEXT_TERTIARY,
    marginTop: 4,
  },
});
