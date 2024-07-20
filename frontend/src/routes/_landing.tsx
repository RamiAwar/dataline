import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_landing")({
  beforeLoad: () => {
    if (process.env.NODE_ENV === "local") {
      throw redirect({ to: "/" });
    }
  },
});
