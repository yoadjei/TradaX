import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@tradax/theme';

import LoginScreen from '@tradax/auth/screens/LoginScreen';
import SignupScreen from '@tradax/auth/screens/SignupScreen';
import OTPScreen from '@tradax/auth/screens/OTPScreen';


const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Welcome to TradaX' }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{ title: 'Create Account' }}
      />
      <Stack.Screen
        name="OTP"
        component={OTPScreen}
        options={{ title: 'Verify Account' }}
      />
    </Stack.Navigator>
  );
}
