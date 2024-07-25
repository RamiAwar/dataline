import React, { useState, useEffect } from "react";
import { CustomTooltip } from "../Library/Tooltip";
import { ClipboardIcon } from "@heroicons/react/24/outline";
import {
  DownloadReleaseButton,
  OS,
} from "@components/Landing/DownloadReleaseButton";
import logo_w_border from "@/assets/images/logo_w_border.png";

interface Item {
  title: string;
  os?: OS;
  isDownloadable: boolean;
  code?: string;
}

export const InstallSection = () => {
  const [selectedTab, setSelectedTab] = useState<string>("All");

  useEffect(() => {
    const detectOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (userAgent.indexOf("win") > -1) return "Windows";
      if (userAgent.indexOf("mac") > -1) return "MacOS";
      if (userAgent.indexOf("linux") > -1) return "Linux";
      return "All";
    };
    setSelectedTab(detectOS());
  }, []);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  const installationSections: Item[] = [
    {
      title: "MacOS",
      isDownloadable: true,
      os: "darwin",
    },
    {
      title: "Windows",
      isDownloadable: true,
      os: "windows",
    },
    {
      title: "Linux",
      isDownloadable: true,
      os: "linux",
    },
    {
      title: "Homebrew",
      isDownloadable: false,
      code: "brew tap ramiawar/dataline && brew install dataline",
    },
    {
      title: "Docker",
      isDownloadable: false,
      code: "docker run -p 2222:2222 -p 7377:7377 -v dataline:/home/.dataline --name dataline ramiawar/dataline:latest",
    },
    {
      title: "GH Releases",
      code: "https://github.com/RamiAwar/dataline/releases",
      isDownloadable: false,
    },
  ];

  return (
    <div id="install" className="isolate mt-32 sm:mt-48">
      <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-16 bg-white/5 px-6 py-16 ring-1 ring-white/10 sm:rounded-3xl sm:p-8 lg:mx-20 lg:max-w-none lg:flex-row lg:items-center lg:py-20 xl:gap-x-20 xl:px-20">
          <img
            className="hidden lg:block h-32 w-full flex-none rounded-2xl object-contain lg:aspect-square lg:h-auto lg:max-w-[15vw] 2xl:max-w-[10vw]"
            src={logo_w_border}
            alt=""
          />
          <div className="mt-4 lg:mt-0 flex w-full flex-col items-center lg:flex-auto lg:items-start">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl text-center md:text-left">
              <span className="text-indigo-600">Heard enough?</span> Install
              DataLine.
            </h2>
            <div className="mt-6 flex justify-left">
              {installationSections.map((item) => (
                <button
                  key={item.title}
                  className={`px-4 py-2 rounded-md ${selectedTab === item.title ? "bg-indigo-600 text-white" : "bg-transparent text-white"}`}
                  onClick={() => setSelectedTab(item.title)}
                >
                  {item.title}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              {installationSections.map((item: Item) => (
                <React.Fragment key={item.title}>
                  {selectedTab === item.title &&
                    (item.isDownloadable ? (
                      item.os && <DownloadReleaseButton os={item.os} />
                    ) : (
                      <div className="bg-gray-900 p-8 rounded-xl text-white flex items-center gap-5">
                        <p className="flex font-mono gap-2 max-w-sm break-all">
                          <pre>$</pre>
                          {item.code}
                        </p>
                        <CustomTooltip clickText="COPIED!" hoverText="Copy">
                          <button
                            tabIndex={-1}
                            onClick={() =>
                              item.code && copyToClipboard(item.code)
                            }
                            className="p-1"
                          >
                            <ClipboardIcon className="w-6 h-6 [&>path]:stroke-[2] group-hover:-rotate-6" />
                          </button>
                        </CustomTooltip>
                      </div>
                    ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
