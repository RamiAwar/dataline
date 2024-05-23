// Create a chart component that takes in a dictionary of data and renders a chart using Chart.js.

import { useEffect, useRef } from "react";

import { Chart as ChartJS, ChartConfiguration } from "chart.js/auto";
import { CustomTooltip } from "./Tooltip";
import { ArrowDownTrayIcon, ClipboardIcon } from "@heroicons/react/24/outline";

ChartJS.defaults.borderColor = '#334155';
ChartJS.defaults.color = '#eee';
ChartJS.defaults.layout.padding = 10;


const canvasBackgroundColorPlugin = {
    id: 'customCanvasBackgroundColor',
    beforeDraw: (chart, args, options) => {
        const { ctx } = chart;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = options.color || '#111827';
        ctx.fillRect(0, 0, chart.width, chart.height);
        ctx.restore();
    }
};


const Chart = ({
    data,
    createdAt
}: {
    data: ChartConfiguration,
    createdAt?: Date,
}) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<ChartJS | null>(null); // Add a useRef to store the chart instance

    useEffect(() => {
        if (chartRef.current) {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy(); // Destroy the existing chart instance
            }
            data.plugins = [canvasBackgroundColorPlugin];

            chartInstanceRef.current = new ChartJS(chartRef.current, data);
        }

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy(); // Destroy the chart instance when the component unmounts
            }
        };
    }, []);

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
    };

    return (
        <div className="relative max-w-7xl border border-gray-500 rounded-xl p-4 bg-gray-900">
            <canvas ref={chartRef} className="" />
            {/* <div className="absolute top-0 right-0 m-2 rounded-md overflow-hidden">
                <img src={logo} alt="logo" className="h-6 w-6" />
            </div> */}

            {createdAt && (
                <div className="absolute top-0 left-0 m-2 text-gray-100/70 text-xs">
                    {createdAt?.toLocaleDateString()} @ {createdAt?.toLocaleTimeString()}
                </div>
            )}
            <div className="absolute top-0 right-0 m-2 flex gap-1">
                {/* Save Icon */}
                <CustomTooltip hoverText="Save">
                    <button
                        tabIndex={-1}
                        onClick={saveCanvas}
                        className={
                            "group flex ml-auto gap-2 rounded-md p-1 bg-gray-700/50 hover:bg-gray-100/90 hover:text-gray-700/90 text-gray-100/50 transition-all duration-150 ease-in-out"
                        }
                    >
                        <ArrowDownTrayIcon className="w-6 h-6 [&>path]:stroke-[2] group-hover:-rotate-6" />
                    </button>
                </CustomTooltip>

                <CustomTooltip hoverText="Copy" clickText="COPIED!">
                    <button
                        tabIndex={-1}
                        onClick={copyCanvasToClipboard}
                        className="group flex ml-auto gap-2 rounded-md p-1 bg-gray-700/50 hover:bg-gray-100/90 hover:text-gray-700/90 text-gray-100/50 transition-all duration-150 ease-in-out"
                    >
                        <ClipboardIcon className="w-6 h-6 [&>path]:stroke-[2] group-hover:-rotate-6" />
                    </button>
                </CustomTooltip>
            </div>
        </div>
    );
};

export default Chart;
