import { Transition } from "@headlessui/react";
import {
  ChevronDoubleDownIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import React from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ITableSchema, ITableSchemaResult } from "../Library/types";
import { api } from "../../api";

interface ExpandableTableSchemaViewerProps {
  tableSchema: ITableSchemaResult;
  isExpanded?: boolean;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function ExpandableTableSchemaViewer({
  tableSchema,
  isExpanded,
}: ExpandableTableSchemaViewerProps) {
  // Create a state containing a description for each field and populate
  // it with (field_description.id, description) for each field
  const [fieldDescriptions, setFieldDescriptions] = React.useState<
    Record<string, string>
  >(
    tableSchema.field_descriptions?.reduce(
      (acc, field) => ({
        ...acc,
        [field.name]: field.description,
      }),
      {}
    ) ?? {}
  );

  // Create state for table
  const [tableDescription, setTableDescription] = React.useState<string>(
    tableSchema.description
  );

  const [expanded, setExpanded] = React.useState<boolean>(isExpanded || false);
  const [parent, _] = useAutoAnimate(/* optional config */);

  function updateTableDescription(tableId: string, description: string) {
    // Make an API call to update table description
    const updateDescription = async () => {
      const result = await api.updateTableSchemaDescription(
        tableId,
        description
      );

      if (result.status !== "ok") {
        alert("Error updating table description");
        return;
      }
    };

    updateDescription();
  }

  function updateFieldDescription(fieldId: string, description: string) {
    // Make an API call to update table description
    const updateDescription = async () => {
      const result = await api.updateTableSchemaFieldDescription(
        fieldId,
        description
      );

      if (result.status !== "ok") {
        alert("Error updating table description");
        return;
      }
    };

    updateDescription();
  }

  return (
    <div className="flow-root">
      <div className="overflow-x-scroll sm:-mx-6 lg:-mx-8">
        <div
          ref={parent}
          className="inline-block min-w-full max-w-full align-middle sm:px-6 lg:px-8"
        >
          <div
            className="relative z-10 bg-gray-600 shadow ring-1 ring-gray-300 ring-opacity-10 sm:rounded-lg flex justify-between items-center cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="px-4 py-3.5 sm:px-6 overflow-hidden text-ellipsis mr-2">
              <h3
                className="text-lg leading-6 font-medium text-white"
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {tableSchema.name}
              </h3>
            </div>
            <ChevronDownIcon
              className={classNames(
                expanded ? "rotate-180" : "rotate-0",
                "h-6 w-6 mr-4 text-gray-300 mt-1 [&>path]:stroke-[1] transition-transform duration-200"
              )}
            />
          </div>
          {expanded && (
            <div className="overflow-hidden shadow ring-1 ring-gray-300 ring-opacity-10 sm:rounded-lg mt-2">
              <table className="min-w-full divide-y divide-gray-300">
                <tbody className="divide-y divide-gray-200 bg-gray-700">
                  <tr key={tableSchema.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6 text-ellipsis">
                      {tableSchema.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-200 text-ellipsis">
                      table
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm sm:pr-6">
                      <input
                        type="text"
                        name="name"
                        id="name"
                        disabled={false}
                        value={tableDescription}
                        onChange={(e) => {
                          updateTableDescription(
                            tableSchema.id,
                            e.target.value
                          );
                          setTableDescription(e.target.value);
                        }}
                        className="bg-gray-500 text-white block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                      />
                    </td>
                  </tr>
                  {tableSchema.field_descriptions?.map((field) => (
                    <tr key={field.name}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6 text-ellipsis">
                        {field.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-200 text-ellipsis">
                        {field.type}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm sm:pr-6">
                        <input
                          type="text"
                          name="name"
                          id="name"
                          disabled={false}
                          value={fieldDescriptions[field.name]}
                          onChange={(e) => {
                            updateFieldDescription(field.id, e.target.value);
                            setFieldDescriptions({
                              ...fieldDescriptions,
                              [field.name]: e.target.value,
                            });
                          }}
                          className="bg-gray-500 text-white block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
