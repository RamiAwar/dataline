import React, { useState, ReactNode, useEffect } from "react";
import {
  backendApi,
} from "@/services/api_client";
import {
  setCredentials,
  clearCredentials,
  isAuthenticated as checkAuth,
} from "@/services/auth";

import { AuthContext } from "./AuthContext";
import { enqueueSnackbar } from "notistack";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication status on mount and when localStorage changes
    const checkAuthentication = async () => {
      const authStatus = await checkAuth();
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
