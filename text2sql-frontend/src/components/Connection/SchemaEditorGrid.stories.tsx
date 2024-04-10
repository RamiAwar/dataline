import SchemaEditorGrid from "./SchemaEditorGrid";

export default {
  component: SchemaEditorGrid,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story: any) => (
      <div className="bg-gray-800 w-screen h-full flex flex-col">
        <Story />
      </div>
    ),
  ],
};

const film_table = {
  table: {
    name: "film",
  },
  fields: [
    {
      name: "film_id",
      type: "integer",
      description: "A unique ID for the film",
    },
    {
      name: "title",
      type: "varchar",
    },
    {
      name: "category",
      type: "varchar",
    },
    {
      name: "producer",
      type: "foreign_key",
    },
  ],
};
const producer_table = {
  table: {
    name: "producer",
  },
  fields: [
    {
      name: "producer_id",
      type: "integer",
      description: "A unique ID for the producer",
    },
    {
      name: "name",
      type: "varchar",
    },
  ],
};
const actor_table = {
  table: {
    name: "actor",
  },
  fields: [
    {
      name: "actor_id",
      type: "integer",
      description: "A unique ID for the actor",
    },
    {
      name: "name",
      type: "varchar",
    },
  ],
};
const film_actor_table = {
  table: {
    name: "film_actor",
  },
  fields: [
    {
      name: "film_id",
      type: "foreign_key",
    },
    {
      name: "actor_id",
      type: "foreign_key",
    },
  ],
};
const payment_table = {
  table: {
    name: "payment",
  },
  fields: [
    {
      name: "payment_id",
      type: "integer",
      description: "A unique ID for the payment",
    },
    {
      name: "amount",
      type: "numeric",
    },
    {
      name: "film_id",
      type: "foreign_key",
    },
  ],
};

// Default view
export const Collapsed = {
  args: {
    initialTableSchemas: [
      film_table,
      producer_table,
      actor_table,
      film_actor_table,
      payment_table,
    ],
  },
};

// Expanded to show set descriptions
export const Expanded = {
  args: {
    ...Collapsed.args,
    isExpanded: true,
  },
};
