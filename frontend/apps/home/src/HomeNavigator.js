import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@tradax/theme';

import MarketOverviewScreen from './screens/MarketOverviewScreen';

const Stack = createNativeStackNavigator();

export default function HomeNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="MarketOverview"
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
        name="MarketOverview" 
        component={MarketOverviewScreen}
        options={{ title: 'Market Overview' }}
      />
    </Stack.Navigator>
  );
}
