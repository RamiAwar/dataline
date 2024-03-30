import { useEffect, useState, useRef } from "react";
import { api } from "../../api";
import { Message } from "./Message";
import { IMessageWithResults } from "../Library/types";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import ExpandingInput from "./ExpandingInput";

import { Transition } from "@headlessui/react";
import { generateUUID } from "../Library/utils";
import { enqueueSnackbar } from "notistack";
import { useConnectionList } from "../Providers/ConnectionListProvider";
import { useConversationList } from "../Providers/ConversationListProvider";
import { isAxiosError } from "axios";
import { Routes } from "@/router";
import MessageTemplate from "./MessageTemplate";

const templateMessages = [
  {
    title: "What questions can I ask",
    text: "about this dataset?",
    message: "What questions can I ask about this dataset?",
  },
  {
    title: "Show me some rows",
    text: "from one of the tables.",
    message: "Show me some rows from one of the tables.",
  },
  {
    title: "What can you tell me",
    text: "about this database?",
    message: "What can you tell me about this database?",
  },
];

export const Conversation = () => {
  const params = useParams<{ conversationId: string }>();
  const navigate = useNavigate();

  // Load messages from conversation via API on load
  const [messages, setMessages] = useState<IMessageWithResults[]>([]);
  const [connections] = useConnectionList();
  const [conversations] = useConversationList();
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const currConversation = conversations.find(
    (conv) => conv.conversation_id === params.conversationId
  );
  const currConnection = connections?.find(
    (conn) => conn.id === currConversation?.connection_id
  );

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
      try {
        const res = await api.query(
          params.conversationId as string,
          value,
          true
        );
        const message = res.data.message;

        // Clear loading message and add response
        setMessages((prevMessages) => [...prevMessages.slice(0, -1), message]);
      } catch (exception) {
        // Clear loading message
        setMessages((prevMessages) => prevMessages.slice(0, -1));

        enqueueSnackbar({
          variant: "error",
          message: "Error querying assistant",
        });
      }
    })();
  }

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const messages = await api.getMessages(params.conversationId!);
        setMessages(messages.data.messages);
      } catch (exception) {
        if (isAxiosError(exception) && exception.response?.status === 404) {
          navigate(Routes.Root);
          return;
        }
        enqueueSnackbar({
          variant: "error",
          message: "Error fetching messages",
        });
      }
    };
    loadMessages();
  }, [params, navigate]);

  useEffect(() => {
    if (messageListRef.current !== null) {
      setTimeout(() => {
        messageListRef.current?.lastElementChild?.scrollIntoView({
          behavior: "auto",
        });
      }, 10);
    }
  }, [messages]);

  if (connections === null || connections?.length === 0) {
    // Redirect to connection selector route
    return <Navigate to={Routes.Root} />;
  }

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

      <div className="fixed bottom-0 left-0 lg:left-72 right-0 flex flex-col items-center justify-center backdrop-blur-md pt-0">
        {messages.length === 0 && currConnection?.is_sample && (
          <div className="w-full md:max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-2 justify-between px-2 sm:px-3 my-4">
            {templateMessages.map((template) => (
              <MessageTemplate
                key={template.title}
                title={template.title}
                text={template.text}
                onClick={() => submitQuery(template.message)}
              />
            ))}
          </div>
        )}
        <div className="w-full md:max-w-3xl flex justify-center pb-4 ml-2 mr-2 mb-2 pl-2 pr-2">
          <ExpandingInput
            onSubmit={submitQuery}
            disabled={false}
          ></ExpandingInput>
        </div>
      </div>
    </div>
  );
};
