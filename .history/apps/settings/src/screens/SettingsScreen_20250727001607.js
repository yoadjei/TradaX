// screens/SettingsScreen.js
import React, { useState, useEffect, useReducer } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Linking,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Typography, Card, Button, Input } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { useAuth } from '../../../host-app/src/context/AuthContext';
import { authApi } from '@tradax/utils/api';
import {
  getUserPreferences,
  setUserPreferences,
} from '@tradax/utils/storage';

const notificationsInitial = {
  priceAlerts: true,
  newsUpdates: true,
  tradingUpdates: false,
  securityAlerts: true,
};

const securityInitial = {
  twoFactorEnabled: false,
  biometricEnabled: false,
};

function notificationsReducer(state, action) {
  switch (action.type) {
    case 'SET':
      return { ...state, ...action.payload };
    case 'TOGGLE':
      return { ...state, [action.key]: !state[action.key] };
    default:
      return state;
  }
}

function securityReducer(state, action) {
  switch (action.type) {
    case 'SET':
      return { ...state, ...action.payload };
    case 'TOGGLE':
      return { ...state, [action.key]: !state[action.key] };
    default:
      return state;
  }
}

export default function SettingsScreen() {
  const { theme, toggleTheme, isDarkMode } = useTheme();
  const { user, logout, setUser } = useAuth();

  const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '' });
  const [notifications, dispatchNotifications] = useReducer(notificationsReducer, notificationsInitial);
  const [security, dispatchSecurity] = useReducer(securityReducer, securityInitial);

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
      });
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      const prefs = await getUserPreferences();
      if (prefs?.notifications) dispatchNotifications({ type: 'SET', payload: prefs.notifications });
      if (prefs?.security) dispatchSecurity({ type: 'SET', payload: prefs.security });
    })();
  }, []);

  useEffect(() => {
    (async () => {
      await setUserPreferences({ notifications, security });
    })();
  }, [notifications, security]);

  const initials = `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase();

  const handleProfileUpdate = () =>
    Alert.alert('Confirm Update', 'Update your profile?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Update',
        onPress: async () => {
          try {
            const res = await authApi.updateProfile({
              firstName: profile.firstName,
              lastName: profile.lastName,
            });

            if (res?.user) {
              setUser(res.user);
              setProfile((p) => ({
                ...p,
                firstName: res.user.firstName,
                lastName: res.user.lastName,
                email: res.user.email,
              }));
            }

            Toast.show({ type: 'success', text1: 'Profile Updated' });
          } catch (error) {
            Toast.show({ type: 'error', text1: 'Update Failed', text2: error.message });
          }
        },
      },
    ]);

  const handleLogout = () =>
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            Toast.show({ type: 'success', text1: 'Logged Out' });
          } catch {}
        },
      },
    ]);

  const openLink = (url) => Linking.openURL(url);
  const handleThemeToggle = () => {
    toggleTheme();
    Toast.show({
      type: 'success',
      text1: isDarkMode ? 'Switched to Light Mode' : 'Switched to Dark Mode',
    });
  };

  const SettingsSection = ({ title, description, children }) => (
    <View style={styles.section}>
      <Typography variant="h3" style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {title}
      </Typography>
      {description && (
        <Typography variant="caption" style={{ color: theme.colors.textSecondary, marginBottom: 8 }}>
          {description}
        </Typography>
      )}
      <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
        {children}
      </Card>
    </View>
  );

  const SettingsRow = ({ title, subtitle, rightComponent }) => (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Typography variant="body1" style={{ color: theme.colors.text }}>{title}</Typography>
        {subtitle && (
          <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>{subtitle}</Typography>
        )}
      </View>
      {rightComponent}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Typography variant="h2" style={{ color: theme.colors.text, marginBottom: 16 }}>
          Hello, {profile.firstName || 'Trader'}
        </Typography>

        <SettingsSection title="Profile" description="Your personal info">
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
              <Typography variant="h2" style={{ color: '#fff' }}>{initials || 'T'}</Typography>
            </View>
            <View style={{ marginLeft: 12 }}>
              <Typography variant="h4" style={{ color: theme.colors.text }}>
                {profile.firstName} {profile.lastName}
              </Typography>
              <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
                {profile.email}
              </Typography>
            </View>
          </View>
          <Input
            placeholder="First Name"
            value={profile.firstName}
            onChangeText={(v) => setProfile((p) => ({ ...p, firstName: v }))}
            style={styles.input}
          />
          <Input
            placeholder="Last Name"
            value={profile.lastName}
            onChangeText={(v) => setProfile((p) => ({ ...p, lastName: v }))}
            style={styles.input}
          />
          <Button title="Update Profile" onPress={handleProfileUpdate} style={styles.updateBtn} />
        </SettingsSection>

        <SettingsSection title="Appearance">
          <SettingsRow
            title="Dark Mode"
            subtitle="Toggle theme"
            rightComponent={
              <Switch
                value={isDarkMode}
                onValueChange={handleThemeToggle}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={isDarkMode ? '#fff' : '#f4f3f4'}
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Notifications">
          {['priceAlerts', 'newsUpdates', 'tradingUpdates', 'securityAlerts'].map((key) => (
            <SettingsRow
              key={key}
              title={key === 'priceAlerts' ? 'Price Alerts' :
                     key === 'newsUpdates' ? 'News Updates' :
                     key === 'tradingUpdates' ? 'Trading Updates' : 'Security Alerts'}
              subtitle={{
                priceAlerts: 'Significant price changes',
                newsUpdates: 'Crypto news',
                tradingUpdates: 'Your trades',
                securityAlerts: 'Security notifications',
              }[key]}
              rightComponent={
                <Switch
                  value={notifications[key]}
                  onValueChange={() => dispatchNotifications({ type: 'TOGGLE', key })}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={notifications[key] ? '#fff' : '#f4f3f4'}
                />
              }
            />
          ))}
        </SettingsSection>

        <SettingsSection title="Security">
          <SettingsRow
            title="Two‑Factor Auth"
            subtitle="Coming Soon"
            rightComponent={
              <Switch value={security.twoFactorEnabled} disabled trackColor={{ false: theme.colors.border, true: theme.colors.primary }} thumbColor='#f4f3f4' />
            }
          />
          <SettingsRow
            title="Biometric Login"
            subtitle="Coming Soon"
            rightComponent={
              <Switch value={security.biometricEnabled} disabled trackColor={{ false: theme.colors.border, true: theme.colors.primary }} thumbColor='#f4f3f4' />
            }
          />
        </SettingsSection>

        <SettingsSection title="About">
          <SettingsRow title="Version" rightComponent={<Typography variant="body2" style={{ color: theme.colors.textSecondary }}>1.0.0</Typography>} />
          <SettingsRow title="Privacy Policy" rightComponent={<Pressable onPress={() => openLink('https://your-privacy-policy-url.com')}><Typography variant="body2" style={{ color: theme.colors.primary }}>View →</Typography></Pressable>} />
          <SettingsRow title="Terms of Service" rightComponent={<Pressable onPress={() => openLink('https://your-terms-url.com')}><Typography variant="body2" style={{ color: theme.colors.primary }}>View →</Typography></Pressable>} />
        </SettingsSection>

        <View style={styles.logoutWrap}>
          <Button title="Logout" variant="outline" onPress={handleLogout} style={[styles.logoutBtn, { borderColor: theme.colors.error }]} textStyle={{ color: theme.colors.error }} />
        </View>

        <Typography variant="caption" style={{ color: theme.colors.textSecondary, marginTop: 40, textAlign: 'center' }}>
          TradaX © 2025
        </Typography>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { marginBottom: 24 },
  sectionTitle: { marginBottom: 8 },
  sectionCard: { padding: 16 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  input: { marginBottom: 12 },
  updateBtn: { marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ccc' },
  rowText: { flex: 1, marginRight: 8 },
  logoutWrap: { alignItems: 'center', marginTop: 16 },
  logoutBtn: { borderWidth: 2, width: '50%' },
});
