// Create a chart component that takes in a dictionary of data and renders a chart using Chart.js.

import { useEffect, useRef, useState } from "react";

import {
  Chart as ChartJS,
  ChartConfiguration,
  ChartTypeRegistry,
} from "chart.js/auto";
import { CustomTooltip } from "./Tooltip";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ClipboardIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";
import { useRefreshChartData } from "@/hooks";
import { Select } from "@catalyst/select";
import Minimizer from "../Minimizer/Minimizer";

ChartJS.defaults.borderColor = "#334155";
ChartJS.defaults.color = "#eee";
ChartJS.defaults.layout.padding = 10;

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const canvasBackgroundColorPlugin = {
  id: "customCanvasBackgroundColor",

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeDraw: (
    chart: { width?: any; height?: any; ctx?: any },
    _: any,
    options: { color: string }
  ) => {
    const { ctx } = chart;
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = options.color || "#111827";
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  },
};

const Chart = ({
  resultId,
  initialData,
  initialCreatedAt,
  minimize,
}: {
  resultId: string;
  initialData: ChartConfiguration;
  initialCreatedAt: Date;
  minimize?: boolean;
}) => {
  const [createdAt, setCreatedAt] = useState<Date>(initialCreatedAt);
  const [chartData, setChartData] = useState<ChartConfiguration>(initialData);
  const [minimized, setMinimized] = useState(minimize || false);

  // We cannot transition from a scatter chart into a basic chart type (line, bar, doughnut)
  // since scatter charts have a different data structure (x and y are numbers)
  const isScatter = chartData.type === "scatter";

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null); // Add a useRef to store the chart instance

  // Update the chart when the tab becomes visible again after a while
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.update();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Resize the canvas when the window is resized
  useEffect(() => {
    const handleResize = () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.resize();
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Refresh the chart data when the data prop changes
  useEffect(() => {
    if (minimized) return;
    if (chartRef.current) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy(); // Destroy the existing chart instance
      }
      chartData.plugins = [canvasBackgroundColorPlugin];

      // TODO: [responsiveness] Add smaller titles for small screens
      chartData.options = {
        ...chartData.options,
        plugins: {
          ...chartData.options?.plugins,
          title: {
            ...chartData.options?.plugins?.title,
            font: {
              ...chartData.options?.plugins?.title?.font,
              size: 14,
            },
          },
        },
      };

      chartInstanceRef.current = new ChartJS(chartRef.current, chartData);
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy(); // Destroy the chart instance when the component unmounts
      }
    };
  }, [chartData, minimized]);

  const { mutate: refreshChart } = useRefreshChartData({
    onSettled: (data, error) => {
      if (error || !data?.data.chartjs_json) {
        console.error("Error refreshing chart", error);
      } else {
        setCreatedAt(new Date(data?.data.created_at));
        setChartData(JSON.parse(data?.data.chartjs_json));
      }
    },
  });

  const triggerRefreshChart = () => {
    refreshChart({ chartResultId: resultId });
  };

  const saveCanvas = () => {
    if (chartInstanceRef.current) {
      const canvas = chartInstanceRef.current.canvas;
      const dataURL = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = dataURL;
      downloadLink.download = "chart.png";
      downloadLink.click();
    }
  };

  const copyCanvasToClipboard = () => {
    if (chartInstanceRef.current) {
      const canvas = chartInstanceRef.current.canvas;
      if (navigator.clipboard && window.ClipboardItem) {
        canvas.toBlob((blob) => {
          if (blob) {
            navigator.clipboard.write([
              new ClipboardItem({
                "image/png": blob,
              }),
            ]);
          }
        });
      }
    }
  };

  const updateChartType = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const oldType = chartData.type;
    const newType = e.target.value as keyof ChartTypeRegistry;

    let updatedData = {
      ...chartData,
      type: newType,
    };

    if (oldType === "line" && newType !== "line") {
      // Need to remove border colors if singular (for basic types)
      if (chartData.data.datasets.length === 1) {
        // Check if borderColor is truthy and NOT an array (means original chart type is line)
        // If it is an array, the transition will not be problematic, nothing to do
        // Since borderColor will already have a border color for every entry
        // This is enough to suppress the problem - real solution managing colors will have to come later
        if (
          chartData.data.datasets[0].borderColor &&
          !Array.isArray(chartData.data.datasets[0].borderColor)
        ) {
          const newChartDataDatasets = [
            {
              ...chartData.data.datasets[0],
              borderColor: undefined,
            },
          ];

          updatedData = {
            ...updatedData,
            data: {
              ...chartData.data,
              datasets: newChartDataDatasets,
            },
          };
        }
      }
    }
    if (oldType === "doughnut" || newType === "doughnut") {
      updatedData = {
        ...updatedData,
        options: {
          ...updatedData.options,
          plugins: {
            ...updatedData.options?.plugins,
            legend: {
              ...updatedData.options?.plugins?.legend,
              display: newType === "doughnut", // show legend if new type is doughnut, hide if not
            },
          },
        },
      };
    }

    setChartData(updatedData);
  };

  return (
    <Minimizer
      minimized={minimized}
      setMinimized={setMinimized}
      label="Chart"
      classes="border border-gray-500 rounded-xl bg-gray-900"
    >
      <div className="relative w-full md:max-w-7xl pt-8 md:px-4">
        <canvas ref={chartRef} className="overflow-hidden rounded-xl" />

        {createdAt && (
          <div className="absolute top-0 left-0 m-2 text-gray-100/70 text-xs invisible md:visible">
            {createdAt?.toLocaleDateString()} @{" "}
            {createdAt?.toLocaleTimeString()}
          </div>
        )}

        <div className="absolute top-0 right-0 m-2 flex gap-1 ">
          {!isScatter && (
            <Select
              value={chartData.type}
              onChange={updateChartType}
              style={{ backgroundColor: "rgb(29, 36, 50)" }} // firefox's select element doesn't understand rgba...
            >
              <option value="bar">Bar</option>
              <option value="line">Line</option>
              <option value="doughnut">Doughnut</option>
            </Select>
          )}

          {/* Minimize Icon */}
          <CustomTooltip hoverText="Minimize">
            <button
              tabIndex={-1}
              onClick={() => setMinimized(true)}
              className="p-1"
            >
              <MinusIcon className="w-6 h-6 [&>path]:stroke-[2] group-hover:-rotate-6" />
            </button>
          </CustomTooltip>

          <CustomTooltip hoverText="Refresh">
            <button tabIndex={-1} onClick={triggerRefreshChart} className="p-1">
              <ArrowPathIcon className="w-6 h-6 [&>path]:stroke-[2] group-hover:-rotate-6" />
            </button>
          </CustomTooltip>

          {/* Save Icon */}
          <CustomTooltip hoverText="Save">
            <button tabIndex={-1} onClick={saveCanvas} className="p-1">
              <ArrowDownTrayIcon className="w-6 h-6 [&>path]:stroke-[2] group-hover:-rotate-6" />
            </button>
          </CustomTooltip>

          <CustomTooltip
            hoverText={
              window.ClipboardItem ? "Copy" : "Not supported in this browser"
            }
            clickText="COPIED!"
          >
            <button
              disabled={!window.ClipboardItem}
              tabIndex={-1}
              onClick={copyCanvasToClipboard}
              className={classNames(
                "p-1",
                window.ClipboardItem
                  ? "transition-all duration-150 ease-in-out"
                  : "cursor-not-allowed"
              )}
            >
              <ClipboardIcon
                className={classNames(
                  window.ClipboardItem && "group-hover:-rotate-6",
                  "w-6 h-6 [&>path]:stroke-[2]"
                )}
              />
            </button>
          </CustomTooltip>
        </div>
      </div>
    </Minimizer>
  );
};

export default Chart;
