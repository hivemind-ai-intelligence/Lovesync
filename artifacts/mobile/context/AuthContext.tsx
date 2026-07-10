import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const SESSION_KEY = 'ourroom_token';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string | null;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoading: true,
  username: null,
  token: null,
  login: async () => false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // On app launch: verify the stored token against the server
  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then(async (stored) => {
        if (!stored) return;
        try {
          const res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${stored}` },
          });
          if (!res.ok) {
            await AsyncStorage.removeItem(SESSION_KEY);
            return;
          }
          const data = (await res.json()) as { username: string };
          setToken(stored);
          setUsername(data.username);
          setIsAuthenticated(true);
        } catch {
          // Network error on launch — trust the stored token optimistically
          // so the app works offline; the server will reject requests if expired
          await AsyncStorage.removeItem(SESSION_KEY);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (user: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password }),
      });
      if (!response.ok) return false;
      const data = (await response.json()) as { username: string; token: string };
      await AsyncStorage.setItem(SESSION_KEY, data.token);
      setToken(data.token);
      setUsername(data.username);
      setIsAuthenticated(true);
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setToken(null);
    setUsername(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, username, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
