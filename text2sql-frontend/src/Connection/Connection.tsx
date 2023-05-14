import { useEffect, useState, Fragment } from "react";
import { SessionResult, api } from "../api";
import { isApiError } from "../api";
import { useNavigate } from "react-router-dom";
import { Routes } from "../router";
import { Spinner } from "../Spinner/Spinner";
import { useSession } from "../Providers/SessionProvider";
import { Combobox, Transition } from "@headlessui/react";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { FolderIcon } from "@heroicons/react/24/outline";
import { CenteredLayout } from "../Layouts/CenteredLayout";

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

export const Connection = () => {
  const navigate = useNavigate();

  const [session, setSession] = useSession();
  const [inputEnabled, setInputEnabled] = useState(true);
  const [query, setQuery] = useState("");
  const [sessions, setSessions] = useState<SessionResult[]>([]);

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
      navigate(Routes.Search);
    } catch (e) {
      console.log(e);
      alert("API Error");
      setInputEnabled(true);
    }
  };

  return (
    <CenteredLayout>
      <Transition.Root show={true} as={Fragment} afterLeave={() => {}} appear>
        <main className="justify-center mb-12">
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
              <div className="mx-auto max-w-xl transform divide-y divide-gray-100 dark:divide-gray-500 overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-2xl dark:ring-inset ring-1 ring-black ring-opacity-5 dark:ring-1 dark:ring-white/10 transition-all">
                <Combobox
                  disabled={!inputEnabled}
                  onChange={(dsn: string) => {
                    setQuery(dsn);
                  }}
                >
                  <div className="relative">
                    {inputEnabled && (
                      <MagnifyingGlassIcon
                        className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400 dark:text-gray-500"
                        aria-hidden="true"
                      />
                    )}
                    {!inputEnabled && (
                      <Spinner className="pointer-events-none absolute left-4 top-3.5 h-5 w-5"></Spinner>
                    )}
                    <Combobox.Input
                      className={`h-12 w-full border-0 bg-transparent pl-11 pr-4 placeholder:text-gray-400 dark:placeholder:text-gray-100 focus:ring-0 sm:text-md ${
                        inputEnabled
                          ? "text-gray-900 dark:text-white"
                          : "text-gray-400 dark:text-gray-400"
                      }`}
                      placeholder="Enter your database DSN..."
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
                      className="max-h-80 scroll-py-2 divide-y divide-gray-100 dark:divide-gray-500 overflow-y-auto"
                    >
                      <li className="p-2">
                        <h2 className="mb-2 mt-4 px-3 text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-200">
                          Recent connections
                        </h2>
                        <ul className="text-sm sm:text-md text-gray-700 dark:text-gray-400">
                          {sessions.map((session) => (
                            <Combobox.Option
                              key={session.session_id}
                              value={session.dsn}
                              disabled={!inputEnabled}
                              className={({ active }) =>
                                classNames(
                                  "flex cursor-default select-none items-center rounded-md px-3 py-2",
                                  active &&
                                    "bg-indigo-600 text-white dark:bg-gray-800"
                                )
                              }
                            >
                              {({ active }) => (
                                <>
                                  <FolderIcon
                                    className={classNames(
                                      "h-6 w-6 flex-none",
                                      active
                                        ? "text-white"
                                        : "text-gray-400 dark:text-gray-500"
                                    )}
                                    aria-hidden="true"
                                  />
                                  <span className="ml-3 flex-auto truncate">
                                    {session.dsn}
                                  </span>
                                  {active && (
                                    <span className="ml-3 flex-none text-indigo-100 dark:text-gray-400">
                                      Fill in...
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
                        className="mx-auto h-6 w-6 text-gray-400 dark:text-gray-500"
                        aria-hidden="true"
                      />
                      <p className="mt-4 text-sm sm:text-md text-gray-900 dark:text-gray-200">
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
    </CenteredLayout>
  );
};
