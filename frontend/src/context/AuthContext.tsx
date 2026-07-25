import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { setIdToken } from '../services/api';

const STORAGE_KEY = 'nourishfest_id_token';

interface AuthContextValue {
  idToken: string | null;
  signIn: (token: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [idToken, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      setIdToken(stored);
      setToken(stored);
    }
  }, []);

  const signIn = (token: string) => {
    sessionStorage.setItem(STORAGE_KEY, token);
    setIdToken(token);
    setToken(token);
  };

  const signOut = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setIdToken(null);
    setToken(null);
  };

  return <AuthContext.Provider value={{ idToken, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
