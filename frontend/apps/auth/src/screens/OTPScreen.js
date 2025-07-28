// otpscreen.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Button, Input, Typography, Card } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { authApi } from '@tradax/utils/api';

export default function OTPScreen({ navigation, route }) {
  const { theme } = useTheme();
  const email = route?.params?.email ?? '';
  const [otp, setOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVerifyOTP = async () => {
    if (!otp) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter the OTP code' });
      return;
    }
    setLoading(true);
    try {
      await authApi.verifyOtp({ email, otp });
      Toast.show({
        type: 'success',
        text1: 'Account Verified',
        text2: 'Your account has been successfully verified',
      });
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: error.message || 'Invalid OTP code',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    setResendLoading(true);
    try {
      await authApi.resendOtp({ email });
      setCountdown(60);
      Toast.show({
        type: 'success',
        text1: 'OTP Sent',
        text2: 'A new OTP has been sent to your email',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Resend Failed',
        text2: error.message || 'Failed to resend OTP',
      });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Card style={styles.formCard}>
          <Typography variant="h2" style={[styles.formTitle, { color: theme.colors.text }]}>
            Verify Your Account
          </Typography>
          <Typography variant="body1" style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            We've sent a verification code to:
          </Typography>
          <Typography variant="body1" style={[styles.email, { color: theme.colors.primary }]}>
            {email}
          </Typography>
          <Input
          placeholder="Enter OTP Code"
          value={otp}
          onChangeText={setOTP}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.input}
          />
          <Button
            title={loading ? 'Verifying...' : 'Verify Account'}
            onPress={handleVerifyOTP}
            disabled={loading}
            style={styles.button}
          />
          <Button
            title={
              countdown > 0
                ? `Resend OTP (${countdown}s)`
                : resendLoading
                ? 'Sending...'
                : 'Resend OTP'
            }
            variant="outline"
            onPress={handleResendOTP}
            disabled={countdown > 0 || resendLoading}
            style={styles.button}
          />
          <Button
            title="Back to Login"
            variant="text"
            onPress={() => navigation.navigate('Login')}
            style={styles.button}
          />
        </Card>
        <View style={styles.footer}>
          <Typography variant="caption" style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
            Didn't receive the code? Check your spam folder or try resending
          </Typography>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  formCard: {
    padding: 24,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  email: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 24,
  },
  input: {
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 18,
    letterSpacing: 2,
  },
  button: {
    marginBottom: 12,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
});
