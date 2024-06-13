import type { Meta, StoryObj } from "@storybook/react";
import { CodeBlock } from "@components/Conversation/CodeBlock";

const meta: Meta<typeof CodeBlock> = {
  component: CodeBlock,
};

export default meta;
type Story = StoryObj<typeof CodeBlock>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/react/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
  args: {},
};
