import { useEffect, useState, Fragment } from "react";
import { api } from "../api";
import { isApiError } from "../api";
import { useNavigate } from "react-router-dom";
import { Routes } from "../router";
import { useSession } from "../Providers/SessionProvider";
import { Combobox, Dialog, Transition } from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { DocumentPlusIcon, FolderPlusIcon, FolderIcon, HashtagIcon, TagIcon } from '@heroicons/react/24/outline'


type Session = {session_id: string; dsn: string};

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}

export const Connection = () => {
  const navigate = useNavigate();

  const [, setSession] = useSession();

  const [query, setQuery] = useState('')
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
      setSessions(result.sessions)
    }
    getSessions();
  }, [setSession]);


  const connect = async (session: Session) => {
    // Connect with no session
    const result = await api.connect(session.dsn);
    if (isApiError(result)) {
      alert(result.message);
      return;
    }

    console.log("Navigating to search with ", result.session_id);
    setSession(result.session_id);
    navigate(Routes.Search);
  };

  return (
    <Transition.Root show={true} as={Fragment} afterLeave={() => setQuery('')} appear>
      <Dialog as="div" className="relative z-10" onClose={() => {}}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-25 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20">
        <h2>Connect</h2>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-2xl transform divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 transition-all">
              <Combobox onChange={connect}>
                <div className="relative">
                  <MagnifyingGlassIcon
                    className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                  <Combobox.Input
                    className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                    placeholder="Search..."
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>

                {(query === '' || sessions.length > 0) && (
                  <Combobox.Options static className="max-h-80 scroll-py-2 divide-y divide-gray-100 overflow-y-auto">
                    <li className="p-2">
                      {query === '' && (
                        <h2 className="mb-2 mt-4 px-3 text-xs font-semibold text-gray-500">Recent searches</h2>
                      )}
                      <ul className="text-sm text-gray-700">
                        {(sessions).map((session) => (
                          <Combobox.Option
                            key={session.session_id}
                            value={session}
                            className={({ active }) =>
                              classNames(
                                'flex cursor-default select-none items-center rounded-md px-3 py-2',
                                active && 'bg-indigo-600 text-white'
                              )
                            }
                          >
                            {({ active }) => (
                              <>
                                <FolderIcon
                                  className={classNames('h-6 w-6 flex-none', active ? 'text-white' : 'text-gray-400')}
                                  aria-hidden="true"
                                />
                                <span className="ml-3 flex-auto truncate">{session.dsn}</span>
                                {active && <span className="ml-3 flex-none text-indigo-100">Jump to...</span>}
                              </>
                            )}
                          </Combobox.Option>
                        ))}
                      </ul>
                    </li>
                  </Combobox.Options>
                )}

                {query !== '' && sessions.length === 0 && (
                  <div className="px-6 py-14 text-center sm:px-14">
                    <FolderIcon className="mx-auto h-6 w-6 text-gray-400" aria-hidden="true" />
                    <p className="mt-4 text-sm text-gray-900">
                      We couldn't find any projects with that term. Please try again.
                    </p>
                  </div>
                )}
              </Combobox>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  )};