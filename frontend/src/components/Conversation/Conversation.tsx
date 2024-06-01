import {
  useEffect,
  useRef,
  useState,
  // useState
} from "react";
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
  useSendMessageStreaming,
} from "@/hooks";
import { Spinner } from "../Spinner/Spinner";
import { useQuery } from "@tanstack/react-query";
import { IResultType } from "@components/Library/types";

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
  },
];

export const Conversation = () => {
  const params = useParams<{ conversationId: string }>();
  // Load messages from conversation via API on load
  const { data: connectionsData } = useGetConnections();
  const { data: conversationsData } = useGetConversations();

  const [tempResults, setTempResults] = useState<IResultType[]>([]);

  const {
    mutate: sendMessageMutation,
    isPending: isPendingSendMessage,
    variables: newMessageVariable,
  } = useSendMessageStreaming({
    onAddResult: (result) =>
      setTempResults((prev) => [
        ...prev,
        { ...result, result_id: generateUUID() },
      ]),
    onSettled: () => setTempResults([]),
  });

  const {
    data: messages,
    isSuccess: isSuccessGetMessages,
    isPending: isPendingGetMessages,
    error: getMessagesError,
  } = useQuery(
    getMessagesQuery({ conversationId: params.conversationId ?? "" })
  );

  const messageListRef = useRef<HTMLDivElement | null>(null);
  const currConversation = conversationsData?.find(
    (conv) => conv.id === params.conversationId
  );

  const currConnection = connectionsData?.connections?.find(
    (conn) => conn.id === currConversation?.connection_id
  );

  const scrollToBottom = () => {
    if (messageListRef.current !== null) {
      window.scrollTo({ top: messageListRef.current?.offsetTop });
    }
  };
  useEffect(() => {
    scrollToBottom();
  }, [isPendingGetMessages, messageListRef, params, isPendingSendMessage]);

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
          {messages.map((message) => (
            <Message
              key={(params.conversationId as string) + message.message.id}
              message={message}
            />
          ))}
          {isPendingSendMessage &&
            newMessageVariable.conversationId === currConversation?.id && (
              <>
                <Message
                  message={{
                    message: {
                      content: newMessageVariable.message,
                      role: "human",
                      id: generateUUID(),
                    },
                  }}
                  className="dark:text-gray-400"
                />
                <Message
                  key={new Date().toJSON()}
                  message={{
                    message: {
                      content: "Generating Results...",
                      role: "ai",
                      id: generateUUID(),
                    },
                    results: tempResults,
                  }}
                  className="animate-pulse"
                />
              </>
            )}
        </div>
        <div ref={messageListRef}></div>
      </Transition>

      <div className="fixed bottom-0 left-0 lg:left-72 right-0 flex flex-col items-center justify-center backdrop-blur-md pt-0">
        {messages.length === 0 && currConnection?.is_sample && (
          <div className="w-full md:max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-2 justify-between px-2 sm:px-3 my-4">
            {templateMessages.map((template) => (
              <MessageTemplate
                key={template.title}
                title={template.title}
                text={template.text}
                onClick={() =>
                  sendMessageMutation({
                    message: template.message,
                    conversationId: params.conversationId ?? "",
                  })
                }
              />
            ))}
          </div>
        )}
        <div className="w-full md:max-w-3xl flex flex-col justify-center items-center pb-4 ml-2 mr-2 mb-2 pl-2 pr-2">
          <ExpandingInput
            onSubmit={(message: string) =>
              sendMessageMutation({
                message,
                conversationId: params.conversationId ?? "",
              })
            }
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
