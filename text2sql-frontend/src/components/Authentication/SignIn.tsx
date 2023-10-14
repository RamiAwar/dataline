import { useState, useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { useNavigate } from "react-router-dom";
import { Routes } from "../../router";
import { supabase } from "../../supabase";
import { CUSTOM_SUPABASE_THEME, useAuth } from "../Providers/AuthProvider";

export const SignIn = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(Routes.NewChat);
    }
  }, [user]);

  return (
    <div className="h-screen w-screen flex">
      <div className="max-w-xs flex-grow mx-auto my-auto">
        <h1 className="text-6xl font-bold text-center mb-4 text-gray-50">
          DataLine
        </h1>
        <Auth
          supabaseClient={supabase}
          appearance={CUSTOM_SUPABASE_THEME}
          providers={[]}
        />
      </div>
    </div>
  );
};
