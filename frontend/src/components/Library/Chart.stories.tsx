import Chart from "@components/Library/Chart";
import { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Chart> = {
  component: Chart,
  decorators: [
    (Story: React.ComponentType) => (
      <div className="bg-gray-800 w-full flex flex-col max-w-screen-sm p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Chart>;

export const Primary: Story = {
  args: {
    initialCreatedAt: new Date(),
    initialData: {
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
    },
  },
};
