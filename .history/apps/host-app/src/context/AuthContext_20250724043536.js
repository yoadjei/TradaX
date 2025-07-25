import React, { createContext, user , useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setToken } from '@tradax/utils/storage';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Load user from AsyncStorage on mount
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('user');
        const token = await AsyncStorage.getItem('token');

        if (savedUser && token) {
          setUser(JSON.parse(savedUser));
          setToken(token); // apply token globally (e.g., axios)
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Failed to load auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthState();
  }, []);

 const login = async (data) => {
  try {
    const { access_token, user } = data;

    console.log('Login response user:', user); // ✅ Add this line

    if (!access_token || !user) {
      throw new Error('Invalid login response.');
    }

    await AsyncStorage.setItem('token', access_token);
    await AsyncStorage.setItem('user', JSON.stringify(user));

    setToken(access_token);
    setUser(user);
    setIsAuthenticated(true);
  } catch (error) {
    console.error('Login failed:', error);
    throw new Error('Failed to store authentication token.');
  }
};


 const logout = async () => {
  try {
    await AsyncStorage.clear(); 
    setToken(null); 
    setUser(null);
    setIsAuthenticated(false);
  } catch (error) {
    console.error('Logout failed:', error);
  }
};


  const register = async (data) => {
    try {
      await login(data);
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        register,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

