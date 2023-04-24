import { QuestionMarkCircleIcon } from "@heroicons/react/20/solid";
import "./NumberField.css";
import { Tooltip } from "flowbite-react";

export default function LimitNumberField({
  placeholder,
  className = "",
  onChange = () => {},
  onKeyDown = () => {},
  disabled,
}: {
  placeholder: number;
  className?: string;
  onChange?: (value: number) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <label
        htmlFor="num"
        className={
          "block text-md font-normal text-gray-200" +
          (disabled ? " text-gray-400" : "")
        }
      >
        Limit
      </label>
      <div className="ml-2 relative rounded-md shadow-sm">
        <input
          disabled={disabled}
          type="number"
          name="num"
          id="num"
          className={
            "block w-full rounded-md border-0 py-1.5 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" +
            (disabled ? " bg-gray-300" : "")
          }
          placeholder={`${placeholder}`}
          onChange={(event) => {
            event.preventDefault();
            onChange(parseInt(event.target.value));
          }}
          onKeyDown={onKeyDown}
        />
        <Tooltip
          content="Limit the number of results returned by the query"
          style="light"
          placement="bottom"
          animation="duration-500"
        >
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <QuestionMarkCircleIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </div>
        </Tooltip>
      </div>
    </div>
  );
}
