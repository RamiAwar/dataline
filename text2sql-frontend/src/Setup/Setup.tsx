import { useEffect } from "react";
import { api } from "../api";

import { useNavigate } from "react-router-dom";
import { Routes } from "../router";
import { CenteredLayout } from "../Layouts/CenteredLayout";

export const Setup = () => {
  const navigate = useNavigate();

  // Navigate to connection if backend is live
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const checkBackendHealth = async () => {
      try {
        await api.healthcheck();
        navigate(Routes.Connection);
      } catch (e) {
        return;
      }
    };

    const startHealthCheck = async () => {
      intervalId = setInterval(checkBackendHealth, 50);
      timeoutId = setTimeout(() => {
        clearInterval(intervalId as NodeJS.Timeout);
        alert("Failed to connect to backend.");
        window.close();
      }, 20000);
    };

    startHealthCheck();

    return () => {
      clearInterval(intervalId as NodeJS.Timeout);
      clearTimeout(timeoutId as NodeJS.Timeout);
    };
  }, [navigate]);

  return (
    <CenteredLayout>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center flex justify-center items-end dark:text-white text-4xl">
          <p className="font-semibold tracking-tight text-white sm:text-4xl">
            Setting things up
          </p>
          <div className="ml-2 flex text-3xl">
            <div className="mr-1 animate-bounce transition-all">.</div>
            <div className="mr-1 animate-bounce200 transition-all">.</div>
            <div className="mr-1 animate-bounce400 transition-all">.</div>
          </div>
        </div>
      </div>
    </CenteredLayout>
  );
};
