import type { Meta, StoryObj } from "@storybook/react";

import { Message } from "./Message";

const meta: Meta<typeof Message> = {
  component: Message,
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
    content: "The number of movies returned on time is:",
    role: "assistant",
    results: [
      {
        type: "text",
        content: "The number of movies returned on time is:",
      },
      {
        type: "sql",
        content:
          "SELECT COUNT(*) FROM rental WHERE return_date::date = rental_date::date",
      },
      {
        type: "selected_tables",
        content: "rental,payment",
      },
      {
        type: "data",
        content: [["count"], [105]],
      },
    ],
  },
};
