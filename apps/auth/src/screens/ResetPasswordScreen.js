import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Button, Input, Typography, Card } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { authApi } from '@tradax/utils';

export default function ResetPasswordScreen({ route, navigation }) {
  const { theme } = useTheme();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const token = route?.params?.token;

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please fill in both password fields',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Password Mismatch',
        text2: 'Passwords do not match',
      });
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ token, password: newPassword });

      Toast.show({
        type: 'success',
        text1: 'Password Updated',
        text2: 'You can now sign in with your new password',
      });

      navigation.navigate('Login');
    } catch (error) {
      console.error('Reset password error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Could not reset password',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Typography variant="h2" style={[styles.title, { color: theme.colors.text }]}>
            Reset Password
          </Typography>
          <Typography variant="body1" style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Enter and confirm your new password.
          </Typography>

          <Input
            placeholder="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            style={styles.input}
          />

          <Input
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            style={styles.input}
          />

          <Button
            title={loading ? 'Resetting...' : 'Reset Password'}
            onPress={handleResetPassword}
            disabled={loading}
            style={styles.button}
          />

          <Button
            title="Back to Login"
            variant="outline"
            onPress={() => navigation.navigate('Login')}
            style={styles.button}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginBottom: 12,
  },
});
