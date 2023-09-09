import { createContext, useContext, useEffect, useState } from "react";
import { IConversation } from "../Library/types";

type ConversationContextType = [
  IConversation | null,
  (conversation: IConversation | null) => void
];

const ConversationContext = createContext<ConversationContextType>([
  null,
  () => {},
]);

export const useConversation = () => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error(
      "useConversation must be used within a ConversationProvider"
    );
  }
  return context;
};

export const ConversationProvider = ({ children }: React.PropsWithChildren) => {
  const [conversation, setConversation] = useState<IConversation | null>(null);

  return (
    <ConversationContext.Provider value={[conversation, setConversation]}>
      {children}
    </ConversationContext.Provider>
  );
};
