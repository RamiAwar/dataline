import logo from "@/assets/images/logo_md.png";
import { IMessageWithResultsOut } from "@components/Library/types";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import { useGetAvatar } from "@/hooks";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { InfoTooltip } from "@components/Library/Tooltip";
import { MessageResultRenderer } from "./MessageResultRenderer";
import { Spinner } from "../Spinner/Spinner";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const MessageIcon = ({ message }: { message: IMessageWithResultsOut }) => {
  const { data: avatarUrl } = useGetAvatar();

  return message.message.role === "ai" ? (
    <div className="flex flex-col shrink-0 items-center mt-2 ">
      <img src={logo} className="h-8 w-8 rounded-md" />
      {message.message.options?.secure_data && (
        <a href="https://dataline.app/faq" target="_blank">
          <InfoTooltip hoverText="No data was sent to or processed by the AI in this message. Click to learn more about how we do this.">
            <div className="text-green-400/90 mt-3 bg-green-400/20 rounded-full hover:bg-green-400/40 transition-colors duration-150 cursor-pointer p-1">
              <ShieldCheckIcon className="w-6 h-6" />
            </div>
          </InfoTooltip>
        </a>
      )}
    </div>
  ) : avatarUrl ? (
    <img
      className="h-8 w-8 rounded-md mt-2 object-cover"
      src={avatarUrl}
      alt=""
    />
  ) : (
    <UserCircleIcon className="text-gray-300 h-8 w-8 mt-1 rounded-full" />
  );
};

export const Message = ({
  message,
  className = "",
  streaming = false,
}: {
  message: IMessageWithResultsOut;
  className?: string;
  streaming?: boolean;
}) => {
  return (
    <div
      className={classNames(
        message.message.role === "ai" ? "bg-gray-700/30" : "bg-gray-900",
        "w-full text-gray-100",
        className
      )}
    >
      <div className="text-base md:max-w-2xl lg:max-w-2xl xl:max-w-2xl py-4 md:py-6 lg:px-0 m-auto">
        <div className="px-1 w-full flex flex-col gap-2 md:gap-6 scrollbar-hide">
          <div className="px-2 md:px-0 flex justify-center gap-2 sm:gap-4 md:gap-6">
            <div className="flex flex-col shrink-0">
              <MessageIcon message={message} />
            </div>
            {message.message.content && (
              <div className="flex flex-grow">
                <div className="min-h-[20px] flex whitespace-pre-wrap break-words">
                  <div className="markdown prose w-full break-words dark:prose-invert dark">
                    <div className="flex gap-2">
                      {streaming && (
                        <div className="flex items-center">
                          <Spinner />
                        </div>
                      )}
                      <p className=" leading-loose">
                        {message.message.content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/** RESULTS: QUERY, DATA, PLOTS */}
          <MessageResultRenderer
            initialResults={message.results || []}
            messageId={message.message.id || ""}
          />
        </div>
      </div>
    </div>
  );
};
