import { Fragment, useEffect, useState } from "react";
import { Dialog, Menu, Transition } from "@headlessui/react";
import {
  Bars3Icon,
  BookmarkIcon,
  ChartBarSquareIcon,
  PlusIcon,
  ChatBubbleOvalLeftIcon,
  XMarkIcon,
  TrashIcon,
  CheckIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import logo from "../../assets/images/logo_md.png";
import { IConversation, IConversationResult } from "../Library/types";
import { useConversationList } from "../Providers/ConversationListProvider";
import { api } from "../../api";
import { PencilSquareIcon } from "@heroicons/react/20/solid";
import { Link, useParams } from "react-router-dom";
import { ProfileDropdown } from "./ProfileDropdown";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const ChatLinkButton = ({
  chat,
  isCurrentChat,
  deleteConversation,
  handleSaveClick,
}: {
  chat: IConversationResult;
  isCurrentChat: boolean;
  deleteConversation: () => void;
  handleSaveClick: (newName: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(chat.name);
  useEffect(() => setEditedName(chat.name), [chat]);
  const handleEditClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(event.target.value);
  };
  const handleCancelEdit = () => {
    setEditedName(chat.name);
    setIsEditing(false);
  };
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent form submission on Enter
      handleSaveClick(editedName);
      setIsEditing(false);
    } else if (event.key === "Escape") {
      handleCancelEdit();
    }
  };

  return !isCurrentChat ? (
    <Link
      to={`/chat/${chat.conversation_id}`}
      className={classNames(
        "text-gray-400 hover:text-white hover:bg-gray-800",
        "group flex gap-x-3 rounded-md p-3 text-md leading-6 items-center text-md transition-all duration-150 cursor-pointer"
      )}
    >
      <ChatBubbleOvalLeftIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="text-ellipsis overflow-hidden whitespace-nowrap">
        {chat.name}
      </span>
    </Link>
  ) : isEditing ? (
    <div
      className={classNames(
        "bg-gray-700 text-white",
        "group flex gap-x-3 rounded-md p-3 text-md leading-6 items-center text-md transition-all duration-150 cursor-pointer"
      )}
    >
      <ChatBubbleOvalLeftIcon className="h-5 w-5 shrink-0" aria-hidden="true" />

      {/* Show input field when editing and chat selected */}
      <input
        type="text"
        value={editedName}
        onChange={handleNameChange}
        onKeyDown={handleKeyPress}
        onBlur={() => {
          setIsEditing(false);
          handleSaveClick(editedName);
        }}
        autoFocus
        className="flex-none max-w-[70%] h-6 text-md font-medium leading-6 text-white bg-gray-800 focus:outline-none outline-none border-none ring-slate-300 pl-1"
      />

      {/* Show check icon when editing to save */}
      {isCurrentChat && (
        <div
          onClick={() => handleSaveClick(editedName)}
          className="transition-colors duration-150 cursor-pointer rounded-md hover:text-white hover:bg-gray-700 text-gray-300"
        >
          <CheckIcon className="w-5 h-5 [&>path]:stroke-[2]" />
        </div>
      )}
    </div>
  ) : (
    <div
      className={classNames(
        "bg-gray-700 text-white",
        "group flex gap-x-3 rounded-md p-3 text-md leading-6 items-center text-md transition-all duration-150 cursor-pointer"
      )}
    >
      <ChatBubbleOvalLeftIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="text-ellipsis overflow-hidden whitespace-nowrap">
        {chat.name}
      </span>
      {/* Show edit button when not editing and chat selected */}

      <div className={classNames("flex justify-end items-center grow gap-1")}>
        <div
          onClick={handleEditClick}
          className="transition-colors duration-150 cursor-pointer rounded-md hover:text-white hover:bg-gray-700 text-gray-300"
        >
          <PencilSquareIcon className="w-5 h-5" />
        </div>
        <TrashIcon
          className="h-5 w-5 shrink-0 cursor-pointer"
          onClick={() => deleteConversation()}
        ></TrashIcon>
      </div>
    </div>
  );
};

export const Sidebar = () => {
  const params = useParams<{ conversationId: string }>();

  const [conversations, _, fetchConversations] = useConversationList();
  const [currentConversation, setCurrentConversation] =
    useState<IConversation | null>();

  async function deleteConversation(conversationId: string) {
    await api.deleteConversation(conversationId);
    fetchConversations();
  }

  const handleSaveClick = (newName: string) => {
    // Should never be null, only editable if not null
    if (currentConversation === null || currentConversation === undefined)
      return;

    // Update conversation in backend
    if (currentConversation.name === newName) return;
    (async () => {
      const res = await api.updateConversation(currentConversation.id, newName);
      if (res.status !== "ok") {
        alert("Error updating conversation");
        return;
      }
      setCurrentConversation({
        ...currentConversation,
        name: newName,
      });

      fetchConversations();
    })();
    // TODO: Snackbar yum: saving newName
  };

  useEffect(() => {
    // Update current conversation when we get the list of conversations
    if (conversations.length > 0) {
      if (params.conversationId) {
        const conversation = conversations.find(
          (c) => c.conversation_id === params.conversationId
        );
        if (conversation) {
          setCurrentConversation({
            id: conversation.conversation_id,
            name: conversation.name,
          });

          // Update edited name when conversation changes
          // setEditedName(conversation.name || "");
        }
      } else {
        setCurrentConversation(null);
      }
    }
  }, [conversations, params]);

  return (
    <div>
      {/* Small screen sidebar + Top navbar */}
      <MiniSidebar
        conversations={conversations}
        currentConversation={currentConversation}
        deleteConversation={deleteConversation}
        handleSaveClick={handleSaveClick}
      />
      {/* Static sidebar for large screens */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col border-r-2 border-gray-600">
        {/* Sidebar component, swap this element with another sidebar if you like */}
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6">
          <Link to="/" className="flex h-16 shrink-0 items-center">
            <img className="h-8 w-auto" src={logo} alt="DataLine" />
          </Link>
          <nav className="flex flex-1 flex-col mt-4">
            <ul role="list" className="flex flex-1 flex-col gap-y-4">
              <Link
                to="/chat/new"
                className="-mx-4 py-3 px-2 rounded-md flex justify-start items-center border-2 border-gray-600 text-gray-200 hover:bg-gray-800 transition-all duration-150 cursor-pointer"
              >
                <PlusIcon className="h-5 w-5 shrink-0 mr-2 [&>path]:stroke-[1]"></PlusIcon>
                <div>New chat</div>
              </Link>
              <li>
                <ul role="list" className="-mx-4 space-y-1">
                  {conversations.map((chat) => (
                    <li key={chat.conversation_id}>
                      <ChatLinkButton
                        chat={chat}
                        isCurrentChat={
                          chat.conversation_id === params.conversationId
                        }
                        handleSaveClick={handleSaveClick}
                        deleteConversation={() =>
                          deleteConversation(chat.conversation_id)
                        }
                      />
                    </li>
                  ))}
                </ul>
              </li>
              <hr className="border-gray-800 mt-1" />
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
              <li className="-mx-6 mt-auto">
                <div className="flex items-center gap-x-4 px-4 py-4 text-md font-medium leading-6 text-white cursor-pointer">
                  <ProfileDropdown topRight={true}></ProfileDropdown>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

const MiniSidebar = ({
  conversations,
  currentConversation,
  handleSaveClick,
  deleteConversation,
}: {
  conversations: IConversationResult[];
  currentConversation: IConversation | null | undefined;
  handleSaveClick: (newName: string) => void;
  deleteConversation: (conversationId: string) => void;
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const params = useParams<{ conversationId: string }>();
  const [editedName, setEditedName] = useState(currentConversation?.name || "");

  useEffect(
    () => setEditedName(currentConversation?.name || ""),
    [currentConversation]
  );
  const handleEditClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedName(currentConversation?.name || "");
    setIsEditing(false);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent form submission on Enter
      handleSaveClick(editedName);
      setIsEditing(false);
    } else if (event.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(event.target.value);
  };

  return (
    <>
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50 lg:hidden"
          onClose={setSidebarOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
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
                </Transition.Child>

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
                            to="/chat/new"
                            className="py-3 px-2 rounded-md flex justify-start items-center border-2 border-gray-600 text-gray-200 hover:bg-gray-800 transition-all duration-150 cursor-pointer"
                          >
                            <PlusIcon className="h-5 w-5 shrink-0 mr-2 [&>path]:stroke-[1]"></PlusIcon>
                            <div>New chat</div>
                          </Link>
                          {conversations.map((conversation) => (
                            <li key={conversation.conversation_id}>
                              <Link
                                to={`/chat/${conversation.conversation_id}`}
                                // onClick={() => setIsEditing(false)}
                                className={classNames(
                                  conversation.conversation_id ==
                                    currentConversation?.id
                                    ? "bg-gray-700 text-white"
                                    : "text-gray-400 hover:text-white hover:bg-gray-800",
                                  "group flex gap-x-3 rounded-md p-3 text-md leading-6 items-center text-md transition-all duration-150 cursor-pointer mt-2"
                                )}
                              >
                                <ChatBubbleOvalLeftIcon
                                  className="h-5 w-5 shrink-0"
                                  aria-hidden="true"
                                />
                                <span className="flex-1">
                                  {conversation.name}
                                </span>
                                <TrashIcon
                                  className="h-5 w-5 shrink-0 cursor-pointer"
                                  onClick={() =>
                                    deleteConversation(
                                      conversation.conversation_id
                                    )
                                  }
                                ></TrashIcon>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>

                      <li>
                        <hr className="border-gray-800 -mt-2 mb-4" />
                        {/* Section for saved queries and dashboards */}
                        {/* <ul role="list" className="-mx-2 space-y-1">
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
                        </ul> */}
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
      {/* Top navbar */}
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
              onBlur={() => {
                setIsEditing(false);
                handleSaveClick(editedName);
              }}
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

        <ProfileDropdown topRight={false}></ProfileDropdown>
      </div>
    </>
  );
};
