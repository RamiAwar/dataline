import type { Meta, StoryObj } from "@storybook/react";

import {NewConnection} from "./NewConnection";

const meta: Meta<typeof NewConnection> = {
  component: NewConnection,
  decorators: [
    (Story: React.ComponentType) => (
      <div className="bg-gray-800 w-full flex flex-col max-w-screen-sm p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NewConnection>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/react/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
  args: {
    isOpen: true,
  },
};
