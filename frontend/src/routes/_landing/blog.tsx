import { createFileRoute } from "@tanstack/react-router";
import Blog from "@components/Landing/Blog";

export const Route = createFileRoute("/_landing/blog")({
  component: Blog,
});
