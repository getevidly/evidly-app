import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { OfflineProvider } from './src/contexts/OfflineContext';
import { TechnicianNavigator } from './src/navigation/TechnicianNavigator';
import { AdminNavigator } from './src/navigation/AdminNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

/** Roles that see the admin/dispatch navigator */
const ADMIN_ROLES = [
  'owner_operator',
  'executive',
  'dispatch',
  'admin',
  'platform_admin',
];

/**
 * Inner navigator picker -- reads the authenticated user's role
 * and renders the correct bottom-tab stack.
 */
function RootNavigator() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1e4d6b" />
      </View>
    );
  }

  // Not authenticated -- show technician stack which will land on a
  // sign-in screen (added as a screen inside the navigator).
  if (!user) {
    return <TechnicianNavigator />;
  }

  const role = profile?.role ?? 'technician';
  const isAdmin = ADMIN_ROLES.includes(role);

  return isAdmin ? <AdminNavigator /> : <TechnicianNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <OfflineProvider>
              <NavigationContainer>
                <StatusBar style="light" backgroundColor="#1e4d6b" />
                <RootNavigator />
              </NavigationContainer>
            </OfflineProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});
