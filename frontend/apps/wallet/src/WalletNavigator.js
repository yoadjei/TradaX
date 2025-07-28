import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@tradax/theme';

import WalletScreen from './screens/WalletScreen';

const Stack = createNativeStackNavigator();

export default function WalletNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="WalletMain"
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
        name="WalletMain" 
        component={WalletScreen}
        options={{ title: 'My Wallet' }}
      />
    </Stack.Navigator>
  );
}
