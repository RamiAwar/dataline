import { QuestionMarkCircleIcon } from "@heroicons/react/20/solid";
import "./NumberField.css";

export default function NumberField({
  placeholder,
  className = "",
  onChange = () => {},
}: {
  placeholder: number;
  className?: string;
  onChange?: (value: number) => void;
}) {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <label htmlFor="num" className="block text-md font-normal text-gray-200">
        Limit
      </label>
      <div className="ml-2 relative rounded-md shadow-sm">
        <input
          type="number"
          name="num"
          id="num"
          className="block w-full rounded-md border-0 py-1.5 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          placeholder={`${placeholder}`}
          onChange={(event) => {
            event.preventDefault();
            onChange(parseInt(event.target.value));
          }}
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <QuestionMarkCircleIcon
            className="h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
