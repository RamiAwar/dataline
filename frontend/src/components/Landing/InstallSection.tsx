import { useState } from "react";
import { CustomTooltip } from "../Library/Tooltip";
import { ClipboardIcon } from "@heroicons/react/24/outline";
import logo_w_border from "@/assets/images/logo_w_border.png";

export const InstallSection = () => {
  const [selectedTab, setSelectedTab] = useState<string>("All");

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  const installationSections = [
    {
      title: "All",
      code: "https://github.com/RamiAwar/dataline/releases/latest",
    },
    {
      title: "Homebrew",
      code: "brew tap ramiawar/dataline && brew install dataline",
    },
  ];

  return (
    <div id="install" className="isolate mt-32 sm:mt-48">
      <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-16 bg-white/5 px-6 py-16 ring-1 ring-white/10 sm:rounded-3xl sm:p-8 lg:mx-20 lg:max-w-none lg:flex-row lg:items-center lg:py-20 xl:gap-x-20 xl:px-20 bg-teal-200">
          <img
            className="hidden lg:block h-32 w-full flex-none rounded-2xl object-contain lg:aspect-square lg:h-auto lg:max-w-[20vw]"
            src={logo_w_border}
            alt=""
          />
          <div className="mt-4 lg:mt-0 flex w-full flex-col items-center lg:flex-auto lg:items-start bg-red-200">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl text-center md:text-left">
              <span className="text-indigo-600">Heard enough?</span> Install
              DataLine.
            </h2>
            <div className="mt-6 flex justify-left">
              {installationSections.map((item) => (
                <button
                  className={`px-4 py-2 rounded-md ${selectedTab === item.title ? "bg-indigo-600 text-white" : "bg-transparent text-white"}`}
                  onClick={() => setSelectedTab(item.title)}
                >
                  {item.title}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              {installationSections.map((item) => (
                <>
                  {selectedTab === item.title && (
                    <div className="bg-gray-900 p-8 rounded-xl text-white flex items-center gap-5">
                      <code className="flex gap-2 text-wrap">
                        <pre>$</pre>
                        {item.code}
                      </code>
                      <CustomTooltip clickText="COPIED!" hoverText="Copy">
                        <button
                          tabIndex={-1}
                          onClick={() => copyToClipboard(item.code)}
                          className="p-1"
                        >
                          <ClipboardIcon className="w-6 h-6 [&>path]:stroke-[2] group-hover:-rotate-6" />
                        </button>
                      </CustomTooltip>
                    </div>
                  )}
                </>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div
        className="absolute inset-x-0 -top-16 -z-10 flex transform-gpu justify-center overflow-hidden blur-3xl"
        aria-hidden="true"
      >
        <div
          className="aspect-[1318/752] w-[82.375rem] flex-none bg-gradient-to-r from-[#80caff] to-[#4f46e5] opacity-25"
          style={{
            clipPath:
              "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
          }}
        />
      </div>
    </div>
  );
};
