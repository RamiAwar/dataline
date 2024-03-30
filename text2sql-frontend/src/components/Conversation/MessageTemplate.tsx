type MessageTemplateProps = {
  title?: string;
  text: string;
  onClick?: () => void;
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const MessageTemplate: React.FC<MessageTemplateProps> = ({
  title,
  text,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={classNames(
        "flex flex-col justify-center rounded-xl border px-5 py-3 min-h-[10px] transition-colors duration-100",
        "text-gray-900 shadow-sm sm:text-md sm:leading-6",
        "dark:text-gray-300 dark:border-gray-700",
        "cursor-pointer dark:hover:bg-gray-700/30"
      )}
    >
      {title && (
        <span className="font-semibold text-gray-900 dark:text-gray-400">
          {title}
        </span>
      )}
      <span className="overflow-hidden text-ellipsis whitespace-nowrap dark:text-gray-500">
        {text}
      </span>
    </div>
  );
};

export default MessageTemplate;
