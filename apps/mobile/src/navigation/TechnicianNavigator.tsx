import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { TechnicianTabParamList } from './types';

/* ------------------------------------------------------------------ */
/*  Brand constants                                                    */
/* ------------------------------------------------------------------ */

const BRAND_PRIMARY = '#1e4d6b';
const TAB_INACTIVE = '#8E9AAF';
const TAB_BG = '#FFFFFF';

/* ------------------------------------------------------------------ */
/*  Placeholder screens (to be replaced with real screens)             */
/* ------------------------------------------------------------------ */

function TodayScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Today</Text>
      <Text style={styles.subtitle}>Your scheduled jobs for today</Text>
    </View>
  );
}

function JobsScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Jobs</Text>
      <Text style={styles.subtitle}>All assigned jobs</Text>
    </View>
  );
}

function CameraScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Camera</Text>
      <Text style={styles.subtitle}>Capture job site photos</Text>
    </View>
  );
}

function MoreScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>More</Text>
      <Text style={styles.subtitle}>Settings, profile, offline queue</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Simple icon placeholders (text-based, swap for SVG icons later)    */
/* ------------------------------------------------------------------ */

function TabIcon({
  label,
  focused,
}: {
  label: string;
  focused: boolean;
}) {
  // Map tab names to simple Unicode symbols as placeholder icons
  const iconMap: Record<string, string> = {
    Today: '\u2600',    // sun
    Jobs: '\u2691',     // flag
    Camera: '\u25CE',   // bullseye
    More: '\u2026',     // ellipsis
  };

  return (
    <Text
      style={[
        styles.tabIcon,
        { color: focused ? BRAND_PRIMARY : TAB_INACTIVE },
      ]}
    >
      {iconMap[label] ?? '\u25A0'}
    </Text>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom Camera tab button (larger, centred)                         */
/* ------------------------------------------------------------------ */

function CameraTabButton(props: any) {
  const { onPress } = props;
  return (
    <TouchableOpacity
      style={styles.cameraButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cameraButtonInner}>
        <Text style={styles.cameraButtonIcon}>{'\u25CE'}</Text>
      </View>
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/*  Navigator                                                          */
/* ------------------------------------------------------------------ */

const Tab = createBottomTabNavigator<TechnicianTabParamList>();

export function TechnicianNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND_PRIMARY,
        tabBarInactiveTintColor: TAB_INACTIVE,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="TodayTab"
        component={TodayScreen}
        options={{
          tabBarLabel: 'Today',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Today" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="JobsTab"
        component={JobsScreen}
        options={{
          tabBarLabel: 'Jobs',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Jobs" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="CameraTab"
        component={CameraScreen}
        options={{
          tabBarLabel: '',
          tabBarButton: (props) => <CameraTabButton {...props} />,
        }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreScreen}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="More" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F6FA',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0B1628',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7F96',
    textAlign: 'center',
  },
  tabBar: {
    backgroundColor: TAB_BG,
    borderTopWidth: 1,
    borderTopColor: '#D1D9E6',
    height: 88,
    paddingBottom: 24,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  cameraButton: {
    top: -18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: BRAND_PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  cameraButtonIcon: {
    fontSize: 28,
    color: '#FFFFFF',
  },
});
