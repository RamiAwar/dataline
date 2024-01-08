import { createContext, useContext, useEffect, useState } from "react";
import { IConnection } from "../Library/types";
import { api } from "../../api";
import { useAuth } from "./AuthProvider";

type ConnectionListContextType = [
  IConnection[] | null,
  React.Dispatch<React.SetStateAction<IConnection[]>>,
  () => void
];

const ConnectionListContext = createContext<ConnectionListContextType>([
  null,
  () => {},
  () => {},
]);

export const useConnectionList = () => {
  const context = useContext(ConnectionListContext);
  if (context === undefined) {
    throw new Error("useConnection must be used within a ConnectionProvider");
  }
  return context;
};

export const ConnectionListProvider = ({
  children,
}: React.PropsWithChildren) => {
  const [connections, setConnections] = useState<IConnection[]>([]);
  const { session } = useAuth();
  const tokens = {
    accessToken: session?.access_token ?? "",
    refreshToken: session?.refresh_token ?? "",
  };

  function fetchConnections() {
    api
      .listConnections(tokens)
      .then((response) => {
        console.log(response);
        if (response.status === "ok") {
          setConnections(response.sessions);
        } else {
          alert("Error loading connections");
        }
      })
      .catch((err) => {
        alert("Error loading conversations");
        console.log(err);
      });
  }

  useEffect(() => {
    if (!session) return;
    fetchConnections();
  }, [session]);

  return (
    <ConnectionListContext.Provider
      value={[connections, setConnections, fetchConnections]}
    >
      {children}
    </ConnectionListContext.Provider>
  );
};
