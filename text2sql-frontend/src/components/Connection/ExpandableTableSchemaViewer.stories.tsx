import ExpandableTableSchemaViewer from "./ExpandableTableSchemaViewer";

export default {
  component: ExpandableTableSchemaViewer,
  title: "Expandable Table Schema Viewer",
  tags: ["autodocs"],
  decorators: [
    (Story: any) => (
      <div className="bg-gray-800 w-full flex flex-col max-w-screen-sm">
        <Story />
      </div>
    ),
  ],
};

// Default view
export const Collapsed = {
  args: {
    tableSchema: {
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
    },
  },
};

// Expanded to show set descriptions
export const Expanded = {
  args: {
    ...Collapsed.args,
    isExpanded: true,
  },
};
