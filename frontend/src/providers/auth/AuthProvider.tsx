import React, { useState, ReactNode, useEffect } from "react";
import { backendApi } from "@/services/api_client";
import {
  setCredentials,
  clearCredentials,
  isAuthenticated as checkAuth,
} from "@/services/auth";

import { AuthContext } from "./AuthContext";
import { enqueueSnackbar } from "notistack";
import { api } from "@/api";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasAuthEnabled, setHasAuthEnabled] = useState(true);

  useEffect(() => {
    // Check authentication status on mount and when localStorage changes
    const checkAuthentication = async () => {
      const hasAuth = await api.hasAuth();
      setHasAuthEnabled(hasAuth);

      const authStatus = await checkAuth(hasAuth);
      setIsAuthenticated(authStatus);
    };
    checkAuthentication();

    window.addEventListener("storage", checkAuthentication);
    return () => window.removeEventListener("storage", checkAuthentication);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      // Send a request to the backend to validate credentials
      const response = await backendApi({
        method: "POST",
        url: "/auth/login",
        data: { username, password },
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
    <AuthContext.Provider
      value={{ isAuthenticated, login, logout, hasAuthEnabled }}
    >
      {children}
    </AuthContext.Provider>
  );
};
