import { useCallback, useEffect, useState } from "react";
import { IConnectionOptions, IEditConnection } from "@components/Library/types";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { AlertIcon, AlertModal } from "@components/Library/AlertModal";
import { enqueueSnackbar } from "notistack";
import {
  useDeleteConnection,
  useGetConnection,
  useGetConversations,
  useUpdateConnection,
  useRefreshConnectionSchema,
} from "@/hooks";
import { Button } from "../Catalyst/button";
import { Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { Switch } from "@components/Catalyst/switch";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
const SchemaEditor = ({
  options,
  setOptions,
}: {
  options: IConnectionOptions;
  setOptions: (newOptions: IConnectionOptions) => void;
}) => {
  const [expanded, setExpanded] = useState(
    Object.fromEntries(options.schemas.map((schema) => [schema.name, false]))
  );

  return (
    <div className="mt-2 divide-y divide-white/5 rounded-xl bg-white/5">
      {options.schemas.map((schema, schema_index) =>
        schema.tables.length === 0 ? null : (
          <div className="flex flex-col" key={schema_index}>
            <div className="flex w-full items-center p-6" key={schema_index}>
              <Switch
                color="green"
                name="select_schema"
                checked={schema.enabled}
                onChange={(checked) =>
                  // Check/Uncheck schema and its tables
                  setOptions({
                    schemas: options.schemas.map((prev_schema, prev_idx) =>
                      prev_idx === schema_index
                        ? {
                            ...prev_schema,
                            enabled: checked,
                            tables: prev_schema.tables.map((table) => ({
                              ...table,
                              enabled: checked,
                            })),
                          }
                        : prev_schema
                    ),
                  })
                }
              />
              <div
                className="group flex w-full items-center cursor-pointer"
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [schema.name]: !prev[schema.name],
                  }))
                }
              >
                <span
                  className={classNames(
                    "ml-4 text-sm/6 font-medium group-hover:text-white/80 grow",
                    schema.enabled ? "text-white" : "text-white/50"
                  )}
                >
                  {schema.name}
                </span>
                <ChevronDownIcon
                  className={classNames(
                    "size-5 fill-white/60 group-hover:fill-white/50",
                    expanded[schema.name] ? "rotate-180" : ""
                  )}
                />
              </div>
            </div>

            <Transition show={expanded[schema.name] || false}>
              <div className="transition ease-in-out translate-x-0 data-[closed]:opacity-0 data-[closed]:-translate-y-3">
                {schema.tables.map((table, table_index) => (
                  <div className="p-6 pt-0 pl-12" key={table_index}>
                    <div
                      className="flex w-full items-center"
                      key={schema_index}
                    >
                      <Switch
                        color="green"
                        name="select_schema"
                        checked={table.enabled && schema.enabled}
                        onChange={(checked) =>
                          // Check/Uncheck table
                          setOptions({
                            schemas: options.schemas.map(
                              (prev_schema, prev_idx) =>
                                prev_idx === schema_index
                                  ? {
                                      ...prev_schema,
                                      tables: prev_schema.tables.map(
                                        (table, inner_table_idx) =>
                                          inner_table_idx === table_index
                                            ? {
                                                ...table,
                                                enabled: checked,
                                              }
                                            : table
                                      ),
                                    }
                                  : prev_schema
                            ),
                          })
                        }
                      />
                      <span
                        className={classNames(
                          "ml-4 text-sm/5",
                          schema.enabled && table.enabled
                            ? "text-white"
                            : "text-white/50"
                        )}
                      >
                        {table.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Transition>
          </div>
        )
      )}
    </div>
  );
};

const connectionRouteApi = getRouteApi("/_app/connection/$connectionId");

export const ConnectionEditor = () => {
  const navigate = useNavigate();
  const { connectionId } = connectionRouteApi.useParams();
  const [unsavedChanges, setUnsavedChanges] = useState<boolean>(false);
  const [showCancelAlert, setShowCancelAlert] = useState<boolean>(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState<boolean>(false);

  const { data, isLoading } = useGetConnection(connectionId);
  const { data: conversationsData } = useGetConversations();
  const relatedConversations =
    conversationsData?.filter(
      (conversation) => conversation.connection_id === connectionId
    ) ?? [];

  const connection = data;

  const { mutate: deleteConnection } = useDeleteConnection({
    onSuccess() {
      navigate({ to: "/" });
    },
  });

  const { mutate: updateConnection } = useUpdateConnection({
    onSuccess() {
      navigate({ to: "/" });
    },
  });

  const { mutate: refreshSchema, isPending: isRefreshing } =
    useRefreshConnectionSchema((data) => {
      setEditFields((prev) => ({
        ...prev,
        options: data.options,
      }));
    });

  // Form state
  const [editFields, setEditFields] = useState<IEditConnection>({
    name: "",
    dsn: "",
  });

  useEffect(() => {
    setEditFields((prev) => ({
      name: connection?.name || prev.name,
      dsn: connection?.dsn || prev.dsn,
      options: connection?.options || prev.options,
    }));
  }, [connection]);

  if (!connectionId) {
    enqueueSnackbar({
      variant: "error",
      message: "No connection id provided - something went wrong",
    });
  }

  // Handle navigating back only if there are no unsaved changes
  const handleBack = useCallback(() => {
    if (unsavedChanges) {
      setShowCancelAlert(true);
    } else {
      navigate({ to: "/" });
    }
  }, [navigate, unsavedChanges]);

  // Handle navigating back when escape is pressed
  useEffect(() => {
    const handleKeyPress = (event: { key: string }) => {
      if (event.key === "Escape") {
        handleBack();
      }
    };

    // Add an event listener for the "Escape" key press
    document.addEventListener("keydown", handleKeyPress);

    // Clean up the event listener when the component unmounts
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleBack, unsavedChanges]);

  function handleDelete() {
    if (!connectionId) return;
    deleteConnection(connectionId);
  }

  function handleSubmit() {
    if (!unsavedChanges) {
      navigate({ to: "/" }); // Return to previous page

      return;
    }

    if (!connectionId) return;

    updateConnection({
      id: connectionId,
      payload: {
        name: editFields.name,
        ...(editFields.dsn !== connection?.dsn && { dsn: editFields.dsn }), // only add dsn if it changed
        options: editFields.options,
      },
    });
  }

  return (
    <div className="dark:bg-gray-900 w-full h-full relative flex flex-col mt-16 lg:mt-0">
      <AlertModal
        isOpen={showCancelAlert}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes. Discard changes?"
        okText="OK"
        // color="red"
        icon={AlertIcon.Warning}
        onSuccess={() => {
          setShowCancelAlert(false);
          history.back();
        }}
        onCancel={() => {
          setShowCancelAlert(false);
        }}
      />
      <AlertModal
        isOpen={showDeleteAlert}
        title="Delete Connection?"
        message={`This will delete ${relatedConversations.length} related conversation(s)!`}
        okText="Delete"
        icon={AlertIcon.Warning}
        onSuccess={() => {
          setShowDeleteAlert(false);
          handleDelete();
        }}
        onCancel={() => {
          setShowDeleteAlert(false);
        }}
      />
      <div className="flex flex-col lg:mt-0 p-4 lg:p-24">
        <div className="flex flex-row justify-between">
          <div className="text-gray-50 text-md md:text-2xl font-semibold">
            Edit connection
          </div>
          <div className="cursor-pointer" onClick={handleBack}>
            <XMarkIcon className="w-10 h-10 text-white [&>path]:stroke-[1]" />
          </div>
        </div>

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
                disabled={false}
                value={editFields.name}
                onChange={(e) => {
                  setEditFields({ ...editFields, name: e.target.value });
                  setUnsavedChanges(true);
                }}
                className={classNames(
                  isLoading
                    ? "animate-pulse bg-gray-900 text-gray-400"
                    : "bg-white/5 text-white",
                  "block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                )}
              />
            </div>
          </div>

          <div className="sm:col-span-6">
            <label
              htmlFor="name"
              className="block text-sm font-medium leading-6 text-white"
            >
              Database Connection String
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="name"
                id="name"
                disabled={false}
                value={editFields.dsn}
                onChange={(e) => {
                  setEditFields({ ...editFields, dsn: e.target.value });
                  setUnsavedChanges(true);
                }}
                className={classNames(
                  isLoading
                    ? "animate-pulse bg-gray-900 text-gray-400"
                    : "bg-white/5 text-white",
                  "block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                )}
              />
            </div>
          </div>

          <div className="sm:col-span-6">
            <label
              htmlFor="schema"
              className="block text-sm font-medium leading-6 text-white"
            >
              Schema options
            </label>
            <div className="flex justify-between items-center mb-2">
              <Button
                onClick={() => refreshSchema(connectionId)}
                color="blue"
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing..." : "Refresh Schema"}
              </Button>
            </div>
            {editFields.options && (
              <SchemaEditor
                options={editFields.options}
                setOptions={(newOptions) => {
                  setEditFields((prev) => ({
                    ...prev,
                    options: newOptions,
                  }));
                  setUnsavedChanges(true);
                }}
              />
            )}
          </div>

          <div className="sm:col-span-6 flex items-center justify-end gap-x-6">
            <Button
              color="dark/zinc/red"
              // className=" hover:bg-red-700 px-3 py-2 text-sm font-medium text-red-400 hover:text-white border border-gray-600 hover:border-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 transition-colors duration-150"
              onClick={() => {
                if (relatedConversations.length > 0) {
                  setShowDeleteAlert(true);
                } else {
                  handleDelete();
                }
              }}
            >
              Delete this connection
            </Button>
            <Button
              onClick={handleBack}
              color="dark/zinc"
              // className="rounded-md bg-gray-600 px-3 py-2 text-sm font-medium text-white border border-gray-500 hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 transition-colors duration-150"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              color="green"
              // className="rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm border bg-green-600 border-green-500 hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 transition-colors duration-150"
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
