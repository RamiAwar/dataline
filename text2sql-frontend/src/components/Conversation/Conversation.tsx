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
    title: "What can you tell me",
    text: "about this database?",
    message: "What can you tell me about this database?",
  }
];

export const Conversation = () => {
  const params = useParams<{ conversationId: string }>();
  // Load messages from conversation via API on load
  const { data: connectionsData } = useGetConnections();
  const { data: conversationsData } = useGetConversations();

  const {
    mutate: sendMessageMutation,
    isPending: isPendingSendMessage,
    variables: newMessageVariable,
  } = useSendMessage({ id: params.conversationId ?? "" });

  const {
    data: messages,
    isSuccess: isSuccessGetMessages,
    isPending: isPendingGetMessages,
    error: getMessagesError,
  } = useQuery(getMessagesQuery({ id: params.conversationId ?? "" }));

  const messageListRef = useRef<HTMLDivElement | null>(null);
  const currConversation = conversationsData?.conversations.find(
    (conv) => conv.conversation_id === params.conversationId
  );

  const currConnection = connectionsData?.connections?.find(
    (conn) => conn.id === currConversation?.connection_id
  );

  useEffect(() => {
    if (messageListRef.current !== null) {
      window.scrollTo({ top: messageListRef.current?.offsetTop });
    }
  }, [isPendingGetMessages, messageListRef, params]);

  if (isPendingGetMessages) {
    return (
      <div className="w-full h-screen flex justify-center items-center text-white">
        <Spinner />
        Loading...
      </div>
    );
  }
  if (!isSuccessGetMessages) {
    return (
      <div className="w-full h-screen flex justify-center items-center text-white">
        Something went wrong!
      </div>
    );
  }
  if (
    // @ts-expect-error, status is not known
    getMessagesError?.status === 404 ||
    !connectionsData?.connections?.length
  ) {
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
                  content: newMessageVariable.message,
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
                onClick={() =>
                  sendMessageMutation({ message: template.message })
                }
              />
            ))}
          </div>
        )}
        <div className="w-full md:max-w-3xl flex flex-col justify-center items-center pb-4 ml-2 mr-2 mb-2 pl-2 pr-2">
          <ExpandingInput
            onSubmit={(message: string) => sendMessageMutation({ message })}
            disabled={false}
          />
          <p className="text-gray-400 text-sm">
            Current Connection: {currConnection?.name}
          </p>
        </div>
      </div>
    </div>
  );
};
