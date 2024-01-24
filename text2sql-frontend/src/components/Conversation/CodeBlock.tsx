import SyntaxHighlighter from "react-syntax-highlighter";
import { IResultType } from "../Library/types";
import {
  ClipboardIcon,
  PlayIcon,
  BookmarkIcon as BookmarkIconOutline,
} from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkIconSolid } from "@heroicons/react/24/solid";
import CustomTooltip from "../Library/Tooltip";
import { monokai } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { format } from "prettier-sql";
import { Dialect } from "../Library/types";
import { useEffect, useRef, useState } from "react";

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const SPACES = ["Enter", "Tab", "Space", "Backspace"];

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
  oldCursorPosition: number
) {
  let formattedNonSpaceCount = 0;
  let i = 0;
  // Iterate through the formatted text to find the corresponding character position
  for (
    ;
    i < formattedText.length && formattedNonSpaceCount < oldCursorPosition;
    i++
  ) {
    if (!SPACES.includes(formattedText[i])) {
      formattedNonSpaceCount++;
    }
  }

  return Math.min(i, formattedText.length);
}
export const CodeBlock = ({
  code,
  language,
  runQuery,
  toggleSaveQuery,
  runnable,
  isSaved,
}: {
  code: string;
  language: IResultType;
  runQuery: (code: string) => void;
  toggleSaveQuery: () => void;
  runnable: boolean;
  isSaved?: boolean;
}) => {
  const [savedCode, setSavedCode] = useState<string>(code);
  const [formattedCode, setFormattedCode] = useState<string>(code);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lastChar, setLastChar] = useState<string>("");
  let BookmarkIcon = isSaved ? BookmarkIconSolid : BookmarkIconOutline;

  useEffect(() => {
    try {
      // Do not format if whitespace characters are being typed
      console.log(lastChar);
      if (SPACES.includes(lastChar)) {
        setFormattedCode(savedCode);
        console.log("not formatting");
        return;
      }

      const formatted = format(savedCode, { language: Dialect.Postgres });
      setFormattedCode(formatted);

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

      // TODO: Handle trailing spaces getting removed
    } catch (e) {
      console.log(e);
      setFormattedCode(savedCode);
    }
  }, [savedCode]);

  const handleTextUpdate = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // If the user is typing a space, don't update and reformat the saved code
    setSavedCode(e.target.value);
  };

  const handleKeyboardInput = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    setLastChar(e.code || e.key);

    // Handle tab key
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart, selectionEnd } = e.currentTarget;
      e.currentTarget.selectionStart = selectionStart + 2;
      e.currentTarget.selectionEnd = selectionEnd + 2;
    } else {
      setSavedCode(textareaRef.current?.value || "");
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="max-w-7xl border-2 border-gray-500 rounded-md bg-gray-900 flex flex-col relative"
      onKeyDown={() => textareaRef.current?.focus()}
      onClick={() => textareaRef.current?.focus()}
    >
      {/** TODO: Get the cursor to follow the reformatted text - make it based on index maybe? */}
      <textarea
        spellCheck={false}
        ref={textareaRef}
        className="absolute inset-0 resize-none bg-transparent text-red-300 p-2 font-mono caret-white outline-none appearance-none"
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
      {/* TODO: Make the lower icon layer be clickthrough so we can still click on the text. Only absorb click events on the icons themselves */}
      <div className="absolute bottom-0 right-0 m-1 flex gap-1">
        {/* Save Icon */}
        <button
          tabIndex={-1}
          className="group flex ml-auto gap-2 rounded-md p-1 bg-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200 disabled:dark:hover:text-gray-100 transition-all duration-150 ease-in-out"
        >
          <BookmarkIcon
            onClick={() => toggleSaveQuery()}
            className="w-5 h-5 [&>path]:stroke-[2] group-hover:-rotate-6"
          />
        </button>

        <CustomTooltip content="COPIED!" trigger="click">
          <button
            tabIndex={-1}
            onClick={() => copyToClipboard(savedCode)}
            className="group flex ml-auto gap-2 rounded-md p-1 bg-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200 disabled:dark:hover:text-gray-100 transition-all duration-150 ease-in-out"
          >
            <ClipboardIcon className="w-5 h-5 [&>path]:stroke-[2] group-hover:-rotate-6" />
          </button>
        </CustomTooltip>

        <button
          tabIndex={-1}
          className={classNames(
            runnable
              ? "hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-600 dark:hover:text-gray-200 disabled:dark:hover:text-gray-100"
              : "",
            "group flex ml-auto gap-2 rounded-md p-1 dark:text-gray-400 bg-gray-700 transition-all duration-150 ease-in-out"
          )}
          onClick={() => runQuery(savedCode)}
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
