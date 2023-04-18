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
import { api, isApiError, SearchResult } from "../api";
import { useSession } from "../Providers/SessionProvider";
import { useNavigate } from "react-router-dom";
import { Routes } from "../router";
import { DynamicTable } from "./DynamicTable";

export default function Search() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResult | null>(null);
  const [inputEnabled, setInputEnabled] = useState(true);
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
    setData(result);
    setInputEnabled(true);
    console.log(result);
  };

  const disableInput = () => {
    setInputEnabled(false);
  };

  return (
    <div className="min-h-full">
      <div className="bg-indigo-600 pb-64">
        <header className="py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-white text-center">
              Text To SQL
            </h1>
            <div className="justify-center mt-5">
              <Transition.Root
                show={true}
                as={Fragment}
                afterLeave={() => setQuery("")}
                appear
              >
                <div className="overflow-y-auto px-4 sm:px-6 md:px-10">
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
                      <Combobox disabled={!inputEnabled}>
                        <div className="relative">
                          <MagnifyingGlassIcon
                            className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400"
                            aria-hidden="true"
                          />
                          <Combobox.Input
                            className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                            placeholder="Enter your natural language query here..."
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                disableInput();
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
          </div>
        </header>
      </div>

      <Transition.Root show={data !== null} appear>
        <main className="-mt-64">
          <div className="mx-auto max-w-4xl px-4 pb-10 sm:px-6 lg:px-8">
            <div className="sm:px-6 max-w-4xl lg:px-8 rounded-lg shadow bg-gray-50">
              <div className="px-4 sm:px-6 lg:px-8">
                <div className="sm:flex sm:items-center">
                  <div
                    className="px-4 py-5 sm:p-6"
                    dangerouslySetInnerHTML={{ __html: data?.query }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          <div className="mx-auto max-w-6xl pb-12">
            <div className="mx-auto max-w-7xl  bg-white rounded-lg shadow">
              <div className="">
                {data !== null && (
                  <DynamicTable data={data?.results}></DynamicTable>
                )}
              </div>
            </div>
          </div>
        </main>
      </Transition.Root>
    </div>
  );
}
