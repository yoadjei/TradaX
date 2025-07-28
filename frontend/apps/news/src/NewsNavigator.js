import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@tradax/theme';

import NewsListScreen from './screens/NewsListScreen';

const Stack = createNativeStackNavigator();

export default function NewsNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="NewsList"
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
        name="NewsList" 
        component={NewsListScreen}
        options={{ title: 'Crypto News' }}
      />
    </Stack.Navigator>
  );
}
