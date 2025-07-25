import AuthNavigator from './src/navigation/AuthNavigator';
import 'react-native-url-polyfill/auto';
import React, { Suspense } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';

import { ThemeProvider } from '../../packages/theme/src';

// Local imports
import Loading from './src/components/Loading';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';

const styles = StyleSheet.create({
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  authText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  authSubText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
  },
});

function AppContent() {
  const isAuthenticated = true; // 🔥 Bypass login by forcing authenticated state
  const isLoading = false; // Skip loading

  if (isLoading) {
    return <Loading />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Suspense fallback={<Loading />}>
          <AppContent />
          <Toast />
        </Suspense>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}


