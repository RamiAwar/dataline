type MessageTemplateProps = {
  text: string;
  onClick?: () => void;
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const MessageTemplate: React.FC<MessageTemplateProps> = ({ text, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={classNames(
        "flex items-center grow rounded-xl border p-6 min-h-[55px] transition-colors duration-100",
        "text-gray-900 shadow-sm sm:text-md sm:leading-6",
        "dark:text-gray-300 dark:border-gray-700",
        "cursor-pointer dark:hover:bg-gray-750"
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

export default MessageTemplate;
