import { createFileRoute } from "@tanstack/react-router";
import About from "@components/Landing/About";

export const Route = createFileRoute("/_landing/about")({
  component: About,
});
