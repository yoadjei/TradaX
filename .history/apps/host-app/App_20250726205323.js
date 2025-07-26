import 'react-native-url-polyfill/auto';
import React, { Suspense } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { ThemeProvider, useTheme } from '../../packages/theme/src';
import Loading from './src/components/Loading';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { WalletProvider } from './wallet/src/stores/WalletContext';
import RootNavigator from './src/navigation/RootNavigator';

function AppContent() {
  const { isLoading } = useAuth();
  const { theme } = useTheme();

  if (isLoading) return <Loading />;

  return (
    <NavigationContainer
      theme={{
        dark: theme.mode === 'dark',
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
          notification: theme.colors.primary,
        },
      }}
    >
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <WalletProvider>   {/* <-- Wrap WalletProvider here */}
          <Suspense fallback={<Loading />}>
            <AppContent />
            <Toast />
          </Suspense>
          <StatusBar style="auto" />
        </WalletProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
