import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import type { TechnicianTabParams, TechnicianStackParams } from './types';

// Screens
import { TodayScreen } from '../screens/technician/TodayScreen';
import { JobsListScreen } from '../screens/technician/JobsListScreen';
import { JobDetailScreen } from '../screens/technician/JobDetailScreen';
import { ChecklistScreen } from '../screens/technician/ChecklistScreen';
import { PhotoCaptureScreen } from '../screens/technician/PhotoCaptureScreen';
import { DeficienciesScreen } from '../screens/technician/DeficienciesScreen';
import { ReportGeneratorScreen } from '../screens/technician/ReportGeneratorScreen';
import { ServiceReportScreen } from '../screens/technician/ServiceReportScreen';
import { ReportBuilderScreen } from '../screens/technician/ReportBuilderScreen';
import { SystemInspectionScreen } from '../screens/technician/SystemInspectionScreen';
import { ReportReviewScreen } from '../screens/technician/ReportReviewScreen';
import { NfpaLookupScreen } from '../screens/technician/NfpaLookupScreen';
import { SignatureScreen } from '../screens/technician/SignatureScreen';
import { ScheduleScreen } from '../screens/technician/ScheduleScreen';
import { AvailabilityScreen } from '../screens/technician/AvailabilityScreen';
import { TimecardsScreen } from '../screens/technician/TimecardsScreen';
import { EmergencyScreen } from '../screens/technician/EmergencyScreen';
import { SettingsScreen } from '../screens/technician/SettingsScreen';
import { MoreScreen } from '../screens/technician/MoreScreen';

const Tab = createBottomTabNavigator<TechnicianTabParams>();
const Stack = createNativeStackNavigator<TechnicianStackParams>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = { Today: '🏠', Jobs: '📋', Camera: '📷', Reports: '📄', More: '⋯' };
  return (
    <View style={styles.tabIcon}>
      <Text style={{ fontSize: 20 }}>{icons[label] || '•'}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

function TechTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: styles.tabBar, tabBarShowLabel: false }}>
      <Tab.Screen name="Today" component={TodayScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label="Today" focused={focused} /> }} />
      <Tab.Screen name="Jobs" component={JobsListScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label="Jobs" focused={focused} /> }} />
      <Tab.Screen name="Camera" component={PhotoCaptureScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label="Camera" focused={focused} /> }} />
      <Tab.Screen name="Reports" component={ServiceReportScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label="Reports" focused={focused} /> }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label="More" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

export function TechnicianNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#07111F' }, headerTintColor: '#FFFFFF', headerTitleStyle: { fontWeight: '600' } }}>
      <Stack.Screen name="TechTabs" component={TechTabs} options={{ headerShown: false }} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: 'Job Details' }} />
      <Stack.Screen name="Checklist" component={ChecklistScreen} options={{ title: 'Checklist' }} />
      <Stack.Screen name="PhotoCapture" component={PhotoCaptureScreen} options={{ title: 'Photo Capture' }} />
      <Stack.Screen name="Deficiencies" component={DeficienciesScreen} options={{ title: 'Deficiencies' }} />
      <Stack.Screen name="ReportGenerator" component={ReportGeneratorScreen} options={{ title: 'Generate Report' }} />
      <Stack.Screen name="ServiceReport" component={ServiceReportScreen} options={{ title: 'Service Reports' }} />
      <Stack.Screen name="ReportBuilder" component={ReportBuilderScreen} options={{ title: 'Report Builder' }} />
      <Stack.Screen name="SystemInspection" component={SystemInspectionScreen} options={{ title: 'System Inspection' }} />
      <Stack.Screen name="ReportReview" component={ReportReviewScreen} options={{ title: 'Review Report' }} />
      <Stack.Screen name="NfpaLookup" component={NfpaLookupScreen} options={{ title: 'NFPA Codes' }} />
      <Stack.Screen name="Signature" component={SignatureScreen} options={{ title: 'Signature' }} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} options={{ title: 'Schedule' }} />
      <Stack.Screen name="Availability" component={AvailabilityScreen} options={{ title: 'Availability' }} />
      <Stack.Screen name="Timecards" component={TimecardsScreen} options={{ title: 'Timecards' }} />
      <Stack.Screen name="Emergency" component={EmergencyScreen} options={{ title: 'Emergency Info' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: '#07111F', borderTopColor: '#1e4d6b', borderTopWidth: 1, height: 80, paddingBottom: 16 },
  tabIcon: { alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 10, color: '#6B7F96', marginTop: 2 },
  tabLabelActive: { color: '#d4af37' },
});
