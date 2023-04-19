import { useEffect, useState, Fragment } from "react";
import { api } from "../api";
import { isApiError } from "../api";
import { useNavigate } from "react-router-dom";
import { Routes } from "../router";
import { Spinner } from "../Spinner/Spinner";
import { useSession } from "../Providers/SessionProvider";
import { Combobox, Dialog, Transition } from "@headlessui/react";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import {
  DocumentPlusIcon,
  FolderPlusIcon,
  FolderIcon,
  HashtagIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

type Session = { session_id: string; dsn: string };

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

export const Connection = () => {
  const navigate = useNavigate();

  const [session, setSession] = useSession();
  const [inputEnabled, setInputEnabled] = useState(true);
  const [query, setQuery] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);

  // Setup session to be null when the component is mounted
  useEffect(() => {
    // On mount, set the session to null and load all sessions from backend
    const getSessions = async () => {
      const result = await api.listSessions();

      if (isApiError(result)) {
        alert(result.message);
        return;
      }
      setSessions(result.sessions);
    };
    getSessions();
  }, [setSession]);

  // Navigate to search if session is set
  useEffect(() => {
    if (session) {
      navigate(Routes.Search);
    }
  }, [session, navigate]);

  const disableInput = () => {
    setInputEnabled(false);
  };

  const connect = async (dsn: string) => {
    try {
      // Connect with no session
      const result = await api.connect(dsn);

      if (isApiError(result)) {
        alert("API Error");
        console.log(result.message);
        return;
      }

      setSession(result.session_id);
    } catch (e) {
      console.log(e);
      alert("API Error");
      setInputEnabled(true);
    }
  };

  return (
    <div className="min-h-full">
      <div className="bg-indigo-800 pb-12">
        <header className="py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-white text-center">
              Text To SQL
            </h1>
          </div>
        </header>
      </div>

      <Transition.Root show={true} as={Fragment} afterLeave={() => {}} appear>
        <main className="justify-center -mt-10 mb-12">
          <div className="overflow-y-auto px-4 sm:px-6 md:px-10 pb-24">
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
                <Combobox
                  disabled={!inputEnabled}
                  onChange={(dsn: string) => {
                    disableInput();
                    connect(dsn);
                  }}
                >
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
                    <Combobox.Input
                      className={`h-12 w-full border-0 bg-transparent pl-11 pr-4 placeholder:text-gray-400 focus:ring-0 sm:text-sm ${
                        inputEnabled ? "text-gray-900" : "text-gray-400"
                      }`}
                      placeholder="Search..."
                      onChange={(event) => {
                        event.preventDefault();
                        setQuery(event.target.value);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          disableInput();
                          connect(query);
                        }
                      }}
                    />
                  </div>

                  {(query === "" || sessions.length > 0) && (
                    <Combobox.Options
                      static
                      className="max-h-80 scroll-py-2 divide-y divide-gray-100 overflow-y-auto"
                    >
                      <li className="p-2">
                        {query === "" && (
                          <h2 className="mb-2 mt-4 px-3 text-xs font-semibold text-gray-500">
                            Recent searches
                          </h2>
                        )}
                        <ul className="text-sm text-gray-700">
                          {sessions.map((session) => (
                            <Combobox.Option
                              key={session.session_id}
                              value={session.dsn}
                              disabled={!inputEnabled}
                              className={({ active }) =>
                                classNames(
                                  "flex cursor-default select-none items-center rounded-md px-3 py-2",
                                  active && "bg-indigo-600 text-white"
                                )
                              }
                            >
                              {({ active }) => (
                                <>
                                  <FolderIcon
                                    className={classNames(
                                      "h-6 w-6 flex-none",
                                      active ? "text-white" : "text-gray-400"
                                    )}
                                    aria-hidden="true"
                                  />
                                  <span className="ml-3 flex-auto truncate">
                                    {session.dsn}
                                  </span>
                                  {active && (
                                    <span className="ml-3 flex-none text-indigo-100">
                                      Jump to...
                                    </span>
                                  )}
                                </>
                              )}
                            </Combobox.Option>
                          ))}
                        </ul>
                      </li>
                    </Combobox.Options>
                  )}

                  {query !== "" && sessions.length === 0 && (
                    <div className="px-6 py-14 text-center sm:px-14">
                      <FolderIcon
                        className="mx-auto h-6 w-6 text-gray-400"
                        aria-hidden="true"
                      />
                      <p className="mt-4 text-sm text-gray-900">
                        We couldn't find any projects with that term. Please try
                        again.
                      </p>
                    </div>
                  )}
                </Combobox>
              </div>
            </Transition.Child>
          </div>
        </main>
      </Transition.Root>
    </div>
  );
};
