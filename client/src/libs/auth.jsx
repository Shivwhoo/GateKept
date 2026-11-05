import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function checkAuth() {
    try {
      const res = await api.get('/auth/me');
      setUser(res.user);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkAuth();
  }, []);

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.user);
    return res;
  }

  async function register(userData) {
    return await api.post('/auth/register', userData);
  }

  async function verifyOtp(email, otp) {
    const res = await api.post('/auth/verify-otp', { email, otp });
    setUser(res.user);
    return res;
  }

  async function bypassVerify(email) {
    const res = await api.post('/auth/bypass-verify', { email });
    setUser(res.user);
    return res;
  }

  async function resendOtp(email) {
    return await api.post('/auth/resend-otp', { email });
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        verifyOtp,
        bypassVerify,
        resendOtp,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}