import SyntaxHighlighter from "react-syntax-highlighter";
import { IResultType } from "./types";
import { ClipboardIcon, PlayIcon } from "@heroicons/react/24/outline";
import CustomTooltip from "../../src/Library/Tooltip";
import { monokai } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { format } from "prettier-sql";
import { useRef, useState } from "react";

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

// Enum for sql dialects
export enum Dialect {
  Postgres = "postgresql",
  MySQL = "mysql",
  SQLite = "sqlite",
  MariaDB = "mariadb",
  Spark = "spark",
  BigQuery = "bigquery",
  IBMDB2 = "db2",
  Hive = "hive",
  Couchbase = "n1ql",
  TransactSQL = "tsql",
}

export const CodeBlock = ({
  code,
  language,
  runQuery,
  runnable,
}: {
  code: string;
  language: IResultType;
  runQuery: (code: string) => void;
  runnable: boolean;
}) => {
  const formatted_code = format(code, { language: Dialect.Postgres });

  return (
    <div className="max-w-7xl border-2 border-gray-500 rounded-md bg-gray-900 flex flex-col relative">
      <SyntaxHighlighter
        children={formatted_code}
        language={language}
        style={monokai}
        wrapLines={true}
      />

      <div
        className="absolute bottom-0 right-0 m-1 flex gap-1"
        onClick={() => copyToClipboard(code)}
      >
        <CustomTooltip content="COPIED!" trigger="click">
          <button className="group flex ml-auto gap-2 rounded-md p-1 bg-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200 disabled:dark:hover:text-gray-100 transition-all duration-150 ease-in-out">
            <ClipboardIcon className="w-5 h-5 [&>path]:stroke-[2] group-hover:-rotate-6" />
          </button>
        </CustomTooltip>

        <button
          className={classNames(
            runnable
              ? "hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-600 dark:hover:text-gray-200 disabled:dark:hover:text-gray-100"
              : "",
            "group flex ml-auto gap-2 rounded-md p-1 dark:text-gray-400 bg-gray-700 transition-all duration-150 ease-in-out"
          )}
          onClick={() => runQuery(code)}
          disabled={!runnable}
        >
          <PlayIcon
            className={classNames(
              runnable ? "group-hover:-rotate-12" : "animate-spin",
              "w-5 h-5 [&>path]:stroke-[2]"
            )}
          />
        </button>
      </div>
    </div>
  );
};
