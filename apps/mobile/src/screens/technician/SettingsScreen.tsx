import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Switch,
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
const DANGER = '#dc2626';

// ── Placeholder data ─────────────────────────────────────────
// TODO: Replace with useProfile() and useSettings() hooks
const PROFILE = {
  name: 'Marcus Johnson',
  phone: '(562) 555-0188',
  email: 'marcus.johnson@hoodops.com',
};

const APP_VERSION = '1.4.2';
const BUILD_NUMBER = '87';

export function SettingsScreen({ navigation }: { navigation?: any }) {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [scheduleUpdates, setScheduleUpdates] = useState(true);
  const [offlineMode, setOfflineMode] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [cameraQuality, setCameraQuality] = useState<'high' | 'medium'>('high');
  const [gridOverlayDefault, setGridOverlayDefault] = useState(true);

  const handleSignOut = () => {
    // TODO: Call auth signOut, navigate to login
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        {/* ── Profile ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>MJ</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{PROFILE.name}</Text>
                <Text style={styles.profileDetail}>{PROFILE.phone}</Text>
                <Text style={styles.profileDetail}>{PROFILE.email}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => {
                // TODO: navigation.navigate('EditProfile')
              }}
            >
              <Text style={styles.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Notifications ─────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive alerts on your device
                </Text>
              </View>
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                trackColor={{ false: BORDER, true: BRAND }}
                thumbColor={WHITE}
              />
            </View>
            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Job Alerts</Text>
                <Text style={styles.settingDescription}>
                  New jobs and schedule changes
                </Text>
              </View>
              <Switch
                value={jobAlerts}
                onValueChange={setJobAlerts}
                trackColor={{ false: BORDER, true: BRAND }}
                thumbColor={WHITE}
              />
            </View>
            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Schedule Updates</Text>
                <Text style={styles.settingDescription}>
                  Changes to weekly schedule
                </Text>
              </View>
              <Switch
                value={scheduleUpdates}
                onValueChange={setScheduleUpdates}
                trackColor={{ false: BORDER, true: BRAND }}
                thumbColor={WHITE}
              />
            </View>
          </View>
        </View>

        {/* ── Offline Mode ──────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Offline Mode</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Enable Offline Mode</Text>
                <Text style={styles.settingDescription}>
                  Cache jobs and checklists for offline use
                </Text>
              </View>
              <Switch
                value={offlineMode}
                onValueChange={setOfflineMode}
                trackColor={{ false: BORDER, true: BRAND }}
                thumbColor={WHITE}
              />
            </View>
            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Auto-Sync</Text>
                <Text style={styles.settingDescription}>
                  Sync data when connection is restored
                </Text>
              </View>
              <Switch
                value={autoSync}
                onValueChange={setAutoSync}
                trackColor={{ false: BORDER, true: BRAND }}
                thumbColor={WHITE}
              />
            </View>
          </View>
        </View>

        {/* ── Camera Settings ───────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Camera</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Photo Quality</Text>
              <View style={styles.qualityToggle}>
                <TouchableOpacity
                  style={[
                    styles.qualityOption,
                    cameraQuality === 'high' && styles.qualityOptionActive,
                  ]}
                  onPress={() => setCameraQuality('high')}
                >
                  <Text
                    style={[
                      styles.qualityOptionText,
                      cameraQuality === 'high' && styles.qualityOptionTextActive,
                    ]}
                  >
                    High
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.qualityOption,
                    cameraQuality === 'medium' && styles.qualityOptionActive,
                  ]}
                  onPress={() => setCameraQuality('medium')}
                >
                  <Text
                    style={[
                      styles.qualityOptionText,
                      cameraQuality === 'medium' && styles.qualityOptionTextActive,
                    ]}
                  >
                    Medium
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Grid Overlay Default</Text>
                <Text style={styles.settingDescription}>
                  Show composition grid when camera opens
                </Text>
              </View>
              <Switch
                value={gridOverlayDefault}
                onValueChange={setGridOverlayDefault}
                trackColor={{ false: BORDER, true: BRAND }}
                thumbColor={WHITE}
              />
            </View>
          </View>
        </View>

        {/* ── About ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>App Version</Text>
              <Text style={styles.aboutValue}>{APP_VERSION}</Text>
            </View>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Build</Text>
              <Text style={styles.aboutValue}>{BUILD_NUMBER}</Text>
            </View>
            <TouchableOpacity
              style={styles.supportBtn}
              onPress={() => {
                // TODO: Open support email / in-app support
              }}
            >
              <Text style={styles.supportBtnText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Sign Out ──────────────────────────────────── */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>
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

  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_TERTIARY,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingLeft: 4,
  },

  // Card
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },

  // Profile
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: '700',
  },
  profileInfo: {},
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  profileDetail: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  editProfileBtn: {
    borderWidth: 1,
    borderColor: BRAND,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND,
  },

  // Setting row
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  settingDescription: {
    fontSize: 12,
    color: TEXT_TERTIARY,
    marginTop: 1,
  },
  settingDivider: {
    height: 1,
    backgroundColor: LIGHT_BG,
    marginVertical: 10,
  },

  // Quality toggle
  qualityToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    overflow: 'hidden',
  },
  qualityOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  qualityOptionActive: {
    backgroundColor: BRAND,
  },
  qualityOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  qualityOptionTextActive: {
    color: WHITE,
  },

  // About
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_BG,
  },
  aboutLabel: {
    fontSize: 13,
    color: TEXT_TERTIARY,
  },
  aboutValue: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  supportBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: BRAND,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  supportBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND,
  },

  // Sign out
  signOutBtn: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: DANGER,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutBtnText: {
    color: DANGER,
    fontSize: 16,
    fontWeight: '700',
  },
});
