import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: (role: UserRole) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('aicte_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    const savedToken = localStorage.getItem('aicte_token');
    if (savedToken) {
      try {
        const profile = await api.getMe();
        setUser(profile);
      } catch (err) {
        console.error('Session expired or invalid:', err);
        localStorage.removeItem('aicte_token');
        setToken(null);
        setUser(null);
      }
    } else {
      // Auto-load demo user (Institution Admin) on initial hackathon visit
      try {
        const demoRes = await api.demoLogin('INSTITUTION_ADMIN');
        localStorage.setItem('aicte_token', demoRes.access_token);
        setToken(demoRes.access_token);
        setUser(demoRes.user);
      } catch (e) {
        console.warn('Backend not yet ready or demo login failed:', e);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, password);
      localStorage.setItem('aicte_token', res.access_token);
      setToken(res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const res = await api.demoLogin(role);
      localStorage.setItem('aicte_token', res.access_token);
      setToken(res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('aicte_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const u = await api.getMe();
        setUser(u);
      } catch (e) {
        console.error('Failed refreshing user:', e);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, demoLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
