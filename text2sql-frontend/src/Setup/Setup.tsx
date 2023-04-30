import { useEffect } from "react";
import { api } from "../api";

import { useNavigate } from "react-router-dom";
import { Routes } from "../router";

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
      }, 15000);
    };

    startHealthCheck();

    return () => {
      clearInterval(intervalId as NodeJS.Timeout);
      clearTimeout(timeoutId as NodeJS.Timeout);
    };
  }, [navigate]);

  return (
    <div className="bg-white pt-16">
      <main>
        {/* Pricing section */}
        <div className="mx-auto max-w-7xl px-6 sm:mt-32 lg:px-8">
          <div className="mx-auto max-w-4xl text-center text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 flex justify-center">
            <p className="mt-2 ">Setting things up</p>
            <div className="mt-2 ml-2 flex align-bottom">
              <div className="mr-1 animate-bounce transition-all">.</div>
              <div className="mr-1 animate-bounce200 transition-all">.</div>
              <div className="mr-1 animate-bounce400 transition-all">.</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
