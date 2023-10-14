import { Navigate, Outlet, redirect } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../Providers/AuthProvider";
import { Routes } from "../../router";

export const Home = () => {
  const { user } = useAuth();

  return user ? (
    <div className="w-full bg-gray-900">
      <Sidebar></Sidebar>
      <main className="lg:pl-72 w-full mt-16 lg:mt-0">
        <Outlet></Outlet>
      </main>
    </div>
  ) : (
    <Navigate to={Routes.SignIn} replace={true}></Navigate>
  );
};
