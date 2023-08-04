import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  Bars3Icon,
  PlusIcon,
  ChatBubbleOvalLeftIcon,
  XMarkIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import logo from "../assets/images/logo_md.png";
import { useConversation } from "../Providers/ConversationProvider";
import { IConversation, IConversationResult } from "../Library/types";
import { useConversationList } from "../Providers/ConversationListProvider";
import { api } from "../api";
import { PencilSquareIcon } from "@heroicons/react/20/solid";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const Sidebar = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, s_, fetchConversations] = useConversationList();
  const [currentConversation, setCurrentConversation] = useConversation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(currentConversation?.name || "");

  function createNewChat() {
    setCurrentConversation(null);
  }

  function selectConversation(conversation: IConversationResult) {
    setCurrentConversation({
      id: conversation.conversation_id,
      name: conversation.name,
    });
  }

  async function deleteConversation(conversationId: string) {
    await api.deleteConversation(conversationId);
    fetchConversations();
  }

  const handleEditClick = () => {
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
    if (currentConversation === null) return;

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

    setIsEditing(false);
  };

  useEffect(() => {
    // Update edited name when conversation changes
    setEditedName(currentConversation?.name || "");
  }, [conversations, currentConversation]);

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
                          {conversations.map((conversation) => (
                            <li key={conversation.conversation_id}>
                              <div
                                onClick={() => {
                                  selectConversation(conversation);
                                }}
                                className={classNames(
                                  conversation.conversation_id ==
                                    currentConversation?.id
                                    ? "bg-gray-800 text-white"
                                    : "text-gray-400 hover:text-white hover:bg-gray-800",
                                  "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                                )}
                              >
                                <ChatBubbleOvalLeftIcon
                                  className="h-5 w-5 shrink-0"
                                  aria-hidden="true"
                                />
                                {conversation.name}
                              </div>
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
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li
                className="-mx-4 py-3 px-2 rounded-md flex justify-start items-center border-2 border-gray-600 text-gray-200 hover:bg-gray-800 transition-all duration-150 cursor-pointer"
                onClick={createNewChat}
              >
                <PlusIcon className="h-5 w-5 shrink-0 mr-2 [&>path]:stroke-[1]"></PlusIcon>
                <div> New chat</div>
              </li>
              <li>
                <ul role="list" className="-mx-4 mt-2 space-y-1">
                  {conversations.map((chat) => (
                    <li key={chat.conversation_id}>
                      <div
                        onClick={() => {
                          selectConversation(chat);
                        }}
                        className={classNames(
                          chat.conversation_id == currentConversation?.id
                            ? "bg-gray-800 text-white"
                            : "text-gray-400 hover:text-white hover:bg-gray-800",
                          "group flex gap-x-3 rounded-md p-3 text-md leading-6 items-center text-md transition-all duration-150 cursor-pointer"
                        )}
                      >
                        <ChatBubbleOvalLeftIcon
                          className="h-5 w-5 shrink-0"
                          aria-hidden="true"
                        />
                        {chat.name}
                        <div
                          className={classNames(
                            chat.conversation_id == currentConversation?.id
                              ? "flex"
                              : "hidden group-hover:flex",
                            "justify-end grow"
                          )}
                        >
                          <TrashIcon
                            className="h-5 w-5 shrink-0 cursor-pointer"
                            onClick={() =>
                              deleteConversation(chat.conversation_id)
                            }
                          ></TrashIcon>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
              <li>
                <div className="text-sm font-semibold leading-6 text-gray-400">
                  Saved
                </div>
                <ul role="list" className="-mx-2 mt-2 space-y-1">
                  {/* {saved.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className={classNames(
                          item.current
                            ? "bg-gray-800 text-white"
                            : "text-gray-400 hover:text-white hover:bg-gray-800",
                          "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                        )}
                      >
                        <item.icon
                          className="h-6 w-6 shrink-0"
                          aria-hidden="true"
                        />
                        {item.name}
                      </a>
                    </li>
                  ))} */}
                </ul>
              </li>
              <li className="-mx-6 mt-auto">
                <a
                  href="#"
                  className="flex items-center gap-x-4 px-6 py-6 text-md font-medium leading-6 text-white hover:bg-gray-800"
                >
                  <img
                    className="h-10 w-10 rounded-full bg-gray-800"
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                    alt=""
                  />
                  <span className="sr-only">Your profile</span>
                  <span aria-hidden="true">Tom Cook</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="fixed w-full top-0 z-40 flex items-center gap-x-6 px-4 py-4 shadow-sm sm:px-6 lg:hidden h-16 backdrop-filter backdrop-blur-lg">
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
        {isEditing ? (
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
          <div className="flex-1 inline-flex justify-center items-center gap-3 text-center text-md font-medium leading-6 text-white">
            {editedName || "New chat"}

            {!isEditing && currentConversation !== null && (
              <div
                onClick={handleEditClick}
                className=" transition-colors duration-150 cursor-pointer p-1 rounded-md hover:text-white hover:bg-gray-700 text-gray-300"
              >
                <PencilSquareIcon className="w-5 h-5 " />
              </div>
            )}
          </div>
        )}

        <a href="#">
          <span className="sr-only">Your profile</span>
          <img
            className="h-8 w-8 rounded-full bg-gray-800"
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
            alt=""
          />
        </a>
      </div>
    </div>
  );
};
