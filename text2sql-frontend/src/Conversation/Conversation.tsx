import { useEffect, useState } from "react";
import { api } from "../api";
import { Message } from "./Message";
import { IConversation, IMessageWithResults } from "./types";
import { useConversation } from "../Providers/ConversationProvider";

export const Conversation = () => {
  // Load messages from conversation via API on load
  const [messages, setMessages] = useState<IMessageWithResults[]>([]);
  const [conversation, _] = useConversation();

  useEffect(() => {
    const loadMessages = async () => {
      if (!conversation) return;
      const messages = await api.getMessages(conversation.id);
      setMessages(messages.messages);
    };
    loadMessages();
  }, [conversation]);

  return (
    <div className="bg-red-200 w-full flex flex-col h-full">
      {messages.map((message) => (
        <Message
          key={message.message_id}
          message_id={message.message_id}
          content={message.content}
          role={message.role}
          results={message.results}
        ></Message>
      ))}

      <div className="bg-blue-400 bg-opacity-50 absolute w-full bottom-0 left-0">
        <div className="bg-teal-200 w-full flex justify-center py-6">
          <div className="bg-red-200 max-w-7xl">Message box</div>
        </div>
      </div>
    </div>
  );
};
