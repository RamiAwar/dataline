import logo from "@/assets/images/logo_md.png";
import { IMessageWithResultsOut } from "@components/Library/types";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import { useGetAvatar } from "@/hooks";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { InfoTooltip } from "@components/Library/Tooltip";
import { MessageResultRenderer } from "./MessageResultRenderer";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const Message = ({
  message,
  className = "",
}: {
  message: IMessageWithResultsOut;
  className?: string;
}) => {
  const { data: avatarUrl } = useGetAvatar();

  return (
    <div
      className={classNames(
        message.message.role === "ai"
          ? "dark:bg-gray-800/40"
          : "dark:bg-gray-900",
        "w-full text-gray-800 dark:text-gray-100 bg-gray-50",
        className
      )}
    >
      <div className="flex p-4 gap-4 text-base md:gap-6 md:max-w-2xl lg:max-w-3xl xl:max-w-4xl md:py-6 lg:px-0 m-auto">
        <div className="flex-shrink-0 flex flex-col relative items-end">
          <div className="">
            <div className="relative p-1 rounded-sm text-white flex items-center justify-center">
              {message.message.role === "ai" ? (
                <div className="flex flex-col items-center">
                  <img src={logo} className="h-7 w-7" />
                  {message.message.options?.secure_data && (
                    <a href="https://dataline.app/faq" target="_blank">
                      <InfoTooltip hoverText="No data was sent to or processed by the AI in this message. Click to learn more about how we do this.">
                        <div className="text-green-400/90 mt-3 p-1 bg-green-400/20 rounded-full hover:bg-green-400/40 transition-colors duration-150 cursor-pointer">
                          <ShieldCheckIcon className="w-7 h-7" />
                        </div>
                      </InfoTooltip>
                    </a>
                  )}
                </div>
              ) : avatarUrl ? (
                <img
                  className="h-7 w-7 rounded-sm bg-gray-800"
                  src={avatarUrl}
                  alt=""
                />
              ) : (
                <UserCircleIcon className="text-gray-300 h-8 w-8 rounded-full " />
              )}
            </div>
          </div>
        </div>
        <div className="flex w-[calc(100%-50px)] flex-col gap-1 md:gap-3 lg:w-[calc(100%-115px)] scrollbar-hide">
          {message.message.content && (
            <div className="flex flex-grow flex-col gap-3">
              <div className="min-h-[20px] flex flex-col items-start gap-4 whitespace-pre-wrap break-words">
                <div className="markdown prose w-full break-words dark:prose-invert dark">
                  <p className=" leading-loose">{message.message.content}</p>
                </div>
              </div>
            </div>
          )}

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
