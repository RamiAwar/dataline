import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { api } from "../../api";
import { Spinner } from "../Spinner/Spinner";
import { useAuth } from "../Providers/AuthProvider";

interface NewConnectionModalFormProps {
  isOpen: boolean;
  onClose: () => void;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

function NewConnectionModal({ isOpen, onClose }: NewConnectionModalFormProps) {
  // const maskDSNCredentials = (dsn: string) => {
  //   const regex = /^(.*\/\/)(.*?:.*?@)(.*)$/;
  //   return dsn.replace(regex, (_, prefix, credentials, rest) => {
  //     const maskedCredentials = credentials.replace(/./g, "*");
  //     return prefix + maskedCredentials + rest;
  //   });
  // };
  // const maskedDsn = maskDSNCredentials(unmaskedDsn);

  const [unmaskedDsn, setUnmaskedDsn] = useState("");
  const [connectionName, setConnectionName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDSNChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setUnmaskedDsn(value);
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setConnectionName(value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Enable loading state
    setIsLoading(true);

    const res = await api.createConnection(unmaskedDsn, connectionName);
    if (res.status !== "ok") {
      alert("Error creating connection");
      return;
    }

    // Fake loading for 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 4000));

    setIsLoading(false);
    onClose();
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10 md:ml-72" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto h-[calc(100%-4rem)] lg:pl-72 lg:h-full w-full">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-gray-900 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-xl sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-12">
                  <div className="">
                    <h2 className="text-base font-semibold leading-7 text-white">
                      New Connection
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-gray-400">
                      Add a new database connection
                    </p>

                    <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                      <div className="sm:col-span-3">
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium leading-6 text-white"
                        >
                          Name
                        </label>
                        <div className="mt-2">
                          <input
                            type="text"
                            name="name"
                            id="name"
                            disabled={isLoading}
                            autoComplete="one-time-code"
                            value={connectionName}
                            onChange={handleNameChange}
                            placeholder="Postgres Prod"
                            className={classNames(
                              isLoading
                                ? "animate-pulse bg-gray-900 text-gray-400"
                                : "bg-white/5 text-white",
                              "block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 sm:col-span-4">
                      <label
                        htmlFor="dsn"
                        className="block text-sm font-medium leading-6 text-white"
                      >
                        Connection string / DSN
                      </label>
                      {/* Hidden input field overlaying the real one
                      
                      <div className="relative mt-2">
                        
                        <input
                          type="text"
                          autoComplete="off"
                          value={unmaskedDsn}
                          onChange={handleDSNChange}
                          className="absolute w-full h-full bg-transparent border-0 rounded-md text-white font-mono sm:text-sm sm:leading-6 py-1.5"
                          style={{ WebkitTextFillColor: "transparent" }}
                        /> */}

                      {/* Display the masked DSN to the user */}
                      <div className="relative mt-2">
                        <input
                          id="dsn"
                          name="dsn"
                          type="text"
                          disabled={isLoading}
                          autoComplete="one-time-code"
                          value={unmaskedDsn}
                          onChange={handleDSNChange}
                          placeholder="postgres://myuser:mypassword@localhost:5432/mydatabase"
                          // readOnly // Make this input read-only to prevent user interaction
                          className={classNames(
                            isLoading
                              ? "animate-pulse bg-gray-900 text-gray-400"
                              : "bg-white/5 text-white",
                            "block w-full rounded-md border-0 py-1.5 font-mono shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-x-6">
                    <button
                      type="button"
                      className="text-sm font-semibold leading-6 text-white"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                    >
                      {isLoading && (
                        <Spinner className="pointer-events-none h-5 w-5"></Spinner>
                      )}
                      Save
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

export default NewConnectionModal;
