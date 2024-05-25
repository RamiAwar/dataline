import { IResultType, ISQLQueryStringResult } from "@components/Library/types"
import { useEffect, useState } from "react";
import { SelectedTablesDisplay } from "../Library/SelectedTablesDisplay";
import { DynamicTable } from "../Library/DynamicTable";
import { CodeBlock } from "./CodeBlock";
import Chart from "../Library/Chart";

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(" ");
}

const BACKGROUND_COLORS = [
    "bg-gradient-to-r from-teal-500/10 via-green-500/10 to-blue-500/10",
    "bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10",
    "bg-gradient-to-r from-green-500/10 via-blue-500/10 to-indigo-500/10",
    "bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10",
]

function hash(str: string): number {
    let h: number = 0;
    for (let i = 0; i < str.length; i++) {
        h = 31 * h + str.charCodeAt(i);
    }
    return Math.round(h % 10)
}


export const MessageResultRenderer = ({
    initialResults,
    messageId
}: {
    initialResults: IResultType[],
    messageId: string,
}) => {
    const [results, setResults] = useState(initialResults);
    const [resultGroups, setResultGroups] = useState<IResultType[][]>([]);


    // Used by CodeBlock to replace the linked SQL query run when an SQL string is re-run
    // Necessary since the results are only present at this level and the codeblock can't modify them
    function updateLinkedSQLRun(sql_string_result_id: string, content: string) {
        // != null, rules out both null and undefined
        if (results != null && content != null) {

            // Remove SQL query run result linked to this ID if any
            const newResults = results?.filter(
                (result) => !(result.type === "SQL_QUERY_RUN_RESULT" && result.linked_id === sql_string_result_id)
            );

            const updatedResults = [
                ...newResults,
                {
                    type: "SQL_QUERY_RUN_RESULT",
                    linked_id: sql_string_result_id,
                    content,
                },
            ] as IResultType[];
            setResults(updatedResults);
        }
    }

    // Group and then sort results every time they change
    // Every group is identified by the first SQL Query String Result result_id
    // Other results are grouped with it if they have a linked_id that matches that result_id
    useEffect(() => {
        const groups: IResultType[][] = [];
        let currentGroup: IResultType[] = [];
        let currentGroupId: string | undefined = undefined;

        results?.forEach((result) => {
            if (result.type === "SQL_QUERY_STRING_RESULT") {
                // Submit current group if any
                if (currentGroupId !== undefined) {
                    groups.push(currentGroup);
                }

                // Reset group
                currentGroup = [result];
                currentGroupId = result.result_id;
            }
        });
        // Submit last group if any
        if (currentGroupId !== undefined) {
            groups.push(currentGroup);
        }

        // Loop over results again and loop over groups to add linked results to proper group
        results?.forEach((result) => {
            if (result.type === "SQL_QUERY_RUN_RESULT" || result.type === "CHART_GENERATION_RESULT") {
                const groupIndex = groups.findIndex((group) =>
                    (group[0] as ISQLQueryStringResult).result_id === result.linked_id
                );
                if (groupIndex !== -1) {
                    groups[groupIndex].push(result);
                } else {
                    console.log("Could not find group for result", result);
                }
            }
        });

        // Sort each group
        groups.forEach((group) => {
            group.sort((a, b) => {
                if (a.type === "CHART_GENERATION_RESULT") return -1;
                if (b.type === "CHART_GENERATION_RESULT") return 1;

                if (a.type === "SQL_QUERY_RUN_RESULT") return -1;
                if (b.type === "SQL_QUERY_RUN_RESULT") return 1;

                if (a.type === "SQL_QUERY_STRING_RESULT") return -1;
                if (b.type === "SQL_QUERY_STRING_RESULT") return 1;
                return 0;
            });
        });
        setResultGroups(groups);
        console.log(groups);

    }, [results]);


    return (
        <>
            {/** Sort results as selected_tables first, charts second, data third, code fourth using tertiary if **/}
            {resultGroups.map((group, index) => (
                <div
                    key={`message-${messageId}-group-${index}`}
                    // Alternate between bg-gray-800 and bg-indigo-800
                    className={classNames(
                        // include hash of message id to randomize across messages
                        resultGroups.length > 1 ? BACKGROUND_COLORS[(hash(messageId) + index) % BACKGROUND_COLORS.length] : "",
                        resultGroups.length > 1 ? "border border-gray-500 rounded-xl p-4" : "",
                        "flex flex-col gap-1 md:gap-3"
                    )}
                >
                    {
                        group.map((result) =>
                            (result.type === "SELECTED_TABLES" && (
                                <SelectedTablesDisplay
                                    tables={result.content.tables}
                                    key={`message-${messageId}-selectedtables-${result.result_id}`}
                                />
                            )) ||
                            (result.type === "SQL_QUERY_RUN_RESULT" && (
                                <DynamicTable
                                    key={`message-${messageId}-table-${result.linked_id}`}
                                    data={result.content}
                                />
                            )) ||
                            (result.type === "SQL_QUERY_STRING_RESULT" && (
                                <CodeBlock
                                    key={`message-${messageId}-code-${result.result_id}`}
                                    language="SQL_QUERY_STRING_RESULT"
                                    code={result.content.sql}
                                    resultId={result.result_id}
                                    updateSQLRunResult={updateLinkedSQLRun}
                                />
                            )) ||
                            (result.type === "CHART_GENERATION_RESULT" && (
                                <Chart
                                    resultId={result.result_id}
                                    key={`message-${messageId}-chart-${result.result_id}`}
                                    initialData={JSON.parse(result.content.chartjs_json)}
                                    initialCreatedAt={new Date(result.created_at as string)}
                                ></Chart>
                            ))
                        )
                    }
                </div >
            ))}
        </>
    )

}