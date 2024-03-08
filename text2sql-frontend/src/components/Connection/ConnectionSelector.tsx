import { useConnectionList } from "../Providers/ConnectionListProvider";
import NewConnectionModal from "../Connection/NewConnectionModal";
import { api } from "../../api";
import DatabaseDialectImage from "./DatabaseDialectImage";
import { useState } from "react";
import { IConnection, IConversation } from "../Library/types";
import { useConversationList } from "../Providers/ConversationListProvider";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { Link, useNavigate, useParams } from "react-router-dom";

export const ConnectionSelector = () => {
  let navigate = useNavigate();
  const params = useParams<{ conversationId: string }>();
  const [conversation, setConversation] = useState<IConversation | null>();
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
    console.log("Selected: ", connection);
    const createConversation = async () => {
      let createdConversation = await api.createConversation(
        connection.id,
        "Untitled chat"
      );

      if (createdConversation.status !== "ok") {
        alert("Error creating conversation");
        return;
      }

      // and set it as the current conversation
      setConversation({
        id: createdConversation.data.conversation_id,
        name: "Untitled chat",
      });

      // fetch conversations and navigate to new conversation
      fetchConversations();
      navigate(`/chat/${createdConversation.data.conversation_id}`);
    };

    createConversation();
  }

  return (
    <div className="bg-gray-900 w-full h-screen relative flex flex-col sm:-mt-16 lg:mt-0 sm:justify-center">
      <div className="flex flex-col justify-center items-center lg:mt-0">
        <div className="w-full sm:w-1/2 md:w-3/4 rounded-xl p-6">
          <div className="text-gray-50 text-md md:text-2xl font-semibold">
            Select a connection
          </div>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 mt-4">
            {connections?.map((connection) => (
              <div
                key={connection.id}
                className="hover:cursor-pointer md:hover:ring-2 ring-gray-600 border border-gray-700 aspect-square overflow-hidden rounded-lg flex flex-col justify-between hover:bg-gray-700 transition-all duration-75"
                onClick={() => selectConnection(connection)}
              >
                <div className="hidden sm:flex overflow-hidden w-full justify-center items-center sm:mt-4">
                  <DatabaseDialectImage databaseDialect={connection.dialect} />
                </div>
                <div className="h-full flex justify-center items-center gap-6 text-gray-50 px-4 pb-2">
                  <div className="flex-initial h-full lg:h-fit flex flex-col justify-center md:items-start">
                    <div className="text-xs md:text-sm xxl:text-md font-normal text-gray-400">
                      {connection.dialect.charAt(0).toUpperCase() +
                        connection.dialect.slice(1)}
                    </div>
                    <div className="text-base md:text-base xxl:text-xl font-normal md:-mt-1">
                      {connection.name}
                    </div>
                  </div>

                  {/** ------ Connection Settings ------ */}
                  <Link
                    to={`/connection/${connection.id}`}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent the click event from propagating to the parent container
                    }}
                    className="flex-none group w-10 h-10 p-1 flex justify-center items-center hover:bg-gray-600 rounded-md duration-100 transition-colors"
                  >
                    <Cog6ToothIcon className="text-gray-50 group-hover:-rotate-45 transition-transform duration-100" />
                  </Link>
                </div>
              </div>
            ))}
            <NewConnectionModal
              isOpen={isNewConnectionModalOpen}
              onClose={closeNewConnectionModal}
            />
            <div
              className="hover:cursor-pointer md:hover:ring-2 ring-gray-600 border border-gray-700 aspect-square overflow-hidden rounded-lg flex flex-col justify-between hover:bg-gray-700 transition-all duration-75"
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
    </div>
  );
};
