type StarterMessageProps = {
  text: string;
  onClick?: () => void;
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const StarterMessage: React.FC<StarterMessageProps> = ({ text, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={classNames(
        "flex items-center grow rounded-md border-2 p-3 min-h-[55px]",
        "placeholder:text-gray-400 text-gray-900 shadow-sm sm:text-md sm:leading-6",
        "dark:text-gray-200 dark:bg-gray-700 dark:border-gray-800",
        onClick
          ? "cursor-pointer dark:hover:bg-gray-600 dark:hover:border-gray-700"
          : ""
      )}
    >
      <span
        className="overflow-hidden text-ellipsis whitespace-nowrap"
        style={{ height: "auto" }}
      >
        {text}
      </span>
    </div>
  );
};

export default StarterMessage;
