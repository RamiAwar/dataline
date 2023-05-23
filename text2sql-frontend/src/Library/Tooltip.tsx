import React, { useState } from "react";

interface CustomTooltipProps {
  children: React.ReactNode;
  content: string;
  trigger: "click" | "hover";
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
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
    <div>
      <button
        onClick={handleButtonClick}
        onMouseEnter={handleHover}
        onMouseLeave={handleNoHover}
      >
        {children}
      </button>
      {showTooltip && (
        <span className="absolute inset-x-0 bottom-full mb-2.5 flex justify-center transition ease-in duration-100 opacity-100">
          <span className="rounded-md bg-gray-600 px-3 py-1 text-[0.625rem] font-semibold uppercase leading-4 tracking-wide text-white drop-shadow-md filter">
            <svg
              aria-hidden="true"
              width="16"
              height="6"
              viewBox="0 0 16 6"
              className="absolute left-1/2 top-full -ml-2 -mt-px text-gray-600"
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
    </div>
  );
};

export default CustomTooltip;
