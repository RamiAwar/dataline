import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Message } from "@components/Conversation/Message";
import { generateUUID } from "../Library/utils";

const meta: Meta<typeof Message> = {
  component: Message,
  decorators: [
    (Story: React.ComponentType) => (
      <QueryClientProvider client={new QueryClient()}>
        <div className="dark bg-gray-800 w-full flex flex-col max-w-screen-sm">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Message>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/react/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
  args: {
    message: {
      message: {
        id: generateUUID(),
        content: "The number of movies returned on time is:",
        role: "ai",
      },
      results: [
        {
          type: "SELECTED_TABLES",
          content: {
            tables: ["rental", "payment"],
          },
          result_id: generateUUID(),
          linked_id: "Jjasd",
        },
        {
          type: "SQL_QUERY_STRING_RESULT",
          content: {
            sql: "SELECT COUNT(*) FROM rental WHERE return_date::date = rental_date::date",
            for_chart: false,
          },
          result_id: "Jjasd",
        },
        {
          type: "SQL_QUERY_RUN_RESULT",
          linked_id: "Jjasd",
          content: {
            columns: ["count", "rental", "payment", "one more", "and another"],
            rows: [
              ["1", "2", "3", "4", "5"],
              ["6", "7", "8", "9", "10"],
              ["11", "12", "13", "14", "15"],
              ["16", "17", "18", "19", "20"],
              ["21", "22", "23", "24", "25"],
            ],
          },
        },
        {
          type: "CHART_GENERATION_RESULT",
          linked_id: "Jjasd",
          result_id: "pdkq",
          created_at: new Date().toISOString(),
          content: {
            chartjs_json: JSON.stringify({
              type: "bar",
              data: {
                labels: ["05", "06", "07", "08"],
                datasets: [
                  {
                    label: "Revenue per month in 2005",
                    data: [4824.43, 9631.880000000001, 28373.89, 24072.13],
                    backgroundColor: [
                      "rgba(255, 99, 132, 0.5)",
                      "rgba(255, 159, 64, 0.5)",
                      "rgba(255, 205, 86, 0.5)",
                      "rgba(75, 192, 192, 0.5)",
                      "rgba(54, 162, 235, 0.5)",
                      "rgba(153, 102, 255, 0.5)",
                      "rgba(201, 203, 207, 0.5)",
                    ],
                    borderColor: [
                      "rgb(255, 99, 132)",
                      "rgb(255, 159, 64)",
                      "rgb(255, 205, 86)",
                      "rgb(75, 192, 192)",
                      "rgb(54, 162, 235)",
                      "rgb(153, 102, 255)",
                      "rgb(201, 203, 207)",
                    ],
                    borderWidth: 1,
                  },
                ],
              },
            }),
          },
        },
      ],
    },
  },
};
