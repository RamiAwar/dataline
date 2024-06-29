import React, { useState, ReactNode, useEffect } from "react";
import {
  setCredentials,
  clearCredentials,
  isAuthenticated as checkAuth,
  backendApi,
} from "@/services/api_client";
import { AuthContext } from "./AuthContext";
import { enqueueSnackbar } from "notistack";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => checkAuth());

  useEffect(() => {
    // Check authentication status on mount and when localStorage changes
    const checkAuthStatus = () => setIsAuthenticated(checkAuth());
    window.addEventListener("storage", checkAuthStatus);
    return () => window.removeEventListener("storage", checkAuthStatus);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      // Send a request to the backend to validate credentials
      const response = await backendApi({
        method: "POST",
        url: "/auth/login",
        data: { username, password },
        skipAuth: true, // Skip authentication for this request
      });

      if (response.status === 200) {
        // If login is successful, set credentials and update state
        setCredentials(username, password);
        setIsAuthenticated(true);
        return true;
      } else {
        // If login fails, clear any existing credentials and return false
        clearCredentials();
        setIsAuthenticated(false);
        return false;
      }
    } catch (error) {
      enqueueSnackbar("Authentication failed", { variant: "error" });
      clearCredentials();
      setIsAuthenticated(false);
      return false;
    }
  };

  const logout = () => {
    clearCredentials();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
