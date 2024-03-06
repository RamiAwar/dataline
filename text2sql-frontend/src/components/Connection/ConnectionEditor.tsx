import { api } from "../../api";
import { useEffect, useState } from "react";
import { IConnection, IEditConnection } from "../Library/types";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useNavigate, useParams } from "react-router-dom";
import { AlertIcon, AlertModal } from "../Library/AlertModal";
import { useConnectionList } from "../Providers/ConnectionListProvider";
import { Routes } from "../../router";
import SchemaEditorGrid from "./SchemaEditorGrid";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const ConnectionEditor = () => {
  let navigate = useNavigate();
  const params = useParams<{ connectionId: string }>();
  const [connection, setConnection] = useState<IConnection | null>();
  const [unsavedChanges, setUnsavedChanges] = useState<boolean>(false);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [_, __, fetchConnections] = useConnectionList();

  // Form state
  const [editFields, setEditFields] = useState<IEditConnection>({
    name: "",
    dsn: "",
  });

  const isLoading = false;

  // Handle navigating back only if there are no unsaved changes
  function handleBack() {
    if (unsavedChanges) {
      setShowAlert(true);
    } else {
      navigate(Routes.NewChat);
    }
  }

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
  }, [history, unsavedChanges]);

  // Fetch connection details on load
  useEffect(() => {
    const fetchConnection = async () => {
      if (!params.connectionId) {
        alert("No connection id provided - something went wrong");
      }

      let fetchedConnection = await api.getConnection(
        params.connectionId as string
      );
      if (fetchedConnection.status !== "ok") {
        alert("Error fetching connection");
        return;
      }
      setConnection(fetchedConnection.data.connection);
      setEditFields({
        name: fetchedConnection.data.connection.name,
        dsn: fetchedConnection.data.connection.dsn,
      });
    };
    fetchConnection();
  }, [params.connectionId]);

  function handleSubmit() {
    if (!unsavedChanges) {
      navigate(Routes.NewChat); // Return to previous page
      return;
    }

    const updateConnection = async () => {
      let updatedConnection = await api.updateConnection(
        params.connectionId as string,
        {
          name: editFields.name,
          dsn: editFields.dsn,
        }
      );

      if (updatedConnection.status !== "ok") {
        alert("Error updating connection");
        return;
      }

      // Refresh connections
      fetchConnections();
      navigate(Routes.NewChat);
    };

    updateConnection();
  }

  return (
    <div className="bg-gray-800 w-full h-full relative flex flex-col -mt-16 lg:mt-0">
      <AlertModal
        isOpen={showAlert}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes. Discard changes?"
        okText="OK"
        color="red"
        icon={AlertIcon.Warning}
        onSuccess={() => {
          setShowAlert(false);
          history.back();
        }}
        onCancel={() => {
          setShowAlert(false);
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

          <form className="sm:col-span-6 flex items-center justify-end gap-x-6">
            <button
              type="button"
              className="rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white border border-gray-500 hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm border bg-green-600 border-green-500 hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 transition-colors duration-150"
            >
              Save
            </button>
          </form>

          <div className="sm:col-span-6">
            <label
              htmlFor="name"
              className="block text-md font-medium leading-6 text-white pb-2"
            >
              Schema Descriptions
            </label>
            <span className="block text-md text-gray-400 font-light leading-6 pb-2">
              Adding descriptions to some hard-to-understand schema fields will
              help generate higher quality results.
              <br></br>
              <br></br>
              For example, if you have a table called "users" with a vague
              column called 'data' that actually contains key value pairs
              including the user's age, you could add a description to the
              'data' column that says 'Contains key value pairs including the
              user's age'.
              <br></br>
              <br></br>
              This is needed as DataLine will never look at the actual data in
              your database, only the schema, making it impossible to guess what
              the data actually contains without good field names and
              descriptions.
            </span>
            <div className="mt-2">
              {connection && <SchemaEditorGrid connection={connection} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
