import { useEffect, useState } from "react";
import { api } from "../api";
import { Message } from "./Message";
import { IConnection, IMessageWithResults } from "./types";
import { useConversation } from "../Providers/ConversationProvider";
import { useConnectionList } from "../Providers/ConnectionListProvider";
import ExpandingInput from "./ExpandingInput";
import DatabaseDialectImage from "./DatabaseDialectImage";
import { PlusIcon } from "@heroicons/react/20/solid";

export const Conversation = () => {
  // Load messages from conversation via API on load
  const [messages, setMessages] = useState<IMessageWithResults[]>([]);
  const [connections, setConnections] = useConnectionList();

  const [conversation, setConversation] = useConversation();

  function submitQuery(value: string) {
    // Check if a current conversation is selected
    if (conversation === null) {
      alert("Please select a connection first");
      return;
    }
  }

  function selectConnection(connection: IConnection) {
    // Create a new conversation with the selected connection
    const createConversation = async () => {
      let createdConversation = await api.createConversation(
        connection.session_id,
        "Untitled chat"
      );
      // and set it as the current conversation
      setConversation({
        id: createdConversation.conversation_id,
        name: "Untitled chat",
      });
    };
    createConversation();
  }

  useEffect(() => {
    const loadMessages = async () => {
      if (!conversation) return;
      const messages = await api.getMessages(conversation.id);
      setMessages(messages.messages);
    };
    loadMessages();
  }, [conversation]);

  return (
    <div className="bg-gray-900 w-full flex flex-col h-full relative">
      {conversation === null && (
        <div className="flex flex-col justify-center items-center h-full">
          <div className="bg-gray-700 border-2 border-gray-500 w-3/4 xl:w-1/2 rounded-xl p-6">
            <div className="text-gray-50 text-2xl font-semibold">
              Select a connection
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {connections?.map((connection) => (
                <div
                  key={connection.session_id}
                  className="hover:cursor-pointer md:hover:ring-4 ring-gray-500 border border-gray-500 aspect-square overflow-hidden rounded-lg flex flex-col justify-between hover:bg-gray-600 transition-all duration-200"
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
              <div className="hover:cursor-pointer md:hover:ring-4 ring-gray-500 border border-gray-500 aspect-square overflow-hidden rounded-lg flex flex-col justify-between hover:bg-gray-600 transition-all duration-200">
                {/* Item to add new connection */}
                <div className="text-gray-50 h-full mx-auto mb-2 lg:mx-6 lg:-mt-2 flex flex-col justify-center md:items-start">
                  <div className="text-xs md:text-sm lg:text-md font-normal text-gray-400">
                    Add New Connection
                  </div>
                  <div className="text-2xl md:text-xl font-normal md:-mt-1">
                    <PlusIcon className="h-10 w-10 [&>path]:stroke-[20] " />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {conversation !== null && (
        <div className="overflow-y-scroll pb-36">
          {messages.map((message) => (
            <div>
              <Message
                key={message.message_id}
                message_id={message.message_id}
                content={message.content}
                role={message.role}
                results={message.results}
              ></Message>
              <Message
                key={message.message_id}
                message_id={message.message_id}
                content={message.content}
                role={message.role}
                results={message.results}
              ></Message>
              <Message
                key={message.message_id}
                message_id={message.message_id}
                content={message.content}
                role={message.role}
                results={message.results}
              ></Message>
              <Message
                key={message.message_id}
                message_id={message.message_id}
                content={message.content}
                role={message.role}
                results={message.results}
              ></Message>
              <Message
                key={message.message_id}
                message_id={message.message_id}
                content={message.content}
                role={message.role}
                results={message.results}
              ></Message>
            </div>
          ))}
        </div>
      )}

      <div className="absolute w-full bottom-0 left-0 flex justify-center bg-gradient-to-t from-gray-900 from-30% to-transparent pt-2">
        <div className="w-full md:max-w-3xl flex justify-center pt-6 lg:pb-4 m-2">
          <ExpandingInput
            onSubmit={submitQuery}
            disabled={conversation === null}
          ></ExpandingInput>
        </div>
      </div>
    </div>
  );
};
