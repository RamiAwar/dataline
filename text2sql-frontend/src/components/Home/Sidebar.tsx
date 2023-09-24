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
import { IConversation } from "../Library/types";
import { useConversationList } from "../Providers/ConversationListProvider";
import { api } from "../../api";
import { PencilSquareIcon } from "@heroicons/react/20/solid";
import { Link, useParams } from "react-router-dom";
import { ProfileDropdown } from "./ProfileDropdown";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const Sidebar = () => {
  const params = useParams<{ conversationId: string }>();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, _, fetchConversations] = useConversationList();
  const [currentConversation, setCurrentConversation] =
    useState<IConversation | null>();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(currentConversation?.name || "");

  async function deleteConversation(conversationId: string) {
    await api.deleteConversation(conversationId);
    fetchConversations();
  }

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
    if (currentConversation === null || currentConversation === undefined)
      return;

    // Update conversation in backend
    (async () => {
      const res = await api.updateConversation(
        currentConversation.id,
        editedName
      );
      if (res.status !== "ok") {
        alert("Error updating conversation");
        return;
      }
      setCurrentConversation({
        ...currentConversation,
        name: editedName,
      });

      fetchConversations();
    })();
    // message: saving editedName
    console.log("saving", editedName);
    setIsEditing(false);
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
    <div>
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

                {/* Sidebar component, swap this element with another sidebar if you like */}
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
                                onClick={() => setIsEditing(false)}
                                className={classNames(
                                  conversation.conversation_id ==
                                    currentConversation?.id
                                    ? "bg-gray-700 text-white"
                                    : "text-gray-400 hover:text-white hover:bg-gray-800",
                                  "group flex gap-x-3 rounded-md p-3 text-md leading-6 items-center text-md transition-all duration-150 cursor-pointer"
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
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col border-r-2 border-gray-600">
        {/* Sidebar component, swap this element with another sidebar if you like */}
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6">
          <div className="flex h-16 shrink-0 items-center">
            <img className="h-8 w-auto" src={logo} alt="DataLine" />
          </div>
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
                      {!isEditing ? (
                        <Link
                          to={`/chat/${chat.conversation_id}`}
                          onClick={(e) =>
                            chat.conversation_id === params.conversationId &&
                            e.preventDefault()
                          }
                          className={classNames(
                            chat.conversation_id == params.conversationId
                              ? "bg-gray-700 text-white"
                              : "text-gray-400 hover:text-white hover:bg-gray-800",
                            "group flex gap-x-3 rounded-md p-3 text-md leading-6 items-center text-md transition-all duration-150 cursor-pointer"
                          )}
                        >
                          <ChatBubbleOvalLeftIcon
                            className="h-5 w-5 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="text-ellipsis overflow-hidden whitespace-nowrap">
                            {chat.name}
                          </span>
                          {/* Show edit button when not editing and chat selected */}
                          {chat.conversation_id == params.conversationId && (
                            <div
                              className={classNames(
                                "flex justify-end items-center grow"
                              )}
                            >
                              <div
                                onClick={handleEditClick}
                                className="transition-colors duration-150 cursor-pointer p-1 rounded-md hover:text-white hover:bg-gray-700 text-gray-300"
                              >
                                <PencilSquareIcon className="w-5 h-5" />
                              </div>
                              <TrashIcon
                                className="h-5 w-5 shrink-0 cursor-pointer"
                                onClick={() =>
                                  deleteConversation(chat.conversation_id)
                                }
                              ></TrashIcon>
                            </div>
                          )}
                        </Link>
                      ) : (
                        <div
                          className={classNames(
                            chat.conversation_id == params.conversationId
                              ? "bg-gray-700 text-white"
                              : "text-gray-400 hover:text-white hover:bg-gray-800",
                            "group flex gap-x-3 rounded-md p-3 text-md leading-6 items-center text-md transition-all duration-150 cursor-pointer"
                          )}
                        >
                          <ChatBubbleOvalLeftIcon
                            className="h-5 w-5 shrink-0"
                            aria-hidden="true"
                          />

                          {/* Show input field when editing and chat selected */}
                          {chat.conversation_id == params.conversationId ? (
                            <input
                              type="text"
                              value={editedName}
                              onChange={handleNameChange}
                              onKeyDown={handleKeyPress}
                              onBlur={handleSaveClick}
                              autoFocus
                              className="flex-none max-w-[70%] text-md font-medium leading-6 text-white bg-gray-800 focus:outline-none outline-none border-none ring-slate-300"
                            />
                          ) : (
                            <span className="text-ellipsis overflow-hidden whitespace-nowrap">
                              {chat.name}
                            </span>
                          )}

                          {/* Show check icon when editing to save */}
                          {chat.conversation_id == params.conversationId && (
                            <div
                              onClick={handleSaveClick}
                              className="transition-colors duration-150 cursor-pointer p-1 rounded-md hover:text-white hover:bg-gray-700 text-gray-300"
                            >
                              <CheckIcon className="w-5 h-5 [&>path]:stroke-[2]" />
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
              <hr className="border-gray-600 my-2" />
              {/* Section for saved queries and dashboards */}
              <ul>
                <div className="h-6 text-gray-500 text-sm font-medium font-['Inter'] tracking-tight mb-2">
                  Saved
                </div>
                <li key="saved-queries" className="-mx-4 space-y-1">
                  <div className="text-gray-400 hover:text-white hover:bg-gray-800 group flex gap-x-3 rounded-md px-3 py-2 text-md leading-6 items-center text-md transition-all duration-150 cursor-pointer">
                    <BookmarkIcon
                      className="h-5 w-5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-ellipsis overflow-hidden whitespace-nowrap">
                      Saved queries
                    </span>
                  </div>
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
              </ul>
              <li className="-mx-6 mt-auto">
                <div className="flex items-center gap-x-4 px-4 py-4 text-md font-medium leading-6 text-white cursor-pointer">
                  <ProfileDropdown topRight={true}></ProfileDropdown>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

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

        <ProfileDropdown topRight={false}></ProfileDropdown>
      </div>
    </div>
  );
};
