import { useEffect, useRef } from "react";
import { Message } from "./Message";
import { Navigate, useParams } from "react-router-dom";
import ExpandingInput from "./ExpandingInput";

import { Transition } from "@headlessui/react";
import { generateUUID } from "../Library/utils";
import { Routes } from "@/router";
import MessageTemplate from "./MessageTemplate";
import {
  getMessagesQuery,
  useGetConnections,
  useGetConversations,
  useSendMessage,
} from "@/hooks";
import { Spinner } from "../Spinner/Spinner";
import { useQuery } from "@tanstack/react-query";

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
  // Load messages from conversation via API on load
  const { data } = useGetConnections();
  const { data: conversationResp } = useGetConversations();

  const {
    mutate: sendMessageMutation,
    isPending: isPendingSendMessage,
    variables: newMessageVariable,
  } = useSendMessage({ id: params.conversationId ?? "" });

  const {
    data: messages,
    isSuccess: isSuccessMessages,
    isPending: isPendingMessages,
    error: messagesError,
  } = useQuery(getMessagesQuery({ id: params.conversationId ?? "" }));

  const messageListRef = useRef<HTMLDivElement | null>(null);
  const currConversation = conversationResp?.conversations.find(
    (conv) => conv.conversation_id === params.conversationId
  );

  const currConnection = data?.connections?.find(
    (conn) => conn.id === currConversation?.connection_id
  );

  useEffect(() => {
    if (messageListRef.current !== null) {
      // Timeout needed because the SQL code in the messages get formatted and take more space
      setTimeout(() => {
        window.scrollTo({ top: messageListRef.current?.offsetTop });
      }, 10);
    }
  }, [isPendingMessages, messageListRef, params]);

  if (isPendingMessages) {
    return (
      <div className="w-full h-screen flex justify-center items-center text-white">
        <Spinner />
        Loading...
      </div>
    );
  }
  if (!isSuccessMessages) {
    return <div>Something went wrong</div>;
  }
  // @ts-expect-error, status is not known
  if (messagesError?.status === 404 || !data?.connections?.length) {
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
        <div className="overflow-y-auto pb-36 bg-gray-900">
          {messages.messages.map((message) => (
            <Message
              key={(params.conversationId as string) + message.message_id}
              initialMessage={message}
            />
          ))}
          {isPendingSendMessage && (
            <>
              <Message
                initialMessage={{
                  content: newMessageVariable,
                  role: "user",
                  message_id: generateUUID(),
                }}
                className="dark:text-gray-400"
              />
              <Message
                initialMessage={{
                  content: "Loading...",
                  role: "assistant",
                  message_id: generateUUID(),
                }}
              />
            </>
          )}
        </div>
        <div ref={messageListRef}></div>
      </Transition>

      <div className="fixed bottom-0 left-0 lg:left-72 right-0 flex flex-col items-center justify-center backdrop-blur-md pt-0">
        {messages.messages.length === 0 && currConnection?.is_sample && (
          <div className="w-full md:max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-2 justify-between px-2 sm:px-3 my-4">
            {templateMessages.map((template) => (
              <MessageTemplate
                key={template.title}
                title={template.title}
                text={template.text}
                onClick={() => sendMessageMutation(template.message)}
              />
            ))}
          </div>
        )}
        <div className="w-full md:max-w-3xl flex justify-center pb-4 ml-2 mr-2 mb-2 pl-2 pr-2">
          <ExpandingInput onSubmit={sendMessageMutation} disabled={false} />
        </div>
      </div>
    </div>
  );
};
