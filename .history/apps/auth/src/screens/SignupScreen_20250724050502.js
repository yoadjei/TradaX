import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Button, Input, Typography, Card } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { authApi } from '@tradax/utils/api';

export default function SignupScreen({ navigation }) {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { firstName, lastName, email, password, confirmPassword } = formData;
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill in all fields' });
      return false;
    }
    if (password !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Passwords do not match' });
      return false;
    }
    if (password.length < 6) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Password must be at least 6 characters' });
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a valid email address' });
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const { firstName, lastName, email, password } = formData;
      await authApi.register({ firstName, lastName, email, password });
      Toast.show({ type: 'success', text1: 'Account Created', text2: 'Please verify your account' });
      navigation.navigate('OTP', { email });
    } catch (error) {
      console.error('Signup error:', error);
      Toast.show({
        type: 'error',
        text1: 'Signup Failed',
        text2: error.message || 'Failed to create account',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.formCard}>
          <Typography variant="h2" style={[styles.formTitle, { color: theme.colors.text }]}>
            Create Account
          </Typography>

          <Input
            placeholder="First Name"
            value={formData.firstName}
            onChangeText={(value) => handleInputChange('firstName', value)}
            style={styles.input}
          />
          <Input
            placeholder="Last Name"
            value={formData.lastName}
            onChangeText={(value) => handleInputChange('lastName', value)}
            style={styles.input}
          />
          <Input
            placeholder="Email"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
          <Input
            placeholder="Password"
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            secureTextEntry
            style={styles.input}
          />
          <Input
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChangeText={(value) => handleInputChange('confirmPassword', value)}
            secureTextEntry
            style={styles.input}
          />
          <Button
            title={loading ? "Creating Account..." : "Create Account"}
            onPress={handleSignup}
            disabled={loading}
            style={styles.button}
          />
          <Button
            title="Already have an account? Sign In"
            variant="outline"
            onPress={() => navigation.navigate('Login')}
            style={styles.button}
          />
        </Card>

        <View style={styles.footer}>
          <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
            By creating an account, you agree to our Terms of Service and Privacy Policy
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
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
});