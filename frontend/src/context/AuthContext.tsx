import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authAPI } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const ACCESS_TOKEN_KEY = 'access_token';
const USER_KEY = 'user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuth = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const refreshMe = async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const me = await authAPI.getMe();
      localStorage.setItem(USER_KEY, JSON.stringify(me));
      setUser(me);
    } catch (error) {
      clearAuth();
      throw error;
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);

      if (!token) {
        setLoading(false);
        return;
      }

      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser) as User;
          setUser(parsed);
        } catch {
          localStorage.removeItem(USER_KEY);
        }
      }

      try {
        await refreshMe();
      } catch {
        // already cleared
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password);

    localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    setUser(response.user);
  };

  const logout = () => {
    clearAuth();
    window.location.href = '/';
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user && !!localStorage.getItem(ACCESS_TOKEN_KEY),
      login,
      logout,
      refreshMe,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
