import type { Meta, StoryObj } from "@storybook/react";
import { CodeBlock } from "@components/Conversation/CodeBlock";
import { Dialect } from "../Library/types";

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
  args: {
    code: `SELECT * FROM table JOIN table2 ON table.id = table2.id WHERE table.id = 1;`,
    dialect: Dialect.Postgres,
  },
  parameters: {
    // Place in conversation context
    router: {
      routes: ["/", "/_app/chat/$conversationId"],
      initialEntries: ["/_app/chat/dummy-conversation-id"],
      routeParams: {
        conversationId: "dummy-conversation-id",
      },
    },
  },
};
