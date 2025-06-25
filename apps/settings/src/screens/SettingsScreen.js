import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Typography, Card, Button, Input } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { authApi, removeToken } from '@tradax/utils';

export default function SettingsScreen({ navigation }) {
  const { theme, toggleTheme, isDarkMode } = useTheme();
  const [profile, setProfile] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
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

  const handleProfileUpdate = async () => {
    try {
      await authApi.updateProfile(profile);
      Toast.show({
        type: 'success',
        text1: 'Profile Updated',
        text2: 'Your profile has been successfully updated',
      });
    } catch (error) {
      console.error('Profile update error:', error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error.message || 'Failed to update profile',
      });
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeToken();
              Toast.show({
                type: 'success',
                text1: 'Logged Out',
                text2: 'You have been successfully logged out',
              });
              // Navigation will be handled by AppNavigator auth state change
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const toggleNotification = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleSecurity = (key) => {
    setSecurity(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const SettingsSection = ({ title, children }) => (
    <View style={styles.section}>
      <Typography variant="h3" style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {title}
      </Typography>
      <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
        {children}
      </Card>
    </View>
  );

  const SettingsRow = ({ title, subtitle, rightComponent, onPress }) => (
    <View style={[styles.settingsRow, onPress && styles.pressableRow]}>
      <View style={styles.settingsRowContent}>
        <Typography variant="body1" style={{ color: theme.colors.text }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
            {subtitle}
          </Typography>
        )}
      </View>
      {rightComponent}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <SettingsSection title="Profile">
          <Input
            placeholder="First Name"
            value={profile.firstName}
            onChangeText={(value) => setProfile(prev => ({ ...prev, firstName: value }))}
            style={styles.input}
          />
          <Input
            placeholder="Last Name"
            value={profile.lastName}
            onChangeText={(value) => setProfile(prev => ({ ...prev, lastName: value }))}
            style={styles.input}
          />
          <Input
            placeholder="Email"
            value={profile.email}
            onChangeText={(value) => setProfile(prev => ({ ...prev, email: value }))}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
          <Button
            title="Update Profile"
            onPress={handleProfileUpdate}
            style={styles.updateButton}
          />
        </SettingsSection>

        {/* Appearance Section */}
        <SettingsSection title="Appearance">
          <SettingsRow
            title="Dark Mode"
            subtitle="Switch between light and dark themes"
            rightComponent={
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={isDarkMode ? '#ffffff' : '#f4f3f4'}
              />
            }
          />
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection title="Notifications">
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

        {/* Security Section */}
        <SettingsSection title="Security">
          <SettingsRow
            title="Two-Factor Authentication"
            subtitle="Add an extra layer of security (Coming Soon)"
            rightComponent={
              <Switch
                value={security.twoFactorEnabled}
                onValueChange={() => toggleSecurity('twoFactorEnabled')}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={security.twoFactorEnabled ? '#ffffff' : '#f4f3f4'}
                disabled={true}
              />
            }
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
                disabled={true}
              />
            }
          />
        </SettingsSection>

        {/* About Section */}
        <SettingsSection title="About">
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
              <Typography variant="body2" style={{ color: theme.colors.primary }}>
                View →
              </Typography>
            }
          />
          <SettingsRow
            title="Terms of Service"
            rightComponent={
              <Typography variant="body2" style={{ color: theme.colors.primary }}>
                View →
              </Typography>
            }
          />
        </SettingsSection>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <Button
            title="Logout"
            variant="outline"
            onPress={handleLogout}
            style={[styles.logoutButton, { borderColor: theme.colors.error }]}
            textStyle={{ color: theme.colors.error }}
          />
        </View>

        {/* Footer */}
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
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  sectionCard: {
    marginHorizontal: 20,
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  updateButton: {
    marginTop: 8,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  pressableRow: {
    // Add press styles if needed
  },
  settingsRowContent: {
    flex: 1,
    marginRight: 16,
  },
  logoutSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  logoutButton: {
    borderWidth: 2,
  },
  footer: {
    marginHorizontal: 20,
    marginBottom: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
});
