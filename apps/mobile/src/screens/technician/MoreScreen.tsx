import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

interface MoreTile {
  id: string;
  label: string;
  icon: string;
  screen: string;
  description: string;
}

const TILES: MoreTile[] = [
  {
    id: 'schedule',
    label: 'Schedule',
    icon: '\uD83D\uDCC5',
    screen: 'Schedule',
    description: 'Weekly job schedule',
  },
  {
    id: 'availability',
    label: 'Availability',
    icon: '\uD83D\uDD52',
    screen: 'Availability',
    description: 'Set your work hours',
  },
  {
    id: 'timecards',
    label: 'Timecards',
    icon: '\u23F1\uFE0F',
    screen: 'Timecards',
    description: 'Track time and hours',
  },
  {
    id: 'emergency',
    label: 'Emergency',
    icon: '\uD83D\uDEA8',
    screen: 'Emergency',
    description: 'Safety contacts and info',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '\u2699\uFE0F',
    screen: 'Settings',
    description: 'App preferences',
  },
];

export function MoreScreen() {
  const handleNavigate = (tile: MoreTile) => {
    Alert.alert('Navigate', `Would navigate to ${tile.screen} screen (demo).`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>More</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.grid}>
          {TILES.map((tile) => (
            <TouchableOpacity
              key={tile.id}
              style={styles.tile}
              onPress={() => handleNavigate(tile)}
            >
              <Text style={styles.tileIcon}>{tile.icon}</Text>
              <Text style={styles.tileLabel}>{tile.label}</Text>
              <Text style={styles.tileDescription}>{tile.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>HoodOps Field</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0B1628',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tileIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  tileLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B1628',
  },
  tileDescription: {
    fontSize: 11,
    color: '#6B7F96',
    marginTop: 4,
    textAlign: 'center',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 40,
  },
  appName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B8C4D8',
  },
  appVersion: {
    fontSize: 12,
    color: '#D1D9E6',
    marginTop: 2,
  },
});
