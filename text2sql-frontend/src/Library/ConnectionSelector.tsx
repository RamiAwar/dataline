import { useConnectionList } from "../Providers/ConnectionListProvider";
import NewConnectionModal from "../Connection/NewConnectionModal";
import { api } from "../api";
import DatabaseDialectImage from "./DatabaseDialectImage";
import { useEffect, useState, useRef } from "react";
import { IConnection, IMessageWithResults } from "./types";
import { useConversationList } from "../Providers/ConversationListProvider";
import { useConversation } from "../Providers/ConversationProvider";

export const ConnectionSelector = () => {
  const [conversation, setConversation] = useConversation();
  const [connections, setConnections, fetchConnections] = useConnectionList();
  const [conversations, setConversations, fetchConversations] =
    useConversationList();
  const [isNewConnectionModalOpen, setIsNewConnectionModalOpen] =
    useState(false);
  const openNewConnectionModal = () => {
    setIsNewConnectionModalOpen(true);
  };

  const closeNewConnectionModal = () => {
    setIsNewConnectionModalOpen(false);
    // Refresh connections
    fetchConnections();
  };

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

  return (
    <div className="flex flex-col justify-center items-center h-full">
      <div className="bg-gray-700 border-2 border-gray-500 w-3/4 xl:w-1/2 rounded-xl p-6">
        <div className="text-gray-50 text-md md:text-2xl font-semibold">
          Select a connection
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
          {connections?.map((connection) => (
            <div
              key={connection.session_id}
              className="hover:cursor-pointer md:hover:ring-4 ring-gray-500 border border-gray-500 aspect-square overflow-hidden rounded-lg flex flex-col justify-between hover:bg-gray-600 transition-all duration-75"
              onClick={() => selectConnection(connection)}
            >
              <div className="hidden sm:flex overflow-hidden w-full justify-center items-center sm:mt-4">
                <DatabaseDialectImage databaseDialect={connection.dialect} />
              </div>
              <div className="h-full lg:h-fit text-gray-50 mx-auto mb-2 lg:mx-6 lg:-mt-2 flex flex-col justify-center md:items-start">
                <div className="text-xs md:text-sm xxl:text-md font-normal text-gray-400">
                  {connection.dialect.charAt(0).toUpperCase() +
                    connection.dialect.slice(1)}
                </div>
                <div className="text-base md:text-base xxl:text-xl font-normal md:-mt-1">
                  {connection.name}
                </div>
              </div>
            </div>
          ))}
          <NewConnectionModal
            isOpen={isNewConnectionModalOpen}
            onClose={closeNewConnectionModal}
          />
          <div
            className="hover:cursor-pointer md:hover:ring-4 ring-gray-500 border border-gray-500 aspect-square overflow-hidden rounded-lg flex flex-col justify-between hover:bg-gray-600 transition-all duration-75"
            onClick={openNewConnectionModal}
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
              <div className="text-xs md:text-sm xxl:text-md font-normal text-gray-400">
                Add
              </div>
              <div className="text-base md:text-base xxl:text-xl font-medium md:-mt-1 overflow-ellipsis whitespace-nowrap">
                New Connection
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
