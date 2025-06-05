import SyntaxHighlighter from "react-syntax-highlighter";
import {
  ClipboardIcon,
  PlayIcon,
  BookmarkIcon as BookmarkIconOutline,
  QuestionMarkCircleIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";
import { CustomTooltip } from "../Library/Tooltip";
import { monokai } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { format } from "prettier-sql";
import { useEffect, useRef, useState } from "react";
import { useRunSqlInConversation, useUpdateSqlQuery } from "@/hooks";
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
} from "../Catalyst/alert";
import { Button } from "../Catalyst/button";
import { Dialect } from "../Library/types";
import Minimizer from "../Minimizer/Minimizer";

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const SPACES = ["Enter", "Tab", "Space", "Backspace"];
const SPACE_CHARACTERS = [" ", "\n", "\t", "\r"];

// Helper function to get cursor position without considering spaces
function getCursorPositionWithoutSpaces(
  text: string,
  originalCursorPosition: number
) {
  const textBeforeCursor = text.substring(0, originalCursorPosition);
  const nonSpaceCharacters = textBeforeCursor.replace(/\s/g, "");
  return nonSpaceCharacters.length;
}

// Helper function to get new cursor position after formatting
function getNewCursorPosition(
  formattedText: string,
  lastCharacterPosition: number
) {
  let nonSpaceCharacterCount = 0;
  let i = 0;

  // Iterate through formatted text until we reach the same non-space character
  // count as the original text's character count
  for (; i < formattedText.length; i++) {
    if (nonSpaceCharacterCount === lastCharacterPosition) {
      break;
    }

    if (!SPACE_CHARACTERS.includes(formattedText[i])) {
      nonSpaceCharacterCount++;
    }
  }

  return i;
}

type SupportedFormatters =
  | "bigquery"
  | "db2"
  | "hive"
  | "mariadb"
  | "mysql"
  | "n1ql"
  | "plsql"
  | "postgresql"
  | "redshift"
  | "spark"
  | "sql"
  | "tsql";

const formattedCodeOrInitial = (code: string, dialect: SupportedFormatters) => {
  try {
    return format(code, { language: dialect || Dialect.Postgres });
  } catch {
    return code;
  }
};

export const CodeBlock = ({
  code,
  dialect,
  resultId,
  onUpdateSQLRunResult,
  onSaveSQLStringResult,
  forChart = false,
  minimize,
  hideSqlByDefault,
  resultType,
}: {
  code: string;
  resultId: string;
  dialect?: string;
  onUpdateSQLRunResult: (sql_string_result_id: string, arg: string) => void;
  onSaveSQLStringResult: (
    data?: { created_at: string; chartjs_json: string } | void
  ) => void;
  forChart: boolean;
  minimize?: boolean;
  hideSqlByDefault?: boolean;
  resultType?: string;
}) => {
  const [savedCode, setSavedCode] = useState<string>(() =>
    formattedCodeOrInitial(code, dialect as SupportedFormatters)
  );
  const [formattedCode, setFormattedCode] = useState<string>(() =>
    formattedCodeOrInitial(code, dialect as SupportedFormatters)
  );
  // Determine if SQL should be minimized by default based on user preference
  const effectiveDialectIsSql =
    dialect?.toLowerCase() === "sql" ||
    (resultType === "SQL_QUERY_STRING_RESULT" && dialect === undefined);
  const [minimized, setMinimized] = useState(
    minimize || (hideSqlByDefault && effectiveDialectIsSql) || false
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const syntaxHighlighterId = `syntax-highlighter-${resultId}`;

  const [lastChar, setLastChar] = useState<string>("");
  // let BookmarkIcon = isSaved ? BookmarkIconSolid : BookmarkIconOutline;
  const BookmarkIcon = BookmarkIconOutline;
  const extraSpace = "";

  const { isPending: isPendingRunSql, mutate: runSql } =
    useRunSqlInConversation(
      {
        sql: savedCode,
        resultId: resultId,
      },
      {
        onSettled: (data, error) => {
          if (error) {
            console.error("onsettled error in: ", error);
          } else {
            if (data?.content) {
              onUpdateSQLRunResult(resultId, data.content as string);
            }
          }
        },
      }
    );

  const { isPending: isPendingSaveSql, mutate: updateSQL } = useUpdateSqlQuery({
    onSettled: (data, error) => {
      if (error) {
        console.error("onsettled error in: ", error);
      } else {
        onSaveSQLStringResult(data);
      }
    },
  });

  function saveNewSQLString() {
    if (!resultId) return;
    updateSQL({
      sqlStringResultId: resultId,
      code: savedCode,
      forChart: forChart,
    });
  }

  useEffect(() => {
    try {
      // Do not format if whitespace characters are being typed
      if (SPACES.includes(lastChar)) {
        setFormattedCode(savedCode + extraSpace);
        return;
      }

      // If no characters are different from the saved code, don't format (ignoring spaces)
      const savedCodeWithoutSpaces = savedCode.replace(/\s/g, "");
      const formattedCodeWithoutSpaces = formattedCode.replace(/\s/g, "");
      if (
        lastChar != "" &&
        savedCodeWithoutSpaces === formattedCodeWithoutSpaces
      ) {
        return;
      }

      const formatted = format(savedCode, {
        language: (dialect as SupportedFormatters) || Dialect.Postgres,
      });
      setFormattedCode(formatted + extraSpace);

      if (textareaRef.current !== null) {
        // Calculate old cursor position without considering spaces
        const oldCursorPosition = getCursorPositionWithoutSpaces(
          savedCode,
          textareaRef.current.selectionStart
        );

        textareaRef.current.value = formatted;

        // Calculate new cursor position after formatting
        const newCursorPosition = getNewCursorPosition(
          formatted,
          oldCursorPosition
        );

        textareaRef.current.setSelectionRange(
          newCursorPosition,
          newCursorPosition,
          "forward"
        );
      }
    } catch (e) {
      setFormattedCode(savedCode);
    }
  }, [savedCode, formattedCode, lastChar, dialect]);

  useEffect(() => {
    if (!minimized && textareaRef.current !== null) {
      textareaRef.current.value = formattedCode;
    }
  }, [minimized, formattedCode, textareaRef]);

  const handleTextUpdate = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // If the user is typing a space, don't update and reformat the saved code
    setSavedCode(e.target.value);
  };

  const handleKeyboardInput = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    setLastChar(e.code || e.key);

    // Special condition: handle tab key
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart, selectionEnd } = e.currentTarget;
      // Modify current textarea value by adding 2 spaces at the cursor position
      e.currentTarget.value =
        e.currentTarget.value.substring(0, selectionStart) +
        "  " +
        e.currentTarget.value.substring(selectionEnd);
      e.currentTarget.selectionStart = selectionStart + 2;
      e.currentTarget.selectionEnd = selectionEnd + 2;
      // Handle non-letter keys
    } else {
      setSavedCode(textareaRef.current?.value || "");
    }
  };

  // Mirror textarea horizontal and vertical scroll to syntax highlighter
  const mirrorScroll = () => {
    if (textareaRef.current !== null) {
      const { scrollLeft, scrollTop } = textareaRef.current;
      const syntaxHighlighter = document.getElementById(syntaxHighlighterId);
      if (syntaxHighlighter !== null) {
        syntaxHighlighter.scrollLeft = scrollLeft;
        syntaxHighlighter.scrollTop = scrollTop;
      }
    }
  };

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const openSQLForChartHelp = () => {
    setIsHelpOpen(true);
  };

  return (
    <Minimizer
      minimized={minimized}
      setMinimized={setMinimized}
      label={
        hideSqlByDefault && dialect?.toLowerCase() === "sql" && minimized
          ? "SQL code hidden by default. You can change this in settings."
          : "Code block"
      }
      classes="bg-gray-900"
    >
      <div
        role="button"
        tabIndex={0}
        className="flex flex-col relative"
        onKeyDown={() => textareaRef.current?.focus()}
        onClick={() => textareaRef.current?.focus()}
      >
        <textarea
          spellCheck={false}
          ref={textareaRef}
          className="absolute h-full w-full border-0 inset-0 resize-none bg-transparent overflow-y-hidden overflow-x-scroll text-transparent p-2 font-mono caret-white outline-none focus:outline-none focus:border focus:ring-0 focus:rounded-xl whitespace-pre"
          onChange={handleTextUpdate}
          onKeyDown={handleKeyboardInput}
          onScroll={mirrorScroll}
        />
        <SyntaxHighlighter
          // add dynamic ID based on resultId
          id={syntaxHighlighterId}
          children={formattedCode}
          language="sql" // TODO: make dynamic to support multiple DB dialects?
          style={monokai}
          wrapLines={true}
          customStyle={{
            flex: "1",
            overflow: "scroll",
            scrollbarWidth: "none",
            background: "transparent",
          }}
        />

        {/* Top right corner icons */}
        <div className="absolute top-0 right-0 m-2 flex gap-1">
          {/* Help Icon */}
          {forChart && (
            <CustomTooltip hoverText="Help">
              <button
                tabIndex={-1}
                onClick={openSQLForChartHelp}
                className="p-1"
              >
                <QuestionMarkCircleIcon className="w-6 h-6 [&>path]:stroke-[2] group-hover:-rotate-12" />
              </button>
            </CustomTooltip>
          )}
        </div>

        <div className="absolute bottom-0 right-0 m-2 flex gap-1">
          {/* Minimize Icon */}
          <CustomTooltip hoverText="Minimize">
            {/* On minimize, also collapse if already expanded */}
            <button
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                setMinimized(true);
              }}
              className="p-1"
            >
              <MinusIcon className="w-6 h-6 [&>path]:stroke-[2] group-hover:-rotate-6" />
            </button>
          </CustomTooltip>

          {/* Save Icon */}
          <CustomTooltip hoverText="Save">
            <button
              tabIndex={-1}
              onClick={saveNewSQLString}
              className="p-1"
              disabled={isPendingSaveSql}
            >
              <BookmarkIcon
                className={classNames(
                  isPendingSaveSql ? "animate-spin" : "group-hover:-rotate-6",
                  "w-6 h-6 [&>path]:stroke-[2]"
                )}
              />
            </button>
          </CustomTooltip>

          {/* Copy Icon */}
          <CustomTooltip clickText="COPIED!" hoverText="Copy">
            <button
              tabIndex={-1}
              onClick={() => copyToClipboard(savedCode)}
              className="p-1"
            >
              <ClipboardIcon className="w-6 h-6 [&>path]:stroke-[2] group-hover:-rotate-6" />
            </button>
          </CustomTooltip>

          {/* Run Icon */}
          <CustomTooltip hoverText="Run">
            <button
              tabIndex={-1}
              onClick={() => {
                runSql();
              }}
              disabled={isPendingRunSql}
              className="p-1"
            >
              <PlayIcon
                className={classNames(
                  isPendingRunSql ? "animate-spin" : "group-hover:-rotate-12",
                  "w-6 h-6 [&>path]:stroke-[2]"
                )}
              />
            </button>
          </CustomTooltip>
        </div>

        {/* Help for editing queries when codeblock is linked to a chart */}
        {forChart && (
          <Alert className="lg:ml-72" open={isHelpOpen} onClose={setIsHelpOpen}>
            <AlertTitle>
              Quick overview of how you can edit chart-linked queries
            </AlertTitle>
            <AlertDescription>
              Charts are generated from the SQL results automatically. <br />
              <br />
              The first column returned by the query is used as the x-axis, and
              the second column is used as the y-axis.
              <br />
              <br />
              You can edit the query to change the chart type, add filters, or
              change the x-axis and y-axis columns.
              <br />
              <br />
              But the query must return at least two columns for the basic chart
              types to work (labels and values respectively).
            </AlertDescription>
            <AlertActions>
              <Button plain onClick={() => setIsHelpOpen(false)}>
                Got it!
              </Button>
            </AlertActions>
          </Alert>
        )}
      </div>
    </Minimizer>
  );
};
