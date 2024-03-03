import { useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { useNavigate } from "react-router-dom";
import { Routes } from "../../router";
import { supabase } from "../../supabase";

export const SignIn = () => {
  return (
    <div className="h-screen w-screen flex">
      <div className="max-w-xs flex-grow mx-auto my-auto">
        <h1 className="text-6xl font-bold text-center mb-4 text-gray-50">
          DataLine
        </h1>
      </div>
    </div>
  );
};
