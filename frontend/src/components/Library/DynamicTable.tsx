import { useEffect, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@catalyst/table";
import { CustomTooltip } from "./Tooltip";
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";
import autoAnimate from "@formkit/auto-animate";

// TODO: Remove after defining this better on backend
export const DynamicTable: React.FC<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: { columns: string[]; rows: any[][] };
  initialCreatedAt?: Date;
  minimize?: boolean;
}> = ({ data, minimize }) => {
  const parent = useRef<HTMLDivElement>(null);
  const [minimized, setMinimized] = useState(minimize || false);
  const [limitedView, setLimitedView] = useState(true);

  useEffect(() => {
    parent.current &&
      autoAnimate(parent.current, {
        duration: 150,
      });
  }, [parent]);

  const handleExpand = () => {
    if (minimized) setMinimized(false);
    else if (limitedView) setLimitedView(false);
  };

  return (
    <div className="relative max-w-7xl border dark:text-gray-300 border-gray-500 bg-gray-800 rounded-xl">
      <div ref={parent}>
        {minimized && (
          <div
            className="flex items-center justify-between p-2 cursor-pointer"
            onClick={() => setMinimized(false)}
          >
            <div className="ml-2">Data results</div>
            <CustomTooltip hoverText="Expand">
              <button tabIndex={-1} className="p-1">
                <ArrowsPointingOutIcon className="w-6 h-6 [&>path]:stroke-[2]" />
              </button>
            </CustomTooltip>
          </div>
        )}

        {!minimized && (
          <Table
            grid
            bleed
            striped
            dense
            maxRows={limitedView ? 5 : data.rows.length + 10}
            className="ml-0 mr-0 [--gutter:theme(spacing.6)]"
          >
            <TableHead>
              <TableRow>
                {data.columns.map((header: string, index: number) => (
                  <TableHeader key={index}>{header}</TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.rows.map((row: string[] | number[], index: number) => {
                return (
                  <TableRow key={index}>
                    {row.map((item: string | number, cellIndex: number) => (
                      <TableCell key={cellIndex} className="font-medium pl-8">
                        {item}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {!minimized && (
        <div className="absolute bottom-0 right-0 m-2 flex gap-1">
          {/* Minimize Icon */}
          <CustomTooltip hoverText="Minimize">
            {/* On minimize, also collapse if already expanded */}
            <button
              tabIndex={-1}
              onClick={() => {
                setMinimized(true);
                setLimitedView(true);
              }}
              className="p-1"
            >
              <MinusIcon className="w-6 h-6 [&>path]:stroke-[2]" />
            </button>
          </CustomTooltip>
          {data.rows.length > 4 && // 4 data rows + 1 header (columns) row
            (limitedView ? (
              /* Expand Icon */
              <CustomTooltip hoverText="Expand">
                <button tabIndex={-1} onClick={handleExpand} className="p-1">
                  <ArrowsPointingOutIcon className="w-6 h-6 [&>path]:stroke-[2]" />
                </button>
              </CustomTooltip>
            ) : (
              /* Contract Icon */
              <CustomTooltip hoverText="Collapse">
                <button
                  tabIndex={-1}
                  onClick={() => setLimitedView(true)}
                  className="p-1"
                >
                  <ArrowsPointingInIcon className="w-6 h-6 [&>path]:stroke-[2]" />
                </button>
              </CustomTooltip>
            ))}
        </div>
      )}
    </div>
  );
};
