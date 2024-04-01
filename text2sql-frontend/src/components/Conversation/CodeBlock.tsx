import SyntaxHighlighter from "react-syntax-highlighter";
import { IResultType } from "../Library/types";
import {
  ClipboardIcon,
  PlayIcon,
  BookmarkIcon as BookmarkIconOutline,
} from "@heroicons/react/24/outline";
import CustomTooltip from "../Library/Tooltip";
import { monokai } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { format } from "prettier-sql";
import { Dialect } from "../Library/types";
import { useEffect, useRef, useState } from "react";
import { useRunSql, useUpdateSqlQuery } from "@/hooks";
import { useParams } from "react-router-dom";

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
export const CodeBlock = ({
  code,
  language,
  resultId,
  updateMessage,
}: {
  code: string;
  resultId?: string;
  language: IResultType;
  updateMessage: (arg: string) => void;
}) => {
  const { conversationId } = useParams<{ conversationId: string }>();

  const [enabled, setEnabled] = useState<boolean>(false);
  const [savedCode, setSavedCode] = useState<string>(code);
  const [formattedCode, setFormattedCode] = useState<string>(code);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lastChar, setLastChar] = useState<string>("");
  // let BookmarkIcon = isSaved ? BookmarkIconSolid : BookmarkIconOutline;
  const BookmarkIcon = BookmarkIconOutline;
  const extraSpace = ""; // "\n\n\n";

  const { mutate } = useUpdateSqlQuery();

  const { isLoading, data } = useRunSql({
    id: conversationId,
    sql: savedCode,
    enabled,
  });

  function updateQuery() {
    if (!resultId) return;
    mutate({ id: resultId, code: savedCode });
  }

  useEffect(() => {
    if (data && enabled) {
      setEnabled(false);
      data?.content && updateMessage(data.content);
    }
  }, [enabled, data, updateMessage]);

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

      const formatted = format(savedCode, { language: Dialect.Postgres });
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
  }, [savedCode, formattedCode, lastChar]);

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

  return (
    <div
      role="button"
      tabIndex={0}
      className="max-w-7xl border border-gray-500 rounded-xl bg-gray-900 flex flex-col relative"
      onKeyDown={() => textareaRef.current?.focus()}
      onClick={() => textareaRef.current?.focus()}
    >
      {/** TODO: Get the cursor to follow the reformatted text - make it based on index maybe? */}
      <textarea
        spellCheck={false}
        ref={textareaRef}
        className="absolute h-full w-full border-0 inset-0 resize-none bg-transparent overflow-hidden text-transparent p-2 font-mono caret-white outline-none focus:outline-none focus:rounded-xl"
        onChange={handleTextUpdate}
        onKeyDown={handleKeyboardInput}
      />
      <SyntaxHighlighter
        children={formattedCode}
        language={language}
        style={monokai}
        wrapLines={true}
        customStyle={{
          flex: "1",
          background: "transparent",
        }}
      />
      <div className="absolute bottom-0 right-0 m-1 flex gap-1">
        {/* Save Icon */}
        <CustomTooltip content="Save" trigger="hover">
          <button
            tabIndex={-1}
            onClick={updateQuery}
            className="group flex ml-auto gap-2 rounded-md p-1 bg-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200 disabled:dark:hover:text-gray-100 transition-all duration-150 ease-in-out"
          >
            <BookmarkIcon className="w-6 h-6 [&>path]:stroke-[2] group-hover:-rotate-6" />
          </button>
        </CustomTooltip>

        <CustomTooltip content="COPIED!" trigger="click">
          <CustomTooltip content="Copy" trigger="hover">
            <button
              tabIndex={-1}
              onClick={() => copyToClipboard(savedCode)}
              className="group flex ml-auto gap-2 rounded-md p-1 bg-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200 disabled:dark:hover:text-gray-100 transition-all duration-150 ease-in-out"
            >
              <ClipboardIcon className="w-6 h-6 [&>path]:stroke-[2] group-hover:-rotate-6" />
            </button>
          </CustomTooltip>
        </CustomTooltip>

        <CustomTooltip content="Run" trigger="hover">
          <button
            tabIndex={-1}
            className={classNames(
              !isLoading
                ? "hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-600 dark:hover:text-gray-200 disabled:dark:hover:text-gray-100"
                : "",
              "group flex ml-auto gap-2 rounded-md p-1 dark:text-gray-400 bg-gray-700 transition-all duration-150 ease-in-out"
            )}
            onClick={() => setEnabled(true)}
            disabled={isLoading}
          >
            <PlayIcon
              className={classNames(
                isLoading ? "animate-spin" : "group-hover:-rotate-12",
                "w-6 h-6 [&>path]:stroke-[2]"
              )}
            />
          </button>
        </CustomTooltip>
      </div>
    </div>
  );
};
