import { createContext, useContext, useEffect, useState } from "react";
import { IConversationResult } from "../Library/types";
import { api } from "../api";

type ConversationListContextType = [
  IConversationResult[],
  (Conversations: IConversationResult[]) => void,
  () => void
];

const ConversationListContext = createContext<ConversationListContextType>([
  [],
  () => {},
  () => {},
]);

export const useConversationList = () => {
  const context = useContext(ConversationListContext);
  if (context === undefined) {
    throw new Error(
      "useConversation must be used within a ConversationProvider"
    );
  }
  return context;
};

export const ConversationListProvider = ({
  children,
}: React.PropsWithChildren) => {
  const [conversations, setConversations] = useState<IConversationResult[]>([]);

  function fetchConversations() {
    api
      .listConversations()
      .then((response) => {
        if (response.status === "ok") {
          setConversations(response.conversations);
          console.log(response.conversations);
        } else {
          alert("Error loading Conversations");
        }
      })
      .catch((err) => alert("Error loading conversations"));
  }

  useEffect(() => {
    fetchConversations();
  }, []);

  return (
    <ConversationListContext.Provider
      value={[conversations, setConversations, fetchConversations]}
    >
      {children}
    </ConversationListContext.Provider>
  );
};
