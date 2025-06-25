import React, { Suspense, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';

import { ThemeProvider } from '@tradax/theme';
import Loading from './src/components/Loading';
import AppNavigator from './src/navigation/AppNavigator';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        // Simulate loading time for demonstration
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  return (
    <ThemeProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Suspense fallback={<Loading />}>
          <AppNavigator />
        </Suspense>
        <Toast />
      </NavigationContainer>
    </ThemeProvider>
  );
}
