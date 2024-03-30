import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { SetStateAction, useState } from "react";

type ExpandingInputProps = {
  onSubmit: (value: string) => void;
  disabled: boolean;
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const ExpandingInput: React.FC<ExpandingInputProps> = ({
  onSubmit,
  disabled,
}) => {
  const [inputValue, setInputValue] = useState("");

  const handleChange = (e: {
    target: {
      value: SetStateAction<string>;
      style: { height: string };
      scrollHeight: any;
    };
  }) => {
    setInputValue(e.target.value);
    e.target.style.height = "auto"; // Reset textarea height
    e.target.style.height = `${e.target.scrollHeight}px`; // Set textarea height based on content
  };

  const handleSubmit = () => {
    if (disabled) return;
    if (inputValue.length === 0) return;
    onSubmit(inputValue);
    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();

      // Reset textarea height
      e.currentTarget.style.height = "auto";
    }
  };

  return (
    <div className="flex flex-col justify-center w-full relative mb-7">
      <textarea
        disabled={disabled}
        name="email"
        id="email"
        className={classNames(
          disabled ? "placeholder:text-gray-600" : "placeholder:text-gray-400",
          "block rounded-xl border p-4 text-gray-900 shadow-sm sm:text-md sm:leading-6 resize-none dark:text-gray-200 dark:bg-gray-900 dark:border-gray-600 pr-12 overflow-y-hidden mr-1"
        )}
        style={{ height: "auto" }}
        rows={1}
        placeholder="Enter your message here..."
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyPress}
      />
      <div
        onClick={handleSubmit}
        className={classNames(
          inputValue.length > 0
            ? "dark:text-gray-800 dark:bg-gray-300 dark:hover:cursor-pointer"
            : "",
          "group absolute right-0 mr-4 -rotate-90 dark:text-gray-400 p-1 rounded-md transition-all duration-150"
        )}
      >
        <PaperAirplaneIcon
          className={classNames(
            inputValue.length > 0 ? "group-hover:-rotate-6" : "",
            "h-6 w-6 [&>path]:stroke-[2]"
          )}
        ></PaperAirplaneIcon>
      </div>
    </div>
  );
};

export default ExpandingInput;
