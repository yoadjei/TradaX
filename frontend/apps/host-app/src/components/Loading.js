import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Typography } from '@tradax/ui';
import { useTheme } from '@tradax/theme';

export default function Loading({ message = 'Loading...' }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Typography variant="body1" style={[styles.message, { color: theme.colors.text }]}>
        {message}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: 16,
  },
});
