import { PaperAirplaneIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import { SetStateAction, useEffect, useRef, useState } from "react";

import { Switch, SwitchField, SwitchGroup } from "../Catalyst/switch";
import { Description, Fieldset, Label } from "../Catalyst/fieldset";

import { Transition } from "@headlessui/react";

import {
  useGetRelatedConnection,
  readMessageOptionsFromLocalStorage,
  saveMessageOptionsToLocalStorage,
} from "@/hooks";
import { useClickOutside } from "../Library/utils";
import { useLocation } from "react-router-dom";

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
  const location = useLocation();
  const currConnection = useGetRelatedConnection();

  const [messageOptions, setMessageOptions] = useState(() =>
    readMessageOptionsFromLocalStorage(currConnection?.id)
  );
  const settingsPopupRef = useRef<HTMLDivElement | null>(null);
  useClickOutside([settingsPopupRef, cogRef], () => {
    setIsShown(false);
  });
  useEffect(() => {
    setMessageOptions(readMessageOptionsFromLocalStorage(currConnection?.id));
  }, [location, currConnection]);

  // TODO: USE HEIGHT OF POPUP TO TRANSLATE UPWARD OR OTHER SOLUTION LIKE BOTTOM 0 RELATIVE TO SOMETHING ELSE
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
          "absolute left-0 -top-24 border p-4 bg-gray-900 border-gray-600 rounded-xl"
        )}
      >
        <Fieldset>
          <SwitchGroup>
            <SwitchField>
              <Label>Data Security</Label>
              <Description className={"truncate"}>
                Hide your data from the AI model
              </Description>
              <Switch
                color="teal"
                checked={messageOptions?.secure_data}
                onChange={(checked) => {
                  setMessageOptions((prevOptions) => ({
                    ...prevOptions,
                    secure_data: !prevOptions.secure_data,
                  }));
                  saveMessageOptionsToLocalStorage(currConnection!.id, {
                    secure_data: checked,
                  });
                }}
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
          "block rounded-xl border p-4 text-gray-900 shadow-sm sm:text-md sm:leading-6 resize-none dark:text-gray-200 dark:bg-gray-900 dark:border-gray-600 px-12 overflow-y-hidden mr-1"
        )}
        style={{ height: "auto" }}
        rows={1}
        placeholder="Enter your message here..."
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyPress}
      />

      <MessageSettingsPopup
        isShown={messageSettingsShown}
        setIsShown={setMessageSettingsShown}
        settingsCogRef={settingsCogRef}
      />
      <div
        ref={settingsCogRef}
        onClick={() => {
          setMessageSettingsShown((prev) => !prev);
        }}
        className={
          "hover:cursor-pointer hover:bg-white/10 group absolute left-0 dark:text-gray-400 ml-2 p-1 rounded-md transition-all duration-150"
        }
      >
        <Cog6ToothIcon
          className={"hover:-rotate-6 h-6 w-6 [&>path]:stroke-[2]"}
        />
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
