import { ReactNode, useEffect, useRef } from "react";
import { CustomTooltip } from "../Library/Tooltip";
import { ArrowsPointingOutIcon } from "@heroicons/react/24/outline";
import autoAnimate from "@formkit/auto-animate";
import clsx from "clsx";

const Minimizer = ({
  minimized,
  setMinimized,
  children,
  label,
  classes = "",
}: {
  minimized: boolean;
  setMinimized: (minimized: boolean) => void;
  children: ReactNode;
  label: string;
  classes?: string;
}) => {
  const parent = useRef<HTMLDivElement>(null);
  useEffect(() => {
    parent.current &&
      autoAnimate(parent.current, {
        duration: 150,
      });
  }, [parent, minimized]);
  return (
    <div
      ref={parent}
      className={clsx("max-w-7xl border border-gray-500 rounded-xl", classes)}
    >
      {minimized && (
        <div
          className="flex items-center justify-between p-2 cursor-pointer text-gray-300"
          onClick={() => setMinimized(false)}
        >
          <div className="ml-2">{label}</div>
          <CustomTooltip hoverText="Expand">
            <button tabIndex={-1} className="p-1">
              <ArrowsPointingOutIcon className="w-6 h-6 [&>path]:stroke-[2]" />
            </button>
          </CustomTooltip>
        </div>
      )}
      {!minimized && children}
    </div>
  );
};

export default Minimizer;
