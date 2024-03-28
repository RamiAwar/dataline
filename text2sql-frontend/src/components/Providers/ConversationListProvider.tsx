import { createContext, useContext, useEffect, useState } from "react";
import { IConversationResult } from "../Library/types";
import { api } from "../../api";
import { enqueueSnackbar } from "notistack";

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
    async function f() {
      await api
        .listConversations()
        .then((response) => {
          if (response.status === "ok") {
            setConversations(response.data.conversations);
          } else {
            enqueueSnackbar({
              variant: "error",
              message: "Error loading Conversations",
            });
          }
        })
        .catch(() => {
          enqueueSnackbar({
            variant: "error",
            message: "Error loading conversations",
          });
        });
    }
    f();
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
