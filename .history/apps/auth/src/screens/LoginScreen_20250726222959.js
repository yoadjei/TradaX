// LoginScreen.js
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
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
        text2: 'Please complete all fields',
      });
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      if (!res?.token) throw new Error('No token received');
      await contextLogin({
        token: res.token,
        user: { email: res.email, firstName: res.firstName, lastName: res.lastName },
      });
      Toast.show({
        type: 'success',
        text1: 'Signed In',
        text2: 'Welcome back!',
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Sign In Failed',
        text2: err?.message || 'Try again later',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Typography variant="h1" style={[styles.title, { color: theme.colors.text }]}>
          Welcome to OKX‑Style
        </Typography>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Typography variant="h2" style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Sign In
          </Typography>
          <Input
            placeholder="Email or phone"
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
            title={loading ? 'Signing In...' : 'Continue'}
            onPress={handleLogin}
            disabled={loading}
            style={styles.primaryBtn}
          />
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.link}>
            <Typography variant="caption" style={{ color: theme.colors.primary }}>
              Forgot Password?
            </Typography>
          </TouchableOpacity>
          <Button
            title="Create Account"
            variant="outline"
            onPress={() => navigation.navigate('Signup')}
            style={styles.secondaryBtn}
          />
        </Card>

        <View style={styles.socialRow}>
          <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
            Or continue with
          </Typography>
          <View style={styles.socialButtons}>
            <Button title="Google" onPress={() => Linking.openURL('https://accounts.google.com')} style={styles.socialBtn} />
            <Button title="Apple" onPress={() => Linking.openURL('https://appleid.apple.com')} style={styles.socialBtn} />
          </View>
        </View>

        <Typography variant="caption" style={[styles.footerText, { color: theme.colors.textSecondary }]}>
          By continuing, you agree to OKX Terms of Service & Privacy Policy
        </Typography>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  logo: { alignSelf: 'center', width: 100, height: 100, marginBottom: 16 },
  title: { fontSize: 28, marginBottom: 24, textAlign: 'center' },
  card: { padding: 24, borderRadius: 16 },
  sectionTitle: { fontSize: 22, marginBottom: 24, textAlign: 'center' },
  input: { marginBottom: 16 },
  primaryBtn: { marginBottom: 12 },
  secondaryBtn: { marginBottom: 16 },
  link: { alignItems: 'center', marginBottom: 16 },
  socialRow: { alignItems: 'center', marginVertical: 16 },
  socialButtons: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 8 },
  socialBtn: { flex: 1, marginHorizontal: 8 },
  footerText: { marginTop: 20, textAlign: 'center' },
});
