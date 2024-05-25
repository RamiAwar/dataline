import logo from "@/assets/images/logo_md.png";
import { CodeBlock } from "@components/Conversation/CodeBlock";
import { IMessageWithResultsOut } from "@components/Library/types";
import { DynamicTable } from "@components/Library/DynamicTable";
import { SelectedTablesDisplay } from "@components/Library/SelectedTablesDisplay";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import { useGetAvatar } from "@/hooks";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { InfoTooltip } from "@components/Library/Tooltip";
import Chart from "../Library/Chart";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const Message = ({
  initialMessage,
  className = "",
}: {
  initialMessage: IMessageWithResultsOut;
  className?: string;
}) => {
  const [message, setMessage] = useState(initialMessage);
  const { data: avatarUrl } = useGetAvatar();

  function updateData(sql_string_result_id: string, content: string) {
    // != null, rules out both null and undefined
    if (message.results != null && content != null) {

      // Remove SQL query run result linked to this ID if any
      const newResults = message.results?.filter(
        (result) => !(result.type === "SQL_QUERY_RUN_RESULT" && result.linked_id === sql_string_result_id)
      );

      const updatedMessage = {
        ...message,
        results: [
          ...newResults,
          {
            type: "SQL_QUERY_RUN_RESULT",
            linked_id: sql_string_result_id,
            content,
          },
        ],
      } as IMessageWithResultsOut;
      setMessage(updatedMessage);
    }
  }

  return (
    <div
      className={classNames(
        message.message.role === "ai"
          ? "dark:bg-gray-800/40"
          : "dark:bg-gray-900",
        "w-full text-gray-800 dark:text-gray-100 bg-gray-50",
        className
      )}
    >
      <div className="flex p-4 gap-4 text-base md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl md:py-6 lg:px-0 m-auto">
        <div className="flex-shrink-0 flex flex-col relative items-end">
          <div className="">
            <div className="relative p-1 rounded-sm text-white flex items-center justify-center">
              {message.message.role === "ai" ? (
                <div className="flex flex-col items-center">
                  <img src={logo} className="h-7 w-7" />
                  {message.message.options?.secure_data && (
                    <a href="https://dataline.app/faq" target="_blank">
                      <InfoTooltip hoverText="No data was sent to or processed by the AI in this message. Click to learn more about how we do this.">
                        <div className="text-green-400/90 mt-3 p-1 bg-green-400/20 rounded-full hover:bg-green-400/40 transition-colors duration-150 cursor-pointer">
                          <ShieldCheckIcon className="w-7 h-7" />
                        </div>
                      </InfoTooltip>
                    </a>
                  )}
                </div>
              ) : avatarUrl ? (
                <img
                  className="h-7 w-7 rounded-sm bg-gray-800"
                  src={avatarUrl}
                  alt=""
                />
              ) : (
                <UserCircleIcon className="text-gray-300 h-8 w-8 rounded-full " />
              )}
            </div>
          </div>
        </div>
        <div className="flex w-[calc(100%-50px)] flex-col gap-1 md:gap-3 lg:w-[calc(100%-115px)] scrollbar-hide">
          {message.message.content && (
            <div className="flex flex-grow flex-col gap-3">
              <div className="min-h-[20px] flex flex-col items-start gap-4 whitespace-pre-wrap break-words">
                <div className="markdown prose w-full break-words dark:prose-invert dark">
                  <p className=" leading-loose">{message.message.content}</p>
                </div>
              </div>
            </div>
          )}

          {/** RESULTS: QUERY, DATA, PLOTS */}
          {/** Sort results as selected_tables first, charts second, data third, code fourth using tertiary if **/}
          {message.results
            ?.sort((a, b) => {
              if (a.type === "SELECTED_TABLES") return -1;
              if (b.type === "SELECTED_TABLES") return 1;

              if (a.type === "CHART_GENERATION_RESULT") return -1;
              if (b.type === "CHART_GENERATION_RESULT") return 1;

              if (a.type === "SQL_QUERY_RUN_RESULT") return -1;
              if (b.type === "SQL_QUERY_RUN_RESULT") return 1;

              if (a.type === "SQL_QUERY_STRING_RESULT") return -1;
              if (b.type === "SQL_QUERY_STRING_RESULT") return 1;
              return 0;
            })
            .map(
              (result, index) =>
                (result.type === "SELECTED_TABLES" && (
                  <SelectedTablesDisplay
                    tables={result.content.tables}
                    key={`message-${message.message.id}-selectedtables-${result.result_id}`}
                  />
                )) ||
                (result.type === "SQL_QUERY_RUN_RESULT" && (
                  <DynamicTable
                    key={`message-${message.message.id}-table-${result.linked_id}`}
                    data={result.content}
                  />
                )) ||
                (result.type === "SQL_QUERY_STRING_RESULT" && (
                  <CodeBlock
                    key={`message-${message.message.id}-code-${result.result_id}`}
                    language="SQL_QUERY_STRING_RESULT"
                    code={result.content.sql}
                    resultId={result.result_id}
                    updateSQLRunResult={updateData}
                  />
                )) ||
                (result.type === "CHART_GENERATION_RESULT" && (
                  <Chart
                    resultId={result.result_id}
                    key={`message-${message.message.id}-chart-${result.result_id}`}
                    initialData={JSON.parse(result.content.chartjs_json)}
                    initialCreatedAt={new Date(result.created_at as string)}
                  ></Chart>
                ))
            )}

          <div className="flex justify-between lg:block">
            <div className="text-xs flex items-center justify-center gap-1 self-center pt-2 !invisible">
              <button
                disabled={false}
                className="dark:text-white disabled:text-gray-300 dark:disabled:text-gray-400"
              >
                <svg
                  stroke="currentColor"
                  fill="none"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <span className="flex-grow flex-shrink-0">1 / 1</span>
              <button
                disabled={false}
                className="dark:text-white disabled:text-gray-300 dark:disabled:text-gray-400"
              >
                <svg
                  stroke="currentColor"
                  fill="none"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
