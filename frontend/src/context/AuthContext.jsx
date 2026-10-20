import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          id: Number(payload.sub),
          role: payload.role,
          name: payload.name || (payload.role === 'ADMIN' ? 'Admin' : payload.role === 'STAFF' ? 'Staff Member' : 'Student'),
          email: payload.email || ''
        });
      } catch (e) {
        console.error('Invalid token, clearing.', e);
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    // FastAPI OAuth2PasswordRequestForm requires form-encoded body
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const res = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const newToken = res.data.access_token;
    localStorage.setItem('token', newToken);
    setToken(newToken);

    const payload = JSON.parse(atob(newToken.split('.')[1]));
    const loggedUser = {
      id: Number(payload.sub),
      role: payload.role,
      name: payload.name || (payload.role === 'ADMIN' ? 'Admin' : payload.role === 'STAFF' ? 'Staff Member' : 'Student'),
      email: payload.email || ''
    };
    setUser(loggedUser);
    return loggedUser; // caller uses role to navigate
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
