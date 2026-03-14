import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { AdminTabParamList } from './types';

/* ------------------------------------------------------------------ */
/*  Brand constants                                                    */
/* ------------------------------------------------------------------ */

const BRAND_PRIMARY = '#1e4d6b';
const TAB_INACTIVE = '#8E9AAF';
const TAB_BG = '#FFFFFF';

/* ------------------------------------------------------------------ */
/*  Placeholder screens (to be replaced with real screens)             */
/* ------------------------------------------------------------------ */

function DashboardScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Operations overview and KPIs</Text>
    </View>
  );
}

function DispatchScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Dispatch</Text>
      <Text style={styles.subtitle}>Assign and manage field jobs</Text>
    </View>
  );
}

function TeamScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Team</Text>
      <Text style={styles.subtitle}>Technician roster and availability</Text>
    </View>
  );
}

function QAScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>QA</Text>
      <Text style={styles.subtitle}>Quality assurance reviews</Text>
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
  const iconMap: Record<string, string> = {
    Dashboard: '\u25A3',  // square with fill
    Dispatch: '\u2690',   // flag outline
    Team: '\u263A',       // smiley
    QA: '\u2714',         // checkmark
    More: '\u2026',       // ellipsis
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
/*  Navigator                                                          */
/* ------------------------------------------------------------------ */

const Tab = createBottomTabNavigator<AdminTabParamList>();

export function AdminNavigator() {
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
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Dashboard" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="DispatchTab"
        component={DispatchScreen}
        options={{
          tabBarLabel: 'Dispatch',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Dispatch" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="TeamTab"
        component={TeamScreen}
        options={{
          tabBarLabel: 'Team',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Team" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="QATab"
        component={QAScreen}
        options={{
          tabBarLabel: 'QA',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="QA" focused={focused} />
          ),
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
});
