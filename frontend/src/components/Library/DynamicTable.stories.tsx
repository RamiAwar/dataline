import type { Meta, StoryObj } from "@storybook/react";
import { DynamicTable } from "@components/Library/DynamicTable";

const meta: Meta<typeof DynamicTable> = {
  component: DynamicTable,
  decorators: [
    (Story: React.ComponentType) => (
      <div className="dark bg-gray-800 w-full flex flex-col max-w-screen-sm">
        <div>
          <Story />
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DynamicTable>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/react/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
  args: {
    data: {
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
};

export const ManyRows: Story = {
  args: {
    data: {
      columns: ["count", "rental", "payment", "one more", "and another"],
      rows: Array.from({ length: 100 }, (_, i) => [
        i + 1,
        i + 2,
        i + 3,
        i + 4,
        i + 5,
      ]),
    },
  },
};
