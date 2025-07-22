import AuthNavigator from './src/navigation/AuthNavigator';
import 'react-native-url-polyfill/auto';
import React, { Suspense } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { View, Text, StyleSheet } from 'react-native';

import { ThemeProvider } from '../../packages/theme/src';
import Loading from './src/components/Loading';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider, useAuth } from './src/context/AuthContext';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

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