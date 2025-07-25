import 'react-native-url-polyfill/auto';
import React, { Suspense } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { ThemeProvider } from '../../packages/theme/src';
import Loading from './src/components/Loading';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';

function AppContent() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <NavigationContainer>
      <RootNavigator />  {/* ✅ Only this */}
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
