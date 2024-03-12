import { useEffect, useState, useRef } from "react";
import { api } from "../../api";
import { Message } from "./Message";
import { IMessageWithResults } from "../Library/types";
import { useParams } from "react-router-dom";
import ExpandingInput from "./ExpandingInput";

import { Transition } from "@headlessui/react";
import { generateUUID } from "../Library/utils";

export const Conversation = () => {
  const params = useParams<{ conversationId: string }>();

  // Load messages from conversation via API on load
  const [messages, setMessages] = useState<IMessageWithResults[]>([]);
  const messageListRef = useRef<HTMLDivElement | null>(null);

  function submitQuery(value: string) {
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
      const res = await api.query(params.conversationId as string, value, true);
      if (res.status !== "ok") {
        alert("Error querying database");
        return;
      }
      const message = res.data.message;
      setMessages((prevMessages) => [...prevMessages.slice(0, -1), message]);
    })();
  }

  useEffect(() => {
    const loadMessages = async () => {
      const messages = await api.getMessages(params.conversationId as string);
      if (messages.status !== "ok") {
        alert("Error fetching messages");
        return;
      }
      setMessages(messages.data.messages);
    };
    loadMessages();
  }, [params]);

  useEffect(() => {
    if (messageListRef.current !== null) {
      setTimeout(() => {
        messageListRef.current?.lastElementChild?.scrollIntoView({
          // typescript doesn't like "instant" and will throw an error
          // https://github.com/Microsoft/TypeScript/issues/28755
          behavior: "auto",
        });
      }, 10);
    }
  }, [messages]);

  return (
    <div className="bg-gray-900 w-full h-[calc(100%-4rem)] relative flex flex-col">
      <Transition
        key={params.conversationId}
        enter="transition duration-200"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        show={true}
        appear={true}
      >
        <div className="overflow-y-auto pb-36 bg-gray-900" ref={messageListRef}>
          {messages.map((message) => (
            <Message
              key={(params.conversationId as string) + message.message_id}
              message_id={message.message_id}
              content={message.content}
              role={message.role}
              results={message.results}
              conversation_id={params.conversationId}
            ></Message>
          ))}
        </div>
      </Transition>

      <div className="fixed bottom-0 left-0 lg:left-72 right-0 flex justify-center bg-gradient-to-t from-gray-900 from-30% to-transparent pt-2">
        <div className="w-full md:max-w-3xl flex justify-center pt-6 pb-4 m-2">
          <ExpandingInput
            onSubmit={submitQuery}
            disabled={false}
          ></ExpandingInput>
        </div>
      </div>
    </div>
  );
};
