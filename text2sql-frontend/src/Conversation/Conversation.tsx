import { useEffect, useState, useRef } from "react";
import { api } from "../api";
import { Message } from "./Message";
import { IConnection, IMessageWithResults } from "./types";
import { useConversation } from "../Providers/ConversationProvider";
import { useConnectionList } from "../Providers/ConnectionListProvider";
import ExpandingInput from "./ExpandingInput";
import DatabaseDialectImage from "./DatabaseDialectImage";
import { Transition } from "@headlessui/react";
import { useConversationList } from "../Providers/ConversationListProvider";

function generateUUID() {
  // Public Domain/MIT
  var d = new Date().getTime(); //Timestamp
  var d2 =
    (typeof performance !== "undefined" &&
      performance.now &&
      performance.now() * 1000) ||
    0; //Time in microseconds since page-load or 0 if unsupported
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = Math.random() * 16; //random number between 0 and 16
    if (d > 0) {
      //Use timestamp until depleted
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      //Use microseconds since page-load if supported
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const Conversation = () => {
  // Load messages from conversation via API on load
  const [messages, setMessages] = useState<IMessageWithResults[]>([]);
  const [connections, setConnections] = useConnectionList();
  const [conversations, setConversations, fetchConversations] =
    useConversationList();
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

    // Get API response
    (async () => {
      const res = await api.query(conversation.id, value, true);
      if (res.status !== "ok") {
        alert("Error querying database");
        return;
      }
      const message = res.message;
      setMessages((prevMessages) => [...prevMessages, message]);
    })();
  }

  function selectConnection(connection: IConnection) {
    // Create a new conversation with the selected connection
    const createConversation = async () => {
      let createdConversation = await api.createConversation(
        connection.session_id,
        "Untitled chat"
      );

      if (createdConversation.status !== "ok") {
        alert("Error creating conversation");
        return;
      }

      // and set it as the current conversation
      setConversation({
        id: createdConversation.conversation_id,
        name: "Untitled chat",
      });
    };
    createConversation().then(() => {
      fetchConversations();
    });
  }

  function createNewConnection() {}

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
        <div className="flex flex-col justify-center items-center h-full">
          <div className="bg-gray-700 border-2 border-gray-500 w-3/4 xl:w-1/2 rounded-xl p-6">
            <div className="text-gray-50 text-2xl font-semibold">
              Select a connection
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {connections?.map((connection) => (
                <div
                  key={connection.session_id}
                  className="hover:cursor-pointer md:hover:ring-4 ring-gray-500 border border-gray-500 aspect-square overflow-hidden rounded-lg flex flex-col justify-between hover:bg-gray-600 transition-all duration-75"
                  onClick={() => selectConnection(connection)}
                >
                  <div className="hidden md:flex overflow-hidden w-full justify-center items-center md:mt-4">
                    <DatabaseDialectImage
                      databaseDialect={connection.dialect}
                    />
                  </div>
                  <div className="h-full lg:h-fit text-gray-50 mx-auto mb-2 lg:mx-6 lg:-mt-2 flex flex-col justify-center md:items-start">
                    <div className="text-xs md:text-sm lg:text-md font-normal text-gray-400">
                      {connection.dialect.charAt(0).toUpperCase() +
                        connection.dialect.slice(1)}
                    </div>
                    <div className="text-xs md:text-lg lg:text-lg font-normal md:-mt-1">
                      {connection.name}
                    </div>
                  </div>
                </div>
              ))}
              <div
                className="hover:cursor-pointer md:hover:ring-4 ring-gray-500 border border-gray-500 aspect-square overflow-hidden rounded-lg flex flex-col justify-between hover:bg-gray-600 transition-all duration-75"
                onClick={createNewConnection}
              >
                {/* Item to add new connection */}
                <div className="hidden md:flex overflow-hidden w-full justify-center items-center md:mt-4">
                  <svg
                    className="h-3/4 lg:h-2/3 my-auto w-full text-gray-200"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m0-4c0 4.418-7.163 8-16 8S8 28.418 8 24m32 10v6m0 0v6m0-6h6m-6 0h-6"
                    />
                  </svg>
                </div>
                <div className="h-full lg:h-fit text-gray-50 mx-auto mb-2 lg:mx-6 lg:-mt-2 flex flex-col justify-center md:items-start">
                  <div className="text-xs md:text-sm lg:text-md font-normal text-gray-400">
                    Add
                  </div>
                  <div className="text-xs md:text-lg lg:text-lg font-normal md:-mt-1 overflow-ellipsis whitespace-nowrap">
                    New connection
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
