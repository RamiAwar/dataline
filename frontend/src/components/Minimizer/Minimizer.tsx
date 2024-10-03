import clsx from "clsx";
import { ReactNode } from "react";

const Minimizer = ({
  minimized,
  children,
  duration,
}: {
  minimized: boolean;
  children: ReactNode;
  duration?: number;
}) => {
  return (
    <div
      className={clsx(
        `grid`,
        minimized ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
        duration && `transition-[grid-template-rows] duration-${duration}`
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
};

export default Minimizer;
