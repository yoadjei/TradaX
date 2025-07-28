import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@tradax/theme';

import TradingScreen from './screens/TradingScreen';

const Stack = createNativeStackNavigator();

export default function TradingNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="TradingMain"
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="TradingMain" 
        component={TradingScreen}
        options={{ title: 'Trading' }}
      />
    </Stack.Navigator>
  );
}
