import { createContext, useState, useContext, ReactNode } from 'react';

interface AuthState {
  token: string;
  username: string;
}

interface AuthContextType extends AuthState {
  isAuthenticated: boolean;
  login: (token: string, username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => ({
    token: localStorage.getItem('pc_token') || '',
    username: localStorage.getItem('pc_username') || '',
  }));

  const login = (token: string, username: string) => {
    localStorage.setItem('pc_token', token);
    localStorage.setItem('pc_username', username);
    setAuth({ token, username });
  };

  const logout = () => {
    localStorage.removeItem('pc_token');
    localStorage.removeItem('pc_username');
    setAuth({ token: '', username: '' });
  };

  return (
    <AuthContext.Provider value={{ ...auth, isAuthenticated: !!auth.token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
