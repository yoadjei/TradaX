import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  setToken,
  getToken,
  removeToken,
  clearAuthData,
} from '@tradax/utils/storage';
import { CommonActions, useNavigation } from '@react-navigation/native';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const navigation = useNavigation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const token = await getToken();
        if (token) setIsAuthenticated(true);
      } catch (e) {
        console.error('Failed to load auth state:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadAuthState();
  }, []);

  const login = async (data) => {
    const { token, user: userInfo } = data;
    if (!token || !userInfo) throw new Error('Invalid login response');
    await setToken(token);
    setUser(userInfo);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
      // Reset navigation stack to Login
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })
      );
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, isLoading, login, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};
