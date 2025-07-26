// authcontext.js
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  setToken,
  getToken,
  clearAuthData,
} from '@tradax/utils/storage';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

/**
 * sessionId:
 *  - Changes on every successful login and on every logout.
 *  - Consumers (e.g., WalletScreen) can watch it to hard-reset/refetch their own state.
 */
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState(0); // bump this to force consumers to refresh

  const bumpSession = useCallback(() => {
    setSessionId(Date.now()); // unique enough and sortable
  }, []);

  // Rehydrate auth state on app start
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const token = await getToken();
        if (token) {
          setIsAuthenticated(true);
          // we don't have user details persisted here; screens can fetch /me
          bumpSession();
        }
      } catch (error) {
        console.error('Failed to load auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadAuthState();
  }, [bumpSession]);

  const login = useCallback(async (data) => {
    try {
      const { token, user: userInfo } = data || {};
      if (!token || !userInfo) throw new Error('Invalid login response');
      await setToken(token);
      setUser(userInfo);
      setIsAuthenticated(true);
      bumpSession(); // <- force every consumer (wallet, markets, etc.) to reload fresh
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Failed to store authentication token');
    }
  }, [bumpSession]);

  const logout = useCallback(async () => {
    try {
      await clearAuthData(); // ensure any persisted auth is gone
      setUser(null);
      setIsAuthenticated(false);
      bumpSession(); // <- new anonymous session; consumers should clear themselves
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [bumpSession]);

  const register = useCallback(async (data) => {
    try {
      await login(data);
    } catch (error) {
      console.error('Registration failed:', error);
    }
  }, [login]);

  // Expose memoized value to avoid unnecessary re-renders
  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      sessionId,     // <- listen to this to clear/refetch wallet
      login,
      logout,
      register,
      setUser,
    }),
    [user, isAuthenticated, isLoading, sessionId, login, logout, register]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
