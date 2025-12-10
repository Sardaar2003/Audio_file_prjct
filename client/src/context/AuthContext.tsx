import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { fetchCurrentUser } from '../api';

interface AuthContextState {
  user: User | null;
  token: string | null;
  loading: boolean;
  setAuth: (payload: { user: User; token: string }) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetchCurrentUser();
        setUser(response.data.user);
      } catch (error) {
        localStorage.removeItem('auth_token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, [token]);

  const setAuth = ({ user: nextUser, token: nextToken }: { user: User; token: string }) => {
    localStorage.setItem('auth_token', nextToken);
    setToken(nextToken);
    setUser(nextUser);
  };

  const clearAuth = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, setAuth, clearAuth }}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};


