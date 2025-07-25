import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Button, Input, Typography, Card } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { authApi } from '@tradax/utils/api';

export default function ForgotPasswordScreen({ navigation }) {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Missing Email',
        text2: 'Please enter your email address.',
      });
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(email);

      Toast.show({
        type: 'success',
        text1: 'OTP Sent',
        text2: 'Check your email for the password reset code.',
      });

      navigation.navigate('ResetPassword', { email });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.message || 'Something went wrong',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Typography variant="h2" style={[styles.title, { color: theme.colors.text }]}>
            Forgot Password
          </Typography>
          <Typography variant="body1" style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Enter your registered email to receive a password reset code.
          </Typography>

          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <Button
            title={loading ? 'Sending...' : 'Send Code'}
            onPress={handleReset}
            disabled={loading}
            style={styles.button}
          />

          <Button
            title="Back to Login"
            variant="outline"
            onPress={() => navigation.goBack()}
            style={styles.button}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: { padding: 24 },
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
  input: { marginBottom: 16 },
  button: { marginBottom: 12 },
});
