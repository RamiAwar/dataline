import { createContext, useContext, useEffect, useState } from "react";

type SessionContextType = [string | null, (session: string | null) => void];

const SessionContext = createContext<SessionContextType>([null, () => {}]);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};

export const SessionProvider = ({ children }: React.PropsWithChildren) => {
  const [session, setSession] = useState<string | null>(null);

  useEffect(() => {
    const session = localStorage.getItem("session_id");
    setSession(session);
  }, []);

  const setSessionAndStore = (session: string | null) => {
    if (session) {
      localStorage.setItem("session_id", session);
    } else {
      localStorage.removeItem("session_id");
    }
    setSession(session);
  };

  return (
    <SessionContext.Provider value={[session, setSessionAndStore]}>
      {children}
    </SessionContext.Provider>
  );
};
