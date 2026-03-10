import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import { ws }  from "../services/websocket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from stored token on mount
  useEffect(() => {
    const token = localStorage.getItem("flexswap_token");
    if (token) {
      api.auth.me()
        .then(u  => { setUser(u); ws.connect(token); })
        .catch(() => localStorage.removeItem("flexswap_token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user } = await api.auth.login({ email, password });
    localStorage.setItem("flexswap_token", token);
    setUser(user);
    ws.connect(token);
    return user;
  }, []);

  const register = useCallback(async (username, email, password, phone) => {
    const { token, user } = await api.auth.register({ username, email, password, phone });
    localStorage.setItem("flexswap_token", token);
    setUser(user);
    ws.connect(token);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("flexswap_token");
    setUser(null);
    ws.disconnect();
  }, []);

  const refreshUser = useCallback(async () => {
    const u = await api.auth.me();
    setUser(u);
    return u;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
