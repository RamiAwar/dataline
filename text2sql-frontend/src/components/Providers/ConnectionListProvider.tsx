import { createContext, useContext, useEffect, useState } from "react";
import { IConnection } from "../Library/types";
import { api } from "../../api";

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

  function fetchConnections() {
    api
      .listConnections()
      .then((response) => {
        if (response.status === "ok") {
          setConnections(response.data.connections);
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
    fetchConnections();
  }, []);

  return (
    <ConnectionListContext.Provider
      value={[connections, setConnections, fetchConnections]}
    >
      {children}
    </ConnectionListContext.Provider>
  );
};
