import Account from "@/components/Settings/Settings";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/user")({
  component: Account,
});
