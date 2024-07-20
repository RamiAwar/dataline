import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Message } from "./Message";
import { Navigate, useParams } from "@tanstack/react-router";
import ExpandingInput from "./ExpandingInput";

import { Transition } from "@headlessui/react";
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
import { generateUUID } from "@components/Library/utils";

const templateMessages = [
  {
    title: "What are some example questions",
    text: "I can ask about this data source?",
    message:
      "What are some example questions I can ask about this data source?",
  },
  {
    title: "What are some interesting",
    text: "tables in this data source?",
    message: "What are some interesting tables in this data source?",
  },
];

export const Conversation = () => {
  const params = useParams({ from: "/_app/chat/$conversationId" });
  // Load messages from conversation via API on load
  const { data: connectionsData } = useGetConnections();
  const { data: conversationsData } = useGetConversations();

  const [streamedResults, setStreamedResults] = useState<IResultType[]>([]);

  const {
    mutate: sendMessageMutation,
    isPending: isStreamingResults,
    variables: newMessageVariable,
  } = useSendMessageStreaming({
    onAddResult: (result) =>
      setStreamedResults((prev) => [
        ...prev,
        // ok to use generateUUID() here because these are temporary, once the stream ends the state is set to an
        // empty array and the mutation's onSuccess properly populates the new messages + results
        { ...result, result_id: generateUUID() },
      ]),
    onSettled: () => setStreamedResults([]),
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
  const expandingInputRef = useRef<HTMLTextAreaElement | null>(null);

  const currConversation = conversationsData?.find(
    (conv) => conv.id === params.conversationId
  );

  const currConnection = connectionsData?.connections?.find(
    (conn) => conn.id === currConversation?.connection_id
  );

  const scrollToBottom = (
    behavior: ScrollBehavior = "instant" as ScrollBehavior
  ) => {
    if (messageListRef.current !== null) {
      window.scrollTo({ top: messageListRef.current?.offsetTop, behavior });
    }
  };
  useEffect(() => {
    // Wait for charts to render, otherwise the scroll will happen and stop before it reaches the bottom
    const animationFrameId = requestAnimationFrame(() => scrollToBottom());

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPendingGetMessages, messageListRef, params, isStreamingResults]);

  useEffect(() => {
    if (streamedResults.length > 0) {
      scrollToBottom("smooth");
    }
  }, [streamedResults]);

  // Checks if the current conversation has an ongoing query
  // Edge case: if there are two or more ongoing queries in different conversations, the variable below
  // will only be true for the last query - but the others will still take effect
  // e.g. if the user queries, jumps to another conv, queries there, jumps back.
  const currentConversationIsQuerying =
    isStreamingResults &&
    newMessageVariable.conversationId === currConversation?.id;

  if (isPendingGetMessages) {
    return (
      <div className="w-full h-screen flex gap-2 justify-center items-center text-white">
        <Spinner />
        Loading...
      </div>
    );
  }

  if (
    (isAxiosError(getMessagesError) &&
      getMessagesError.response?.status === 404) ||
    !connectionsData?.connections?.length
  ) {
    return <Navigate to={"/"} />;
  }

  if (!isSuccessGetMessages) {
    return (
      <div className="w-full h-screen flex justify-center items-center text-white">
        Something went wrong!
      </div>
    );
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
          {currentConversationIsQuerying && (
            <>
              <Message
                message={{
                  message: {
                    content: newMessageVariable?.message || "",
                    role: "human",
                    id: generateUUID(),
                  },
                }}
                className="dark:text-gray-400"
              />
              <Message
                key={new Date().toJSON()}
                streaming={true}
                message={{
                  message: {
                    content: "Generating results...",
                    role: "ai",
                    id: generateUUID(),
                  },
                  results: streamedResults,
                }}
                className="animate-pulse"
              />
            </>
          )}
        </div>
      </Transition>

      <div ref={messageListRef}></div>

      <div className="fixed bottom-0 left-0 lg:left-72 right-0 flex flex-col items-center justify-center backdrop-blur-md pt-0">
        {messages.length === 0 && !currentConversationIsQuerying && (
          <div className="w-full md:max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-2 justify-between px-2 sm:px-3 my-4">
            {templateMessages.map((template) => (
              <MessageTemplate
                key={template.title}
                title={template.title}
                text={template.text}
                onClick={() => {
                  sendMessageMutation({
                    message: template.message,
                    conversationId: params.conversationId ?? "",
                  });
                  expandingInputRef.current?.focus();
                }}
              />
            ))}
          </div>
        )}
        <div className="w-full md:max-w-3xl flex flex-col justify-center items-center pb-4 ml-2 mr-2 mb-2 pl-2 pr-2">
          <ExpandingInput
            onSubmit={(message: string) => {
              sendMessageMutation({
                message,
                conversationId: params.conversationId ?? "",
              });
              expandingInputRef.current?.focus();
            }}
            disabled={currentConversationIsQuerying}
            ref={expandingInputRef}
          />
          <p className="text-gray-400 text-sm">
            Current Connection: {currConnection?.name}
          </p>
        </div>
      </div>
    </div>
  );
};
