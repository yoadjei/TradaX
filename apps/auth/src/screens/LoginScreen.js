import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Button, Input, Typography, Card } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { authApi, setToken } from '@tradax/utils';

export default function LoginScreen({ navigation }) {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill in all fields',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.login({ email, password });
      
      if (response.token) {
        await setToken(response.token);
        Toast.show({
          type: 'success',
          text1: 'Login Successful',
          text2: 'Welcome back to TradaX!',
        });
        // Navigation will be handled by AppNavigator auth state change
      }
    } catch (error) {
      console.error('Login error:', error);
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: error.message || 'Invalid credentials',
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateToSignup = () => {
    navigation.navigate('Signup');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
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
            title={loading ? "Signing In..." : "Sign In"}
            onPress={handleLogin}
            disabled={loading}
            style={styles.button}
          />

          <Button
            title="Create New Account"
            variant="outline"
            onPress={navigateToSignup}
            style={styles.button}
          />

          <View style={styles.biometricPlaceholder}>
            <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
              Biometric authentication coming soon
            </Typography>
          </View>
        </Card>

        <View style={styles.footer}>
          <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </Typography>
        </View>
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
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
  biometricPlaceholder: {
    alignItems: 'center',
    marginTop: 20,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ccc',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
});
