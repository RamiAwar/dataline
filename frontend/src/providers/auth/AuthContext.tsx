import { createContext } from "react";

export interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => void;
  logout: () => void;
  hasAuthEnabled: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);
