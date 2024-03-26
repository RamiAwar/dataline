import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../../api";
import { enqueueSnackbar } from "notistack";

type HealthCheckContextType = [boolean | null];

const HealthCheckContext = createContext<HealthCheckContextType>([null]);

// Custom hook that returns the user info and a function to set the avatar blob
export const useHealthCheck = () => {
  const context = useContext(HealthCheckContext);
  if (context === undefined) {
    throw new Error("useHealthCheck must be used within a HealthCheckProvider");
  }
  return context;
};

export const HealthCheckProvider = ({ children }: React.PropsWithChildren) => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        console.log("Performing healthcheck");
        await api.healthcheck();
        if (isHealthy !== true) {
          if (isHealthy === false) {
            enqueueSnackbar({
              variant: "success",
              message: "Successfully reconnected to the backend.",
            });
          }
          setIsHealthy(true);
        }
      } catch (e) {
        if (isHealthy !== false) {
          setIsHealthy(false);
          enqueueSnackbar({
            variant: "error",
            message: "Failed to connect to the backend.",
          });
        }
        return;
      }
    };

    if (isHealthy === null) {
      checkBackendHealth();
    }
    const intervalId = setInterval(
      checkBackendHealth,
      isHealthy ? 20000 : 5000
    );

    return () => {
      clearInterval(intervalId);
    };
  }, [isHealthy]);

  return (
    <HealthCheckContext.Provider value={[isHealthy]}>
      {children}
    </HealthCheckContext.Provider>
  );
};
