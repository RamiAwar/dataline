import { useEffect, useState } from "react";

export const SelectedTablesDisplay = ({ tables }: { tables: string }) => {
  const [parsedTables, setParsedTables] = useState<string[]>([]);
  useEffect(() => {
    if (tables.length > 0) {
      setParsedTables(tables.toString().split(","));
    }
  }, [tables]);

  return (
    <div className="flex space-x-2 items-center">
      <span className="text-gray-400 text-sm font-normal">
        Detected tables{" "}
      </span>
      {parsedTables.map((table) => (
        <div
          key={table}
          className="rounded-md bg-gray-700/40 px-2 py-1 text-xs font-medium text-gray-400 ring-1 ring-inset ring-white/10"
        >
          {table}
        </div>
      ))}
    </div>
  );
};
