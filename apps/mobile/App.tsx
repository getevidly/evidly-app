import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { OfflineProvider } from './src/contexts/OfflineContext';
import { TechnicianNavigator } from './src/navigation/TechnicianNavigator';
import { AdminNavigator } from './src/navigation/AdminNavigator';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';

function AppContent() {
  const { user, role, loading, signIn } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e4d6b" />
        <Text style={styles.loadingText}>HoodOps</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loginContainer}>
        <View style={styles.loginCard}>
          <Text style={styles.loginTitle}>HoodOps</Text>
          <Text style={styles.loginSubtitle}>Field Service Platform</Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => signIn('demo@hoodops.com', 'demo123')}>
            <Text style={styles.loginButtonText}>Demo Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isAdmin = role === 'admin' || role === 'dispatcher' || role === 'owner';

  return (
    <>
      <StatusBar style="light" />
      {isAdmin ? <AdminNavigator /> : <TechnicianNavigator />}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AuthProvider>
          <OfflineProvider>
            <AppContent />
          </OfflineProvider>
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#07111F' },
  loadingText: { color: '#d4af37', fontSize: 24, fontWeight: '700', marginTop: 16 },
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#07111F', padding: 24 },
  loginCard: { backgroundColor: '#0B1628', borderRadius: 16, padding: 32, width: '100%', maxWidth: 360, alignItems: 'center' },
  loginTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
  loginSubtitle: { color: '#6B7F96', fontSize: 14, marginTop: 4, marginBottom: 32 },
  loginButton: { backgroundColor: '#1e4d6b', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center' },
  loginButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
