import { NewConnection } from "@/components/Connection/NewConnection";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/connection/new")({
  component: NewConnection,
});
