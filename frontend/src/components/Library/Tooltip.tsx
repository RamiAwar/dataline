import React, { useState } from "react";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  trigger: "click" | "hover";
}

const CustomTooltip: React.FC<TooltipProps> = ({
  children,
  content,
  trigger = "hover",
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleButtonClick = () => {
    if (trigger === "click") {
      setShowTooltip(true);
      setTimeout(() => {
        setShowTooltip(false);
      }, 1500);
    }
  };

  const handleHover = () => {
    if (trigger === "hover") {
      setShowTooltip(true);
    }
  };

  const handleNoHover = () => {
    if (trigger === "hover") {
      setShowTooltip(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={handleButtonClick}
        onMouseEnter={handleHover}
        onMouseLeave={handleNoHover}
        style={{ position: "relative", display: "inline-block" }}
      >
        {showTooltip && (
          <span className="absolute bottom-full mb-2.5 flex justify-center transition ease-in duration-100 opacity-100">
            <span className="rounded-md bg-gray-600 px-3 py-1 text-[0.625rem] font-semibold uppercase leading-4 tracking-wide text-white drop-shadow-md filter">
              <svg
                aria-hidden="true"
                width="16"
                height="6"
                viewBox="0 0 16 6"
                className="absolute left-1/2 top-full -ml-4 -mt-px text-gray-600"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M15 0H1V1.00366V1.00366V1.00371H1.01672C2.72058 1.0147 4.24225 2.74704 5.42685 4.72928C6.42941 6.40691 9.57154 6.4069 10.5741 4.72926C11.7587 2.74703 13.2803 1.0147 14.9841 1.00371H15V0Z"
                  fill="currentColor"
                ></path>
              </svg>
              {content}
            </span>
          </span>
        )}
        {children}
      </div>
    </div>
  );
};


const InfoTooltip: React.FC<TooltipProps> = ({
  children,
  content,
  trigger = "hover",
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleButtonClick = () => {
    if (trigger === "click") {
      setShowTooltip(true);
      setTimeout(() => {
        setShowTooltip(false);
      }, 1500);
    }
  };

  const handleHover = () => {
    if (trigger === "hover") {
      setShowTooltip(true);
    }
  };

  const handleNoHover = () => {
    if (trigger === "hover") {
      setShowTooltip(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={handleButtonClick}
        onMouseEnter={handleHover}
        onMouseLeave={handleNoHover}
        style={{ position: "relative", display: "inline-block" }}
      >
        {showTooltip && (
          <span className="absolute top-full mt-2 flex justify-center transition ease-in duration-100 opacity-100 w-64">
            <span className="rounded-md bg-gray-700 px-3 py-1 text-sm text-white drop-shadow-md filter">
              {content}
            </span>
          </span>
        )}
        {children}
      </div>
    </div>
  );
};


export { CustomTooltip, InfoTooltip };