import UmamiScript from "@/components/Landing/Umami";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_landing")({
  beforeLoad: () => {
    if (process.env.NODE_ENV === "local") {
      throw redirect({ to: "/" });
    }
  },
  component: () => (
    <>
      <UmamiScript />
      <Outlet />
    </>
  ),
});
