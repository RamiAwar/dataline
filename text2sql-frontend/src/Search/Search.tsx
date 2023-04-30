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
import { Transition } from "@headlessui/react";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { Spinner } from "../Spinner/Spinner";

import { api, isApiError, SearchResult, ApiSearchResult } from "../api";
import { useSession } from "../Providers/SessionProvider";
import { useNavigate } from "react-router-dom";
import { Routes } from "../router";
import { DynamicTable } from "./DynamicTable";
import LimitNumberField from "../Inputs/LimitNumberField";
import Toggle from "../Inputs/Toggle";
import { Tooltip } from "flowbite-react";

export default function Search() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResult | null>(null);
  const [inputEnabled, setInputEnabled] = useState(true);
  const [session] = useSession();
  const [limit, setLimit] = useState(10);
  const [withExecution, setWithExecution] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    if (!session) {
      navigate(Routes.Connection);
    }
  }, [session, navigate]);

  if (!session) return null;

  const handleQuery = async () => {
    try {
      const result = await api.search(session, query, limit, withExecution);
      if (isApiError(result)) {
        alert(result.message);
        setInputEnabled(true);
        return;
      }
      setData(result);
      setInputEnabled(true);
    } catch (e) {
      console.log(e);
      alert("API Error");
      setInputEnabled(true);
    }
  };

  const disableInput = () => {
    setInputEnabled(false);
  };

  return (
    <div className="min-h-full">
      <div className="bg-indigo-600">
        <header className="py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-white text-center">
              Text To SQL
            </h1>
            <div className="justify-center mt-5">
              <Transition.Root
                show={true}
                as={Fragment}
                afterLeave={() => {}}
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
                      <div className="relative">
                        {inputEnabled && (
                          <MagnifyingGlassIcon
                            className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400"
                            aria-hidden="true"
                          />
                        )}
                        {!inputEnabled && (
                          <Spinner className="pointer-events-none absolute left-4 top-3.5 h-5 w-5"></Spinner>
                        )}
                        <input
                          type="email"
                          name="email"
                          id="email"
                          disabled={!inputEnabled}
                          className={`h-12 w-full border-0 bg-transparent pl-11 pr-4 placeholder:text-gray-400 focus:ring-0 sm:text-sm ${
                            inputEnabled ? "text-gray-900" : "text-gray-400"
                          }`}
                          placeholder="Enter your natural language query here..."
                          onChange={(event) => {
                            event.preventDefault();
                            setQuery(event.target.value);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              disableInput();
                              handleQuery();
                            }
                          }}
                        />
                      </div>
                    </div>
                  </Transition.Child>

                  <div className="mx-auto px-2 mt-4 max-w-xl flex items-center">
                    <div className="flex items-center">
                      <Tooltip
                        content="Auto-execute resulting SQL query on your database and fetch the results"
                        style="light"
                        placement="bottom"
                        animation="duration-500"
                      >
                        <p className="block text-md font-normal text-gray-200">
                          Auto-Execute{" "}
                        </p>
                      </Tooltip>
                      <div className="ml-2 flex items-center">
                        <Toggle
                          enabled={withExecution}
                          onChange={() => setWithExecution(!withExecution)}
                        ></Toggle>
                      </div>
                    </div>

                    <LimitNumberField
                      disabled={!withExecution || !inputEnabled}
                      className="w-36 ml-6"
                      placeholder={limit}
                      onChange={(newVal) => setLimit(newVal)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          disableInput();
                          handleQuery();
                        }
                      }}
                    ></LimitNumberField>
                  </div>
                </div>
              </Transition.Root>
            </div>
          </div>
        </header>
      </div>

      {data !== null && (
        <Transition.Root show={true} appear>
          <main className="py-10 flex flex-col">
            <div className="items-center mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
              <div className="sm:px-6 max-w-4xl lg:px-8 rounded-lg shadow bg-gray-50">
                <div className="px-4 sm:px-6 lg:px-8">
                  <div className="sm:flex sm:items-center sm:justify-start overflow-x-auto">
                    <div
                      className="px-4 py-5 sm:p-6"
                      dangerouslySetInnerHTML={{
                        __html: data?.query as string,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-auto max-w-7xl pb-12">
              <div className="mx-auto max-w-7xl  bg-white rounded-lg shadow">
                <div className="">
                  {(data as SearchResult).results?.length > 0 && (
                    <DynamicTable data={data?.results}></DynamicTable>
                  )}
                </div>
              </div>
            </div>
          </main>
        </Transition.Root>
      )}
    </div>
  );
}
