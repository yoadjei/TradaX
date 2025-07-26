import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { Button, Input, Typography, Card } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { authApi } from '@tradax/utils/api';
import { useAuth } from '../../../host-app/src/context/AuthContext';
import logo from '../../../host-app/assets/logo.png';

export default function LoginScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { login: contextLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill in all fields',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login({ email, password });

      if (!res?.token) {
        throw new Error('Login succeeded but no token was returned.');
      }

      const userInfo = {
        email: res.email,
        firstName: res.firstName,
        lastName: res.lastName,
        initials: res.initials,
      };

      await contextLogin({
        token: res.token,
        user: userInfo,
      });

      Toast.show({
        type: 'success',
        text1: 'Login Successful',
        text2: 'Welcome back to TradaX!',
      });

    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: error?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateToSignup = () => navigation.navigate('Signup');
  const navigateToForgotPassword = () => navigation.navigate('ForgotPassword');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Typography variant="h1" style={[styles.title, { color: theme.colors.text }]}>
            TradaX
          </Typography>
          <Typography variant="body1" style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Your Gateway to Cryptocurrency Trading
          </Typography>
        </View>

        <Card style={styles.formCard}>
          <Typography variant="h2" style={[styles.formTitle, { color: theme.colors.text }]}>
            Sign In
          </Typography>

          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />

          <Button
            title={loading ? 'Signing In...' : 'Sign In'}
            onPress={handleLogin}
            disabled={loading}
            style={styles.button}
          />

          <TouchableOpacity onPress={navigateToForgotPassword} style={styles.forgotPassword}>
            <Typography variant="caption" style={{ color: theme.colors.primary }}>
              Forgot Password?
            </Typography>
          </TouchableOpacity>

          <Button
            title="Create New Account"
            variant="outline"
            onPress={navigateToSignup}
            style={styles.button}
          />
        </Card>

        <View style={styles.footer}>
          <Typography variant="caption" style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </Typography>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  formCard: {
    padding: 24,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginBottom: 12,
  },
  forgotPassword: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
});
