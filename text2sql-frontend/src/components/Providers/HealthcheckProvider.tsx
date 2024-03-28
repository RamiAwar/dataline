import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../../api";
import { enqueueSnackbar } from "notistack";

type HealthCheckContextType = [boolean];
const HealthCheckContext = createContext<HealthCheckContextType>([true]);

// Custom hook that returns the health status of the backend (boolean)
export const useHealthCheck = () => {
  const context = useContext(HealthCheckContext);
  if (context === undefined) {
    throw new Error("useHealthCheck must be used within a HealthCheckProvider");
  }
  return context;
};

const reconnectSnackbar = () => {
  enqueueSnackbar({
    variant: "success",
    message: "Successfully reconnected to the backend.",
  });
};

const disconnectSnackbar = () => {
  enqueueSnackbar({
    variant: "error",
    message: "Failed to connect to the backend.",
  });
};

export const HealthCheckProvider = ({ children }: React.PropsWithChildren) => {
  const [isHealthy, setIsHealthy] = useState<boolean>(true);

  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        await api.healthcheck();
        if (!isHealthy) {
          setIsHealthy(true);
          reconnectSnackbar();
        }
      } catch (e) {
        if (isHealthy) {
          setIsHealthy(false);
          disconnectSnackbar();
        }
      }
    };

    const interval = setInterval(checkBackendHealth, 2000);
    return () => clearInterval(interval);
  }, [isHealthy]);

  return (
    <HealthCheckContext.Provider value={[isHealthy]}>
      {children}
    </HealthCheckContext.Provider>
  );
};
