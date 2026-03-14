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

// ── Navigation items ──────────────────────────────────────────
interface MenuItem {
  key: string;
  label: string;
  icon: string;
  description: string;
  screen: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    key: 'availability',
    label: 'Availability',
    icon: '📅',
    description: 'Submit your weekly availability',
    screen: 'Availability',
  },
  {
    key: 'timecards',
    label: 'Timecards',
    icon: '⏰',
    description: 'View hours and clock in/out',
    screen: 'Timecards',
  },
  {
    key: 'emergency',
    label: 'Emergency Info',
    icon: '🚨',
    description: 'Emergency contacts and procedures',
    screen: 'Emergency',
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: '⚙️',
    description: 'App preferences and profile',
    screen: 'Settings',
  },
];

export function MoreScreen({ navigation }: { navigation?: any }) {
  const handleNavigate = (screen: string) => {
    // TODO: navigation.navigate(screen)
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>More</Text>

        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => handleNavigate(item.screen)}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>{item.icon}</Text>
              </View>
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemLabel}>{item.label}</Text>
                <Text style={styles.menuItemDescription}>{item.description}</Text>
              </View>
            </View>
            <Text style={styles.chevron}>{'>'}</Text>
          </TouchableOpacity>
        ))}

        {/* App info footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>HoodOps Technician v1.4.2</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 16,
  },

  // Menu item
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: LIGHT_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 22,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  chevron: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_TERTIARY,
    marginLeft: 8,
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 12,
    color: TEXT_TERTIARY,
  },
});
