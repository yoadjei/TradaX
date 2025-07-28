import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, typography, borderRadius, shadows, animations, components } from './tokens';

const ThemeContext = createContext();

const THEME_KEY = '@tradax/theme';

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);
      if (savedTheme !== null) {
        setIsDarkMode(JSON.parse(savedTheme));
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveThemePreference = async (isDark) => {
    try {
      await AsyncStorage.setItem(THEME_KEY, JSON.stringify(isDark));
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    saveThemePreference(newTheme);
  };

  const theme = {
    colors: isDarkMode ? colors.dark : colors.light,
    spacing,
    typography,
    borderRadius,
    shadows,
    animations,
    components,
    isDarkMode,
  };

  const value = {
    theme,
    isDarkMode,
    toggleTheme,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}

// HOC for class components
export function withTheme(Component) {
  return function ThemedComponent(props) {
    const theme = useTheme();
    return <Component {...props} theme={theme} />;
  };
}

// Utility functions for theme-based styles
export const createThemedStyles = (styleFunction) => {
  return (theme) => styleFunction(theme);
};

// Helper for responsive values
export const getResponsiveValue = (values, screenWidth) => {
  const { mobile, tablet, desktop, wide } = breakpoints;
  
  if (screenWidth >= wide && values.wide !== undefined) {
    return values.wide;
  }
  if (screenWidth >= desktop && values.desktop !== undefined) {
    return values.desktop;
  }
  if (screenWidth >= tablet && values.tablet !== undefined) {
    return values.tablet;
  }
  return values.mobile || values.default;
};
