import {
  PaperAirplaneIcon,
  Cog6ToothIcon,
  ShieldExclamationIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { SetStateAction, useRef, useState } from "react";

import { Switch, SwitchField, SwitchGroup } from "../Catalyst/switch";
import { Description, Fieldset, Label } from "../Catalyst/fieldset";

import { Transition } from "@headlessui/react";

import {
  useGetRelatedConnection,
  getMessageOptions,
  usePatchMessageOptions,
} from "@/hooks";
import { useClickOutside } from "../Library/utils";
import { useQuery } from "@tanstack/react-query";

const secureIcon = (
  <svg
    width="8"
    height="13"
    viewBox="0 0 8 13"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="ml-px"
  >
    <rect
      x="0.15"
      y="5.15"
      width="7.7"
      height="7.7"
      rx="0.35"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.3"
    />
    <path
      d="M6 5V3C6 1.89543 5.10457 1 4 1V1C2.89543 1 2 1.89543 2 3V5"
      stroke="currentColor"
      strokeWidth="0.7"
    />
  </svg>
);

const unsecureIcon = (
  <svg
    width="10"
    height="14"
    viewBox="0 0 10 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="1.15"
      y="5.15"
      width="7.7"
      height="7.7"
      rx="0.35"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.3"
    />
    <path
      d="M7 5V3C7 1.89543 6.10457 1 5 1V1C3.89543 1 3 1.89543 3 3V5"
      stroke="currentColor"
      strokeWidth="0.7"
    />
    <line
      x1="9.35355"
      y1="4.40343"
      x2="0.353553"
      y2="13.4034"
      stroke="#FF0000"
      strokeWidth="1.5"
    />
  </svg>
);

type ExpandingInputProps = {
  onSubmit: (value: string) => void;
  disabled: boolean;
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

type MessageSettingsPopupProps = {
  isShown: boolean;
  setIsShown: (val: boolean) => void;
  settingsCogRef: React.MutableRefObject<HTMLDivElement | null>;
};

const MessageSettingsPopup: React.FC<MessageSettingsPopupProps> = ({
  isShown,
  setIsShown,
  settingsCogRef: cogRef,
}) => {
  const currConnection = useGetRelatedConnection();
  const { data: messageOptions } = useQuery(
    getMessageOptions(currConnection?.id)
  );
  const { mutate: patchMessageOptions } = usePatchMessageOptions(
    currConnection?.id
  );
  const settingsPopupRef = useRef<HTMLDivElement | null>(null);
  useClickOutside([settingsPopupRef, cogRef], () => {
    setIsShown(false);
  });

  return (
    <Transition
      show={isShown}
      enter="transition-opacity duration-200"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition-opacity duration-200"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div
        ref={settingsPopupRef}
        className={classNames(
          "absolute left-0 bottom-1 border p-4 bg-gray-900 border-gray-600 rounded-xl"
        )}
      >
        <Fieldset>
          <SwitchGroup>
            <SwitchField>
              <Label className="flex items-center">
                Data Security{" "}
                {messageOptions?.secure_data ? (
                  <ShieldCheckIcon
                    className={
                      "ml-2 h-3 w-3 [&>path]:stroke-[2] text-green-400"
                    }
                  />
                ) : (
                  <ShieldExclamationIcon
                    className={"ml-2 h-3 w-3 [&>path]:stroke-[2] text-red-400"}
                  />
                )}
              </Label>
              <Description>Hide your data from the AI model</Description>
              <Switch
                color="green"
                checked={messageOptions?.secure_data}
                onChange={(checked) =>
                  patchMessageOptions({ secure_data: checked })
                }
                name="data_security"
              />
            </SwitchField>
          </SwitchGroup>
        </Fieldset>
      </div>
    </Transition>
  );
};
const ExpandingInput: React.FC<ExpandingInputProps> = ({
  onSubmit,
  disabled,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [messageSettingsShown, setMessageSettingsShown] = useState(false);
  const currConnection = useGetRelatedConnection();
  const { data: messageOptions } = useQuery(
    getMessageOptions(currConnection?.id)
  );
  const settingsCogRef = useRef<HTMLDivElement | null>(null);

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
    <div className="flex flex-col justify-center w-full relative mb-4">
      <textarea
        disabled={disabled}
        name="email"
        id="email"
        className={classNames(
          disabled ? "placeholder:text-gray-600" : "placeholder:text-gray-400",
          "block rounded-xl border p-4 text-gray-900 shadow-sm sm:text-md sm:leading-6 resize-none dark:text-gray-200 dark:bg-gray-900 dark:border-gray-600 pl-14 pr-12 overflow-y-hidden mr-1"
        )}
        style={{ height: "auto" }}
        rows={1}
        placeholder="Enter your message here..."
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyPress}
      />
      <div className="absolute left-0 top-0 w-full">
        <MessageSettingsPopup
          isShown={messageSettingsShown}
          setIsShown={setMessageSettingsShown}
          settingsCogRef={settingsCogRef}
        />
      </div>
      <div
        ref={settingsCogRef}
        onClick={() => setMessageSettingsShown((prev) => !prev)}
        className={
          "hover:cursor-pointer hover:bg-white/10 group absolute flex items-center left-0 dark:text-gray-400 ml-2 p-1 rounded-md transition-all duration-150"
        }
      >
        <Cog6ToothIcon
          className={"hover:-rotate-6 h-6 w-6 [&>path]:stroke-[2]"}
        />
        <div className="dark:text-gray-400 ml-1 bg-transparent">
          {messageOptions?.secure_data ? secureIcon : unsecureIcon}
        </div>
      </div>
      <div
        onClick={handleSubmit}
        className={classNames(
          inputValue.length > 0
            ? "dark:text-gray-700 dark:bg-gray-300 dark:hover:cursor-pointer"
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
