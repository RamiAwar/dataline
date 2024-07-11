import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (process.env.NODE_ENV !== "local") {
      throw redirect({ to: "/" });
    }
  },
});
