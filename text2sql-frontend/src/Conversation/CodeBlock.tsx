import SyntaxHighlighter from "react-syntax-highlighter";
import { IResultType } from "./types";
import monokai from "./CodeStyles/monokai";
import { ClipboardIcon } from "@heroicons/react/24/outline";
import Tooltip from "../../src/Library/Tooltip";
import { FloatingDelayGroup } from "@floating-ui/react";
import CustomTooltip from "../../src/Library/Tooltip";

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export const CodeBlock = ({
  code,
  language,
}: {
  code: string;
  language: IResultType;
}) => {
  return (
    <div className="max-w-7xl border-2 border-gray-500 rounded-md bg-gray-900 flex flex-col relative">
      {/* <span className="w-fit px-2 font-mono italic text-gray-400 font-medium rounded-sm m-1 mb-2">
        {language}
      </span> */}

      <SyntaxHighlighter children={code} language={language} style={monokai} />

      <div
        className="absolute bottom-0 right-0 m-1"
        onClick={() => copyToClipboard(code)}
      >
        <CustomTooltip content="COPIED!" trigger="click">
          <button className="group flex ml-auto gap-2 rounded-md p-1 bg-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200 disabled:dark:hover:text-gray-100 transition-all duration-150 ease-in-out">
            <ClipboardIcon className="w-5 h-5 [&>path]:stroke-[2] group-hover:-rotate-6" />
          </button>
        </CustomTooltip>
      </div>
    </div>
  );
};
