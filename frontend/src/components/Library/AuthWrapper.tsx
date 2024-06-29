import { useAuth } from "@/providers/auth/useAuth";
import { Routes } from "@/router";
import { Navigate } from "react-router-dom";

export const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={Routes.Login} replace />;
  }

  return <>{children}</>;
};
