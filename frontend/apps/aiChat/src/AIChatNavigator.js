import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@tradax/theme';

import ChatScreen from './screens/ChatScreen';

const Stack = createNativeStackNavigator();

export default function AIChatNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="Chat"
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
        name="Chat" 
        component={ChatScreen}
        options={{ title: 'AI Assistant' }}
      />
    </Stack.Navigator>
  );
}
