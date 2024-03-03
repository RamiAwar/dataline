import type { Meta, StoryObj } from "@storybook/react";

import MaskedInput from "@components/Settings/MaskedInput";

const meta: Meta<typeof MaskedInput> = {
  component: MaskedInput
};

export default meta;
type Story = StoryObj<typeof MaskedInput>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/react/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
  args: {
    "defaultValue": "sk-WuQk8129laksldjoisadlkfjo12189120-129812kasj"
  },
};
