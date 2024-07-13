import { createFileRoute } from "@tanstack/react-router";
import Privacy from "@components/Landing/Privacy";

export const Route = createFileRoute("/_landing/privacy")({
  component: Privacy,
});
