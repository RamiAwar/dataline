import { useEffect, useState, useRef } from "react";
import { api } from "../../api";
import { Message } from "./Message";
import { IMessageWithResults } from "../Library/types";
import { useConversation } from "../Providers/ConversationProvider";

import ExpandingInput from "./ExpandingInput";

import { Transition } from "@headlessui/react";
import { ConnectionSelector } from "../Library/ConnectionSelector";
import { generateUUID } from "../Library/utils";

export const Conversation = () => {
  // Load messages from conversation via API on load
  const [messages, setMessages] = useState<IMessageWithResults[]>([]);
  const [conversation, setConversation] = useConversation();
  const scrollableDiv = useRef<HTMLDivElement | null>(null);

  function submitQuery(value: string) {
    // Check if a current conversation is selected
    if (conversation === null) {
      alert("Please select a connection first");
      return;
    }

    // Add message to messages
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        content: value,
        role: "user",
        message_id: generateUUID(),
      },
    ]);

    // Add message to messages
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        content: "Loading...",
        role: "assistant",
        message_id: generateUUID(),
      },
    ]);

    // Get API response
    (async () => {
      const res = await api.query(conversation.id, value, true);
      if (res.status !== "ok") {
        alert("Error querying database");
        return;
      }
      const message = res.message;
      setMessages((prevMessages) => [...prevMessages.slice(0, -1), message]);
    })();
  }

  useEffect(() => {
    const loadMessages = async () => {
      if (!conversation) return;
      const messages = await api.getMessages(conversation.id);
      setMessages(messages.messages);
    };
    loadMessages();
  }, [conversation]);

  useEffect(() => {
    if (scrollableDiv.current !== null) {
      scrollableDiv.current.scrollIntoView({ behavior: "instant" });
    }
  }, [messages]);

  return (
    <div className="bg-gray-900 w-full h-full relative flex flex-col">
      <Transition
        className="flex flex-col w-full h-full"
        show={conversation === null}
        enter="transition duration-150 ease-in-out transform"
        enterFrom="opacity-0 scale-75"
        enterTo="opacity-100 scale-100"
      >
        <ConnectionSelector />
      </Transition>
      <Transition
        show={conversation !== null}
        enter="transition duration-150 ease-out transform"
        enterFrom="opacity-0 translate-y-1/2"
        enterTo="opacity-100 translate-y-0"
      >
        <div className="overflow-y-auto scroll-m-0 pb-36 bg-gray-900">
          {messages.map((message) => (
            <Message
              key={message.message_id}
              message_id={message.message_id}
              content={message.content}
              role={message.role}
              results={message.results}
              conversation_id={conversation?.id}
            ></Message>
          ))}
          <div ref={scrollableDiv} />
        </div>
      </Transition>

      <div className="fixed bottom-0 left-0 lg:left-72 right-0 flex justify-center bg-gradient-to-t from-gray-900 from-30% to-transparent pt-2">
        <div className="w-full md:max-w-3xl flex justify-center pt-6 pb-4 m-2">
          <ExpandingInput
            onSubmit={submitQuery}
            disabled={conversation === null}
          ></ExpandingInput>
        </div>
      </div>
    </div>
  );
};
