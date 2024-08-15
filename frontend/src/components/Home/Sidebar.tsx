import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogPanel,
  Transition as HeadlessTransition,
  TransitionChild as HeadlessTransitionChild,
} from "@headlessui/react";
import {
  Bars3Icon,
  PlusIcon,
  ChatBubbleOvalLeftIcon,
  XMarkIcon,
  TrashIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import logo from "@/assets/images/logo_md.png";
import { PencilSquareIcon } from "@heroicons/react/20/solid";
import { Link, useParams } from "@tanstack/react-router";
import { ProfileDropdown } from "@components/Home/ProfileDropdown";
import { useNavigate } from "@tanstack/react-router";
import {
  useDeleteConversation,
  useGetConnections,
  useGetConversations,
  useUpdateConversation,
} from "@/hooks";
import {
  IConversation,
  IConnection,
  IConversationWithMessagesWithResultsOut,
} from "@components/Library/types";

const LShapedChar = (
  <svg
    width="9"
    height="8"
    viewBox="0 0 9 8"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M1 0V4C1 5.65685 2.34315 7 4 7H9"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const Sidebar = () => {
  const params = useParams({ strict: false });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: conversationsData } = useGetConversations();
  const { data: connectionsData } = useGetConnections();
  const { mutate: deleteConversation } = useDeleteConversation({
    onSuccess() {
      navigate({ to: "/" });
    },
  });

  const conversations = useMemo<
    (IConversationWithMessagesWithResultsOut & {
      connection?: IConnection;
    })[]
  >(() => {
    if (conversationsData && connectionsData?.connections) {
      return conversationsData?.map((convo) => ({
        ...convo,
        connection: connectionsData.connections.find(
          (conn) => conn.id === convo.connection_id
        ),
      }));
    }
    return [];
  }, [conversationsData, connectionsData?.connections]);

  const [currentConversation, setCurrentConversation] =
    useState<IConversation | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(currentConversation?.name || "");
  const navigate = useNavigate();
  const { mutate: updateConversation } = useUpdateConversation({
    onSuccess() {
      // @ts-expect-error, this is not typed
      setCurrentConversation({
        ...(currentConversation ?? {}),
        name: editedName,
      });
    },
  });

  const handleEditClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(event.target.value);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent form submission on Enter
      handleSaveClick();
    } else if (event.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleSaveClick = () => {
    // Should never be null, only editable if not null
    if (!currentConversation?.id) return;
    updateConversation({ id: currentConversation.id, name: editedName });
    setIsEditing(false);
  };

  useEffect(() => {
    // TODO - revist this logic
    // Update current conversation when we get the list of conversations
    if (conversations.length > 0) {
      if (params.conversationId) {
        const conversation = conversations.find(
          (c) => c.id === params.conversationId
        );
        if (conversation) {
          setCurrentConversation({
            id: conversation.id,
            name: conversation.name,
          });

          // Update edited name when conversation changes
          setEditedName(conversation.name || "");
        }
      } else {
        setCurrentConversation(null);
      }
    }
  }, [conversations, params]);

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  return (
    // Sidebar component, swap this element with another sidebar if you like
    <div>
      <HeadlessTransition show={sidebarOpen}>
        <Dialog
          as="div"
          className="relative z-50 lg:hidden"
          onClose={setSidebarOpen}
        >
          <HeadlessTransitionChild
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </HeadlessTransitionChild>

          <div className="fixed inset-0 flex">
            <HeadlessTransitionChild
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <DialogPanel className="relative mr-16 flex w-full max-w-xs flex-1">
                <HeadlessTransitionChild
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button
                      type="button"
                      className="-m-2.5 p-2.5"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon
                        className="h-6 w-6 text-white"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </HeadlessTransitionChild>

                {/* Hideable sidebar for small screens */}
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-2 ring-1 ring-white/10">
                  <div className="flex h-16 shrink-0 items-center">
                    <img className="h-8 w-auto" src={logo} alt="DataLine" />
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-1">
                          <Link
                            to="/"
                            className="py-3 px-2 rounded-md flex justify-start items-center border border-gray-600 text-gray-200 hover:bg-gray-800 transition-all duration-150 cursor-pointer"
                          >
                            <PlusIcon className="h-5 w-5 shrink-0 mr-2 [&>path]:stroke-[1]"></PlusIcon>
                            <div>New chat</div>
                          </Link>
                          {conversations.map((conversation) => (
                            <li key={conversation.id}>
                              <Link
                                to={`/chat/${conversation.id}`}
                                onClick={() => {
                                  setIsEditing(false);
                                  setSidebarOpen(false);
                                }}
                                className={classNames(
                                  conversation.id === currentConversation?.id
                                    ? "bg-gray-700 text-white"
                                    : "text-gray-400 hover:text-white hover:bg-gray-800",
                                  "group flex gap-x-3 rounded-md px-3 py-2 text-md leading-6 items-center text-md transition-all duration-150 cursor-pointer mt-2"
                                )}
                              >
                                <ChatBubbleOvalLeftIcon
                                  className="h-5 w-5 shrink-0"
                                  aria-hidden="true"
                                />
                                <div className="flex-1 flex flex-col overflow-hidden">
                                  <span className="text-ellipsis overflow-hidden whitespace-nowrap">
                                    {conversation.name}
                                  </span>
                                  {conversation.connection && (
                                    <div
                                      className={classNames(
                                        conversation.id ===
                                          currentConversation?.id
                                          ? "text-gray-400"
                                          : "text-gray-500",
                                        "pl-1 flex flex-row items-center gap-1"
                                      )}
                                    >
                                      <div className="pb-px">{LShapedChar}</div>
                                      <span className="text-xs text-ellipsis overflow-hidden whitespace-nowrap">
                                        {conversation.connection.name}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <TrashIcon
                                  className="h-5 w-5 shrink-0 cursor-pointer"
                                  onClick={() =>
                                    deleteConversation(conversation.id)
                                  }
                                ></TrashIcon>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>

                      <li>
                        <hr className="border-gray-800 -mt-2 mb-4" />
                      </li>
                    </ul>
                  </nav>
                </div>
              </DialogPanel>
            </HeadlessTransitionChild>
          </div>
        </Dialog>
      </HeadlessTransition>

      {/* BIG SCREENS */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col border-r border-gray-600">
        {/* Dataline logo */}
        <Link to="/" className="flex h-16 shrink-0 items-center px-6">
          <img className="h-8 w-auto" src={logo} alt="DataLine" />
        </Link>
        {/* New chat button */}
        <Link
          to="/"
          className="mt-9 mb-4 mx-2 py-3 px-2 rounded-md flex justify-start items-center border border-gray-600 text-gray-200 hover:bg-gray-800 transition-all duration-150 cursor-pointer"
        >
          <PlusIcon className="h-5 w-5 shrink-0 mr-2 [&>path]:stroke-[1]"></PlusIcon>
          <div>New chat</div>
        </Link>
        {/* Chat list, flex-1 to take as much space as possible */}
        <nav className="flex flex-1 flex-col gap-y-4 mx-2 overflow-auto">
          <div className="overflow-y-auto">
            <ul role="list" className="space-y-1">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  {!isEditing ? (
                    <Link
                      to={`/chat/${conversation.id}`}
                      onClick={(e) =>
                        conversation.id === params.conversationId &&
                        e.preventDefault()
                      }
                      className={classNames(
                        conversation.id === params.conversationId
                          ? "bg-gray-700 text-white"
                          : "text-gray-400 hover:text-white hover:bg-gray-800",
                        "group flex gap-x-3 rounded-md px-3 py-2 text-md leading-6 items-center text-md transition-all duration-150 cursor-pointer"
                      )}
                    >
                      <ChatBubbleOvalLeftIcon
                        className="h-5 w-5 shrink-0"
                        aria-hidden="true"
                      />
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-ellipsis overflow-hidden whitespace-nowrap">
                          {conversation.name}
                        </span>
                        {conversation.connection && (
                          <div
                            className={classNames(
                              conversation.id === params.conversationId
                                ? "text-gray-400"
                                : "text-gray-500",
                              "pl-1 flex flex-row items-center gap-1"
                            )}
                          >
                            <div className="pb-px">{LShapedChar}</div>
                            <span className="text-xs text-ellipsis overflow-hidden whitespace-nowrap">
                              {conversation.connection.name}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Show edit button when not editing and chat selected */}
                      {conversation.id === params.conversationId && (
                        <div
                          className={classNames(
                            "flex justify-end items-center grow gap-1"
                          )}
                        >
                          <div
                            onClick={handleEditClick}
                            className="transition-colors duration-150 cursor-pointer rounded-md hover:text-white hover:bg-gray-700 text-gray-300"
                          >
                            <PencilSquareIcon className="w-5 h-5" />
                          </div>
                          <TrashIcon
                            className="h-5 w-5 shrink-0 cursor-pointer"
                            onClick={() => deleteConversation(conversation.id)}
                          ></TrashIcon>
                        </div>
                      )}
                    </Link>
                  ) : (
                    <div
                      className={classNames(
                        conversation.id === params.conversationId
                          ? "bg-gray-700 text-white"
                          : "text-gray-400 hover:text-white hover:bg-gray-800",
                        "group flex gap-x-3 rounded-md px-3 py-2 text-md leading-6 items-center text-md transition-all duration-150 cursor-pointer"
                      )}
                    >
                      <ChatBubbleOvalLeftIcon
                        className="h-5 w-5 shrink-0"
                        aria-hidden="true"
                      />

                      {/* Show input field when editing and chat selected */}
                      {conversation.id === params.conversationId ? (
                        <input
                          type="text"
                          value={editedName}
                          onChange={handleNameChange}
                          onKeyDown={handleKeyPress}
                          onBlur={handleSaveClick}
                          autoFocus
                          className="flex-none max-w-[70%] h-6 text-md font-medium leading-6 text-white bg-gray-800 focus:outline-none outline-none border-none ring-gray-300 pl-1"
                        />
                      ) : (
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-ellipsis overflow-hidden whitespace-nowrap">
                            {conversation.name}
                          </span>
                          {conversation.connection && (
                            <div className="pl-1 flex flex-row items-center gap-1 text-gray-500">
                              <div className="pb-px">{LShapedChar}</div>
                              <span className="text-xs text-ellipsis overflow-hidden whitespace-nowrap">
                                {conversation.connection.name}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Show check icon when editing to save */}
                      {conversation.id === params.conversationId && (
                        <div
                          onClick={handleSaveClick}
                          className="transition-colors duration-150 cursor-pointer rounded-md hover:text-white hover:bg-gray-700 text-gray-300"
                        >
                          <CheckIcon className="w-5 h-5 [&>path]:stroke-[2]" />
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          {/* Section for saved queries and dashboards */}
          {/* <ul role="list" className="-mx-4 space-y-1">
                <li key="saved-queries">
                  <Link
                    to="/queries"
                    className="group flex gap-x-3 rounded-md p-3 text-md leading-6 items-center text-md transition-all duration-150 cursor-pointer text-gray-400 hover:text-white hover:bg-gray-800"
                  >
                    <BookmarkIcon
                      className="h-5 w-5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-ellipsis overflow-hidden whitespace-nowrap">
                      Saved queries
                    </span>
                  </Link>
                </li>
                <li key="dashboards" className="-mx-4 space-y-1">
                  <div className="text-gray-400 hover:text-white hover:bg-gray-800 group flex gap-x-3 rounded-md px-3 py-2 text-md leading-6 items-center text-md transition-all duration-150 cursor-pointer">
                    <ChartBarSquareIcon
                      className="h-5 w-5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-ellipsis overflow-hidden whitespace-nowrap">
                      Dashboards
                    </span>
                  </div>
                </li>
              </ul> */}
        </nav>
        {/* Separator */}
        <hr className="border-gray-800 mt-1 mx-6" />
        {/* User Settings */}
        <div className="flex items-center px-2 gap-x-4 py-4 text-md font-medium leading-6 text-white">
          <ProfileDropdown />
        </div>
      </div>

      {/* SMALL SCREENS */}
      <div className="fixed w-full h-16 top-0 z-40 flex items-center justify-between gap-x-6 px-4 py-4 shadow-sm sm:px-6 lg:hidden backdrop-filter backdrop-blur-lg">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-white lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon
            className="h-6 w-6 [&>path]:stroke-[2]"
            aria-hidden="true"
          />
        </button>
        {isEditing && params.conversationId !== undefined ? (
          <div className="flex-1 inline-flex justify-center items-center gap-3 text-center text-md font-medium leading-6 text-white">
            <input
              type="text"
              value={editedName}
              onChange={handleNameChange}
              onKeyDown={handleKeyPress}
              autoFocus
              onBlur={handleSaveClick}
              className="text-md font-medium leading-6 text-white bg-transparent border-b-2 border-white"
            />
          </div>
        ) : (
          params.conversationId !== undefined && (
            <div className="flex-1 inline-flex justify-center items-center gap-3 text-center text-md font-medium leading-6 text-white">
              {editedName || "New chat"}

              {!isEditing && (
                <div
                  onClick={handleEditClick}
                  className=" transition-colors duration-150 cursor-pointer p-1 rounded-md hover:text-white hover:bg-gray-700 text-gray-300"
                >
                  <PencilSquareIcon className="w-5 h-5 " />
                </div>
              )}
            </div>
          )
        )}

        <ProfileDropdown topRight={true} />
      </div>
    </div>
  );
};
