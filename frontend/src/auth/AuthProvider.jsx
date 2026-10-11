import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.currentUser();
      setUser(response.data);
      setStatus("authenticated");
      return response.data;
    } catch (error) {
      if (error.status === 401) {
        setUser(null);
        setStatus("anonymous");
        return null;
      }
      setStatus("error");
      throw error;
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.currentUser()
      .then((response) => {
        if (!active) return;
        setUser(response.data);
        setStatus("authenticated");
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401) {
          setUser(null);
          setStatus("anonymous");
        } else {
          setStatus("error");
        }
      });
    const onUnauthorized = () => {
      setUser(null);
      setStatus("anonymous");
    };
    window.addEventListener("expense:unauthorized", onUnauthorized);
    return () => {
      active = false;
      window.removeEventListener("expense:unauthorized", onUnauthorized);
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await api.login(credentials);
    setUser(response.data);
    setStatus("authenticated");
    return response.data;
  }, []);

  const register = useCallback((details) => api.register(details), []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo(() => ({
    user,
    status,
    login,
    register,
    logout,
    refreshUser,
  }), [user, status, login, register, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
