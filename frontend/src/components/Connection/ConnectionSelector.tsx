import ConnectionImage from "./DatabaseDialectImage";
import { useState } from "react";
import { IConnection, IConversation } from "../Library/types";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { useCreateConversation, useGetConnections } from "@/hooks";
import { Link, useNavigate } from "@tanstack/react-router";

export const ConnectionSelector = () => {
  const navigate = useNavigate();
  const [, setConversation] = useState<IConversation | null>();
  const { data } = useGetConnections();
  const createConnection = () => {
    navigate({ to: "/connection/new" });
  };

  const { mutate } = useCreateConversation({
    onSuccess(resp) {
      setConversation({
        id: resp.data.id,
        name: "Untitled chat",
      });
      navigate({
        to: "/chat/$conversationId",
        params: { conversationId: resp.data.id },
      });
    },
  });

  function selectConnection(connection: IConnection) {
    mutate({ id: connection.id, name: "Untitled chat" });
  }

  return (
    <div className="bg-gray-900 w-full h-screen relative flex flex-col sm:-mt-16 lg:mt-0 sm:justify-center">
      <div className="flex flex-col justify-center items-center lg:mt-0">
        <div className="w-full sm:w-3/4 md:w-3/4 rounded-xl p-6">
          <div className="text-gray-50 text-md md:text-2xl font-semibold">
            Select a connection
          </div>
          <div className="w-full grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 mt-4">
            {data?.connections?.map((connection) => (
              <div
                key={connection.id}
                className="hover:cursor-pointer md:hover:ring-2 ring-gray-600 border px-2 py-2 border-gray-700 aspect-square overflow-hidden rounded-lg flex flex-col justify-between hover:bg-gray-700 transition-all duration-75 w-auto max-w-xs"
                onClick={() => selectConnection(connection)}
              >
                <div className="flex overflow-hidden w-full h-full justify-center items-center sm:mt-4">
                  <ConnectionImage
                    databaseDialect={connection.dialect}
                    name={connection.name}
                  />
                </div>
                <div className="w-full flex justify-center items-center gap-2 text-gray-50  sm:-mt-2">
                  <div className="h-full lg:h-fit flex flex-col justify-center md:items-start w-full ">
                    <div className="text-xs md:text-sm xxl:text-md font-normal text-gray-400">
                      {connection.dialect.charAt(0).toUpperCase() +
                        connection.dialect.slice(1)}
                    </div>

                    <div className="text-base leading-tight xxl:text-xl font-normal">
                      {connection.name}
                    </div>
                  </div>

                  {/** ------ Connection Settings ------ */}
                  <div className="flex flex-col justify-end items-end h-full">
                    <Link
                      to={`/connection/${connection.id}`}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent the click event from propagating to the parent container
                      }}
                      className="flex-none group w-10 h-10 p-1 flex justify-end items-end hover:bg-gray-600 rounded-md duration-100 transition-colors "
                    >
                      <Cog6ToothIcon className="text-gray-50 group-hover:-rotate-45 transition-transform duration-100" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            <div
              className="hover:cursor-pointer md:hover:ring-2 ring-gray-600 border px-2 py-2 border-gray-700 aspect-square overflow-hidden rounded-lg flex flex-col justify-between hover:bg-gray-700 transition-all duration-75 w-full sm:w-auto sm:max-w-xs"
              onClick={createConnection}
            >
              {/* Item to add new connection */}
              <div className="flex overflow-hidden w-full justify-center items-center sm:mt-4">
                <svg
                  className="h-full w-full text-gray-200"
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
              <div className="w-full flex justify-center items-center gap-2 text-gray-50  sm:-mt-2 ">
                <div className="h-full lg:h-fit flex flex-col justify-center md:items-start w-full">
                  <div className="text-xs md:text-sm xxl:text-md font-normal text-gray-400">
                    Add
                  </div>
                  <div className="text-base leading-tight xxl:text-xl font-normal">
                    New Connection
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
