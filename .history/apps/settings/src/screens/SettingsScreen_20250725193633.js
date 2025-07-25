import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Switch, Alert, Linking } from 'react-native';
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

export default function SettingsScreen() {
  const { theme, toggleTheme, isDarkMode } = useTheme();
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  const [notifications, setNotifications] = useState({
    priceAlerts: true,
    newsUpdates: true,
    tradingUpdates: false,
    securityAlerts: true,
  });

  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    biometricEnabled: false,
  });

  const initials = `${(profile.firstName || '').charAt(0)}${(profile.lastName || '').charAt(0)}`.toUpperCase();

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
      if (prefs?.notifications) setNotifications(prefs.notifications);
      if (prefs?.security) setSecurity(prefs.security);
    })();
  }, []);

  const persistPreferences = useCallback(async (nextNotifications, nextSecurity) => {
    await setUserPreferences({
      notifications: nextNotifications ?? notifications,
      security: nextSecurity ?? security,
    });
  }, [notifications, security]);

  const handleProfileUpdate = () => {
    Alert.alert('Confirm Update', 'Are you sure you want to update your profile?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Update',
        onPress: async () => {
          try {
            await authApi.updateProfile({
              firstName: profile.firstName,
              lastName: profile.lastName,
            });
            Toast.show({
              type: 'success',
              text1: 'Profile Updated',
              text2: 'Your profile has been successfully updated',
            });
          } catch (error) {
            Toast.show({
              type: 'error',
              text1: 'Update Failed',
              text2: error.message || 'Failed to update profile',
            });
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            Toast.show({
              type: 'success',
              text1: 'Logged Out',
              text2: 'You have been successfully logged out',
            });
          } catch (error) {}
        },
      },
    ]);
  };

  const toggleNotification = async (key) => {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    await persistPreferences(next, null);
  };

  const toggleSecurity = async (key) => {
    const next = { ...security, [key]: !security[key] };
    setSecurity(next);
    await persistPreferences(null, next);
  };

  const handleThemeToggle = () => {
    toggleTheme();
    Toast.show({
      type: 'success',
      text1: isDarkMode ? 'Switched to Light Mode' : 'Switched to Dark Mode',
    });
  };

  const openLink = (url) => Linking.openURL(url);

  const SettingsSection = ({ title, description, children }) => (
    <View style={styles.section}>
      <Typography variant="h3" style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 6 }]}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="caption" style={{ color: theme.colors.textSecondary, marginBottom: 12 }}>
          {description}
        </Typography>
      ) : null}
      <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface, paddingVertical: 16 }]}>
        {children}
      </Card>
      <View style={{ height: 1, backgroundColor: theme.colors.border, marginTop: 24 }} />
    </View>
  );

  const SettingsRow = ({ title, subtitle, rightComponent, disabled = false }) => (
    <View style={[styles.settingsRow, disabled && { opacity: 0.5 }]}>
      <View style={styles.settingsRowContent}>
        <Typography variant="body1" style={{ color: theme.colors.text }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
            {subtitle}
          </Typography>
        ) : null}
      </View>
      {rightComponent}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
        <Typography variant="h2" style={{ color: theme.colors.text, marginBottom: 16 }}>
          Hello, {profile.firstName || 'Trader'}
        </Typography>

        <SettingsSection title="Profile" description="Customize your personal information">
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: theme.colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <Typography variant="h2" style={{ color: '#fff' }}>
                {initials}
              </Typography>
            </View>
            <Typography variant="h4" style={{ color: theme.colors.text }}>
              {profile.firstName} {profile.lastName}
            </Typography>
            <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
              {profile.email}
            </Typography>
          </View>

          <Input
            placeholder="First Name"
            value={profile.firstName}
            onChangeText={(value) => setProfile((p) => ({ ...p, firstName: value }))}
            style={styles.input}
          />
          <Input
            placeholder="Last Name"
            value={profile.lastName}
            onChangeText={(value) => setProfile((p) => ({ ...p, lastName: value }))}
            style={styles.input}
          />
          <Input
            placeholder="Email"
            value={profile.email}
            editable={false}
            style={styles.input}
          />
          <Button title="Update Profile" onPress={handleProfileUpdate} style={styles.updateButton} />
        </SettingsSection>

        <SettingsSection title="Appearance" description="Switch between light and dark themes">
          <SettingsRow
            title="Dark Mode"
            subtitle="Switch between light and dark themes"
            rightComponent={
              <Switch
                value={isDarkMode}
                onValueChange={handleThemeToggle}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={isDarkMode ? '#ffffff' : '#f4f3f4'}
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Notifications" description="Manage your notification preferences">
          <SettingsRow
            title="Price Alerts"
            subtitle="Get notified about significant price changes"
            rightComponent={
              <Switch
                value={notifications.priceAlerts}
                onValueChange={() => toggleNotification('priceAlerts')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={notifications.priceAlerts ? '#ffffff' : '#f4f3f4'}
              />
            }
          />
          <SettingsRow
            title="News Updates"
            subtitle="Receive cryptocurrency news notifications"
            rightComponent={
              <Switch
                value={notifications.newsUpdates}
                onValueChange={() => toggleNotification('newsUpdates')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={notifications.newsUpdates ? '#ffffff' : '#f4f3f4'}
              />
            }
          />
          <SettingsRow
            title="Trading Updates"
            subtitle="Get notified about trading activities"
            rightComponent={
              <Switch
                value={notifications.tradingUpdates}
                onValueChange={() => toggleNotification('tradingUpdates')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={notifications.tradingUpdates ? '#ffffff' : '#f4f3f4'}
              />
            }
          />
          <SettingsRow
            title="Security Alerts"
            subtitle="Important security notifications"
            rightComponent={
              <Switch
                value={notifications.securityAlerts}
                onValueChange={() => toggleNotification('securityAlerts')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={notifications.securityAlerts ? '#ffffff' : '#f4f3f4'}
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Security" description="Manage your security settings">
          <SettingsRow
            title="Two-Factor Authentication"
            subtitle="Add an extra layer of security (Coming Soon)"
            rightComponent={
              <Switch
                value={security.twoFactorEnabled}
                onValueChange={() => toggleSecurity('twoFactorEnabled')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={security.twoFactorEnabled ? '#ffffff' : '#f4f3f4'}
                disabled
              />
            }
            disabled
          />
          <SettingsRow
            title="Biometric Authentication"
            subtitle="Use fingerprint or face recognition (Coming Soon)"
            rightComponent={
              <Switch
                value={security.biometricEnabled}
                onValueChange={() => toggleSecurity('biometricEnabled')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={security.biometricEnabled ? '#ffffff' : '#f4f3f4'}
                disabled
              />
            }
            disabled
          />
        </SettingsSection>

        <SettingsSection title="About" description="App details and policies">
          <SettingsRow
            title="Version"
            rightComponent={
              <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
                1.0.0
              </Typography>
            }
          />
          <SettingsRow
          title="Privacy Policy"
          rightComponent={
            <Typography
              variant="body2"
              style={{ color: theme.colors.primary }}
              onPress={() => openLink('https://your-privacy-policy-url.com')}
            >
              View →
            </Typography>
          }
          />
          <SettingsRow
            title="Terms of Service"
            rightComponent={
              <Typography
                variant="body2"
                style={{ color: theme.colors.primary }}
                onPress={() => openLink('https://your-terms-url.com')}
              >
                View →
              </Typography>
            }
          />
        </SettingsSection>

        <View style={styles.logoutSection}>
          <Button
            title="Logout"
            variant="outline"
            onPress={handleLogout}
            style={[styles.logoutButton, { borderColor: theme.colors.error }]}
            textStyle={{ color: theme.colors.error }}
          />
        </View>

        <View style={styles.footer}>
          <Typography variant="caption" style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
            TradaX © 2025 - Cryptocurrency Trading Platform
          </Typography>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { marginBottom: 24 },
  sectionTitle: { marginHorizontal: 20, marginBottom: 12 },
  sectionCard: { marginHorizontal: 20, padding: 16 },
  input: { marginBottom: 16 },
  updateButton: { marginTop: 8 },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  settingsRowContent: { flex: 1, marginRight: 16 },
  logoutSection: { marginHorizontal: 20, marginBottom: 24 },
  logoutButton: { borderWidth: 2 },
  footer: {
    marginHorizontal: 20,
    marginBottom: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
});
