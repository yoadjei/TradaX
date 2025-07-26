// SignupScreen.js
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { Button, Input, Typography, Card } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { authApi } from '@tradax/utils/api';

export default function SignupScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (f, v) => setFormData(p => ({ ...p, [f]: v }));

  const validateForm = () => {
    const { firstName, lastName, email, password, confirmPassword } = formData;
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Fill all fields' });
      return false;
    }
    if (password !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Passwords must match' });
      return false;
    }
    if (password.length < 6) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Password ≥ 6 characters' });
      return false;
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(formData.email)) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Valid email required' });
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
      Toast.show({
        type: 'success',
        text1: 'Account Created',
        text2: 'Check your email for verification code',
      });
      navigation.reset({
        index: 0,
        routes: [{ name: 'OTP', params: { email } }],
      });
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Signup Failed',
        text2: e?.message || 'Try again later',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Typography variant="h2" style={[styles.heading, { color: theme.colors.text }]}>
            Create Account
          </Typography>

          <Input placeholder="First Name" value={formData.firstName}
            onChangeText={v => handleInputChange('firstName', v)} style={styles.input} />
          <Input placeholder="Last Name" value={formData.lastName}
            onChangeText={v => handleInputChange('lastName', v)} style={styles.input} />
          <Input placeholder="Email" value={formData.email}
            onChangeText={v => handleInputChange('email', v)}
            keyboardType="email-address" autoCapitalize="none" style={styles.input} />
          <Input placeholder="Password" value={formData.password}
            onChangeText={v => handleInputChange('password', v)}
            secureTextEntry style={styles.input} />
          <Input placeholder="Confirm Password" value={formData.confirmPassword}
            onChangeText={v => handleInputChange('confirmPassword', v)}
            secureTextEntry style={styles.input} />

          <Button
            title={loading ? 'Creating...' : 'Create Account'}
            onPress={handleSignup}
            disabled={loading}
            style={styles.primaryBtn}
          />

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Typography variant="caption" style={{ color: theme.colors.primary, textAlign: 'center', marginVertical: 8 }}>
              Already have an account? Sign In
            </Typography>
          </TouchableOpacity>

          <Typography variant="caption" style={[styles.terms, { color: theme.colors.textSecondary }]}>
            By creating an account, you agree to{" "}
            <Typography variant="caption" style={{ color: theme.colors.primary }} onPress={() => Linking.openURL('https://your-terms-url')}>
              Terms
            </Typography>{" "}
            &{" "}
            <Typography variant="caption" style={{ color: theme.colors.primary }} onPress={() => Linking.openURL('https://your-privacy-policy-url')}>
              Privacy Policy
            </Typography>
          </Typography>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { padding: 24, borderRadius: 16 },
  heading: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  input: { marginBottom: 16 },
  primaryBtn: { marginBottom: 12 },
  terms: { textAlign: 'center', marginTop: 20 },
});
