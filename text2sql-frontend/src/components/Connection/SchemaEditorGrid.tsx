import { Transition } from "@headlessui/react";
import {
  ChevronDoubleDownIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import React, { useEffect, useState } from "react";
import ExpandableTableSchemaViewer from "./ExpandableTableSchemaViewer";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  IConnection,
  ITableSchema,
  ITableSchemaResult,
} from "../Library/types";
import { api } from "../../api";

interface SchemaEditorGridProps {
  connection: IConnection;
}

export default function SchemaEditorGrid({
  connection,
}: SchemaEditorGridProps) {
  const [tableSchemas, setTableSchemas] = useState<ITableSchemaResult[]>([]);
  const [parent, enableAnimations] = useAutoAnimate(/* optional config */);

  useEffect(() => {
    // Load the initial table schemas from API

    const fetchTableSchemas = async () => {
      let fetchedSchemas = await api.getTableSchemas(connection.id);
      if (fetchedSchemas.status !== "ok") {
        alert("Error fetching connection");
        return;
      }
      setTableSchemas(fetchedSchemas.data.tables);
    };
    fetchTableSchemas();
  }, [connection.id]);

  const updateTableSchema = (updatedSchema: ITableSchema) => {
    // Find the index of the schema with the matching table name
    // const updatedIndex = tableSchemas.findIndex(
    //   (schema) => schema.table.name === updatedSchema.table.name
    // );
    // if (updatedIndex !== -1) {
    //   // Replace the existing schema with the updated one
    //   const updatedSchemas = [...tableSchemas];
    //   updatedSchemas[updatedIndex] = updatedSchema;
    //   setTableSchemas(updatedSchemas);
    // } else {
    //   // If not found, add it to the list
    //   setTableSchemas([...tableSchemas, updatedSchema]);
    // }
    // TODO: Make the API call with updated data
  };

  return (
    <ul ref={parent} role="list" className="grid grid-cols-1 gap-6">
      {tableSchemas.map((schema) => (
        <li
          key={schema.id}
          className="col-span-1 divide-y divide-gray-200 rounded-lg shadow"
        >
          <ExpandableTableSchemaViewer tableSchema={schema} />
        </li>
      ))}
    </ul>
  );
}
