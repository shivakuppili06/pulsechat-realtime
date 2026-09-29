import { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => ({
    token: localStorage.getItem('pc_token') || '',
    username: localStorage.getItem('pc_username') || '',
  }));

  const login = (token, username) => {
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
  return useContext(AuthContext);
}
