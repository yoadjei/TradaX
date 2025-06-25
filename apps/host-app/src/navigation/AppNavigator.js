import React, { lazy, useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@tradax/theme';
import { getToken } from '@tradax/utils';
import Loading from '../components/Loading';

// Lazy load feature modules
const AuthNavigator = lazy(() => import('@tradax/auth/AuthNavigator'));
const HomeNavigator = lazy(() => import('@tradax/home/HomeNavigator'));
const WalletNavigator = lazy(() => import('@tradax/wallet/WalletNavigator'));
const TradingNavigator = lazy(() => import('@tradax/trading/TradingNavigator'));
const NewsNavigator = lazy(() => import('@tradax/news/NewsNavigator'));
const AIChatNavigator = lazy(() => import('@tradax/ai-chat/AIChatNavigator'));
const SettingsNavigator = lazy(() => import('@tradax/settings/SettingsNavigator'));

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Wallet':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'Trading':
              iconName = focused ? 'trending-up' : 'trending-up-outline';
              break;
            case 'News':
              iconName = focused ? 'newspaper' : 'newspaper-outline';
              break;
            case 'AI Chat':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
        },
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Wallet" component={WalletNavigator} />
      <Tab.Screen name="Trading" component={TradingNavigator} />
      <Tab.Screen name="News" component={NewsNavigator} />
      <Tab.Screen name="AI Chat" component={AIChatNavigator} />
      <Tab.Screen name="Settings" component={SettingsNavigator} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await getToken();
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Stack.Navigator
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
      {isAuthenticated ? (
        <Stack.Screen 
          name="Main" 
          component={MainTabNavigator} 
          options={{ headerShown: false }}
        />
      ) : (
        <Stack.Screen 
          name="Auth" 
          component={AuthNavigator} 
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}
