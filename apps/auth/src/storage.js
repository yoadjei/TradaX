import * as SecureStore from 'expo-secure-store';

// Keys for secure storage
const TOKEN_KEY = '@tradax/auth_token';
const REFRESH_TOKEN_KEY = '@tradax/refresh_token';
const USER_PREFERENCES_KEY = '@tradax/user_preferences';

/**
 * Store authentication token securely
 * @param {string} token - JWT token
 * @returns {Promise<void>}
 */
export const setToken = async (token) => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error storing token:', error);
    throw new Error('Failed to store authentication token');
  }
};

/**
 * Retrieve authentication token
 * @returns {Promise<string|null>}
 */
export const getToken = async () => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error retrieving token:', error);
    return null;
  }
};

/**
 * Remove authentication token
 * @returns {Promise<void>}
 */
export const removeToken = async () => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error removing token:', error);
    throw new Error('Failed to remove authentication token');
  }
};

/**
 * Store refresh token securely
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<void>}
 */
export const setRefreshToken = async (refreshToken) => {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.error('Error storing refresh token:', error);
    throw new Error('Failed to store refresh token');
  }
};

/**
 * Retrieve refresh token
 * @returns {Promise<string|null>}
 */
export const getRefreshToken = async () => {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error retrieving refresh token:', error);
    return null;
  }
};

/**
 * Remove refresh token
 * @returns {Promise<void>}
 */
export const removeRefreshToken = async () => {
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error removing refresh token:', error);
    throw new Error('Failed to remove refresh token');
  }
};

/**
 * Clear all authentication data
 * @returns {Promise<void>}
 */
export const clearAuthData = async () => {
  try {
    await Promise.all([
      removeToken(),
      removeRefreshToken(),
    ]);
  } catch (error) {
    console.error('Error clearing auth data:', error);
    throw new Error('Failed to clear authentication data');
  }
};

/**
 * Store user preferences
 * @param {Object} preferences - User preferences object
 * @returns {Promise<void>}
 */
export const setUserPreferences = async (preferences) => {
  try {
    const preferencesString = JSON.stringify(preferences);
    await SecureStore.setItemAsync(USER_PREFERENCES_KEY, preferencesString);
  } catch (error) {
    console.error('Error storing user preferences:', error);
    throw new Error('Failed to store user preferences');
  }
};

/**
 * Retrieve user preferences
 * @returns {Promise<Object|null>}
 */
export const getUserPreferences = async () => {
  try {
    const preferencesString = await SecureStore.getItemAsync(USER_PREFERENCES_KEY);
    return preferencesString ? JSON.parse(preferencesString) : null;
  } catch (error) {
    console.error('Error retrieving user preferences:', error);
    return null;
  }
};

/**
 * Remove user preferences
 * @returns {Promise<void>}
 */
export const removeUserPreferences = async () => {
  try {
    await SecureStore.deleteItemAsync(USER_PREFERENCES_KEY);
  } catch (error) {
    console.error('Error removing user preferences:', error);
    throw new Error('Failed to remove user preferences');
  }
};

/**
 * Check if token exists and is valid format
 * @returns {Promise<boolean>}
 */
export const isTokenValid = async () => {
  try {
    const token = await getToken();
    if (!token) return false;
    
    // Basic JWT format validation (3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Check if token is expired (basic check)
    try {
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch {
      // If we can't decode the payload, assume token is invalid
      return false;
    }
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

/**
 * Get token expiration time
 * @returns {Promise<number|null>} Expiration timestamp or null
 */
export const getTokenExpiration = async () => {
  try {
    const token = await getToken();
    if (!token) return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp;
  } catch (error) {
    console.error('Error getting token expiration:', error);
    return null;
  }
};

/**
 * Check if token will expire soon (within next 5 minutes)
 * @returns {Promise<boolean>}
 */
export const isTokenExpiringSoon = async () => {
  try {
    const expiration = await getTokenExpiration();
    if (!expiration) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    const fiveMinutes = 5 * 60; // 5 minutes in seconds
    
    return (expiration - currentTime) <= fiveMinutes;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};
