import { useEffect, useState } from "react";
import { api } from "../api";

type IMessage = {
  role: string;
  content: string;
};

type IConversation = {
  id: string;
  name: string;
  messages: IMessage[];
};

export const Conversation = (conversation: IConversation) => {
  // Load messages from conversation via API on load
  const [messages, setMessages] = useState<IMessage[]>([]);

  useEffect(() => {
    const loadMessages = async () => {
      const messages = await api.getMessages(conversation.id);
      setMessages(messages);
    };
    loadMessages();
  }, [conversation.id]);

  return <div className="bg-red-200"></div>;
};
