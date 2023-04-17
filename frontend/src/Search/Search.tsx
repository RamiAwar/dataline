/*
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/forms'),
    ],
  }
  ```
*/
import { Fragment, useEffect, useState } from "react";
import { Combobox, Dialog, Transition } from "@headlessui/react";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import {
  CalendarIcon,
  CodeBracketIcon,
  DocumentIcon,
  ExclamationCircleIcon,
  LinkIcon,
  PencilSquareIcon,
  PhotoIcon,
  TableCellsIcon,
  VideoCameraIcon,
  ViewColumnsIcon,
  Bars4Icon,
} from "@heroicons/react/24/outline";
import { api, isApiError } from "../api";
import { useSession } from "../Providers/SessionProvider";
import { useNavigate } from "react-router-dom";
import { Routes } from "../router";
import { DynamicTable } from "./DynamicTable";

export default function Search() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<any>(null);
  const [session] = useSession();

  const navigate = useNavigate();

  useEffect(() => {
    if (!session) {
      navigate(Routes.Connection);
    }
  }, [session, navigate]);

  if (!session) return null;

  const handleQuery = async () => {
    const result = await api.search(session, query);
    if (isApiError(result)) {
      alert(result.message);
      return;
    }
    setData(result.results);
  };

  return (
    <div>
      <div className="justify-center">
        <Transition.Root
          show={true}
          as={Fragment}
          afterLeave={() => setQuery("")}
          appear
        >
          <div className="overflow-y-auto p-4 sm:p-6 md:p-20">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="mx-auto max-w-xl transform divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 transition-all">
                <Combobox>
                  <div className="relative">
                    <MagnifyingGlassIcon
                      className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                    <Combobox.Input
                      className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                      placeholder="Search..."
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          handleQuery();
                        }
                      }}
                    />
                  </div>
                </Combobox>
              </div>
            </Transition.Child>
          </div>
        </Transition.Root>
      </div>

      <Transition.Root show={data !== null} appear>
        {data !== null && <DynamicTable data={data}></DynamicTable>}
      </Transition.Root>
    </div>
  );
}
