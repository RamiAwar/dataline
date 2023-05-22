import { useEffect, useState } from "react";
import { api } from "../api";
import { Message } from "./Message";

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

  return (
    <div className="bg-red-200 w-full flex flex-col h-full">
      <Message
        message_id="ad"
        content="Get me the 5 most rented movies"
        role="user"
        results={[]}
      ></Message>
      <Message
        message_id="awsd"
        content="Test"
        role="assistant"
        results={[]}
      ></Message>

      <div className="bg-blue-400 bg-opacity-50 absolute w-full bottom-0 left-0">
        <div className="bg-teal-200 w-full flex justify-center py-6">
          <div className="bg-red-200 max-w-7xl">Message box</div>
        </div>
      </div>
    </div>
  );
};
