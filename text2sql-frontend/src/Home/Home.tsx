import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  Bars3Icon,
  CalendarIcon,
  ChartPieIcon,
  DocumentDuplicateIcon,
  FolderIcon,
  DocumentIcon,
  CircleStackIcon,
  HomeIcon,
  UsersIcon,
  BookmarkIcon,
  PlusIcon,
  ChatBubbleOvalLeftIcon,
  ChartBarIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import logo from "../assets/images/logo_md.png";
import { Conversation } from "../Conversation/Conversation";
import { Sidebar } from "./Sidebar";

const navigation = [
  { name: "DvdRentalDB", icon: CircleStackIcon, current: true },
];
const saved = [
  {
    id: 1,
    name: "Queries",
    icon: BookmarkIcon,
    href: "/queries",
    current: false,
  },
  {
    id: 2,
    name: "Dashboards",
    icon: ChartBarIcon,
    href: "/dashboards",
    current: false,
  },
];

const conversations = [];

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export const Home = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [currentConversation, setCurrentConversation] =
    useState<IConversation | null>(null);

  return (
    <div>
      <Sidebar></Sidebar>

      <main className="py-10 lg:pl-72">
        <div className="px-4 sm:px-6 lg:px-8 text-gray-200">
          <Conversation conversation={currentConversation} />
        </div>
      </main>
    </div>
  );
};
