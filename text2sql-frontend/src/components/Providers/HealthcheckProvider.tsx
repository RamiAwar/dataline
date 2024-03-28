import { createContext, useContext, useEffect, useReducer } from "react";
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
    preventDuplicate: true,
  });
};

const disconnectSnackbar = () => {
  enqueueSnackbar({
    variant: "error",
    message: "Failed to connect to the backend.",
    preventDuplicate: true,
  });
};

interface HealthCheckAction {
  nextHealthy: boolean;
}

interface HealthCheckState {
  healthy: boolean;
  isLoaded: boolean;
}

function HealthCheckReducer(
  state: HealthCheckState,
  action: HealthCheckAction
) {
  const { nextHealthy } = action;
  const { isLoaded, healthy } = state;
  if (nextHealthy) {
    if (isLoaded && !healthy) {
      reconnectSnackbar();
    }
    return { isLoaded: true, healthy: true };
  } else {
    if (!isLoaded || healthy) {
      disconnectSnackbar();
    }
    return { isLoaded: true, healthy: false };
  }
}

export const HealthCheckProvider = ({ children }: React.PropsWithChildren) => {
  const [state, dispatch] = useReducer(HealthCheckReducer, {
    isLoaded: false,
    healthy: false,
  });

  useEffect(() => {
    // since we don't have access to the timeout ID from the inner function
    // "shouldRepeat" prevents creating new setTimeouts on component re-render
    let shouldRepeat = true;
    const checkBackendHealth = async () => {
      try {
        await api.healthcheck();
        dispatch({ nextHealthy: true });
      } catch (e) {
        dispatch({ nextHealthy: false });
      }
      if (shouldRepeat) {
        setTimeout(checkBackendHealth, 2000);
      }
    };
    checkBackendHealth();
    return () => {
      shouldRepeat = false;
    };
  }, []);

  return (
    <HealthCheckContext.Provider value={[state.healthy]}>
      {children}
    </HealthCheckContext.Provider>
  );
};
