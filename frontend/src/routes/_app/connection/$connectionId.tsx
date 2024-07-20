import { createFileRoute } from "@tanstack/react-router";
import { ConnectionEditor } from "@components/Connection/ConnectionEditor";

export const Route = createFileRoute("/_app/connection/$connectionId")({
  component: ConnectionEditor,
});
