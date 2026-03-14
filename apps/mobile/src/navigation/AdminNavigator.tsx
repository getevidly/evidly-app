import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import type { AdminTabParams, AdminStackParams } from './types';

import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { DispatchBoardScreen } from '../screens/admin/DispatchBoardScreen';
import { TeamStatusScreen } from '../screens/admin/TeamStatusScreen';
import { QAReviewScreen } from '../screens/admin/QAReviewScreen';
import { AdminMoreScreen } from '../screens/admin/AdminMoreScreen';
import { CustomerLookupScreen } from '../screens/admin/CustomerLookupScreen';

const Tab = createBottomTabNavigator<AdminTabParams>();
const Stack = createNativeStackNavigator<AdminStackParams>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = { Dashboard: '📊', Dispatch: '🗺️', Team: '👥', QA: '✅', More: '⋯' };
  return (
    <View style={styles.tabIcon}>
      <Text style={{ fontSize: 20 }}>{icons[label] || '•'}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: styles.tabBar, tabBarShowLabel: false }}>
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label="Dashboard" focused={focused} /> }} />
      <Tab.Screen name="Dispatch" component={DispatchBoardScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label="Dispatch" focused={focused} /> }} />
      <Tab.Screen name="Team" component={TeamStatusScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label="Team" focused={focused} /> }} />
      <Tab.Screen name="QA" component={QAReviewScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label="QA" focused={focused} /> }} />
      <Tab.Screen name="More" component={AdminMoreScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label="More" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

export function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#07111F' }, headerTintColor: '#FFFFFF', headerTitleStyle: { fontWeight: '600' } }}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false }} />
      <Stack.Screen name="CustomerLookup" component={CustomerLookupScreen} options={{ title: 'Customer Lookup' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: '#07111F', borderTopColor: '#1e4d6b', borderTopWidth: 1, height: 80, paddingBottom: 16 },
  tabIcon: { alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 10, color: '#6B7F96', marginTop: 2 },
  tabLabelActive: { color: '#d4af37' },
});
