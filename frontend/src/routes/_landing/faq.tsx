import { createFileRoute } from "@tanstack/react-router";
import FAQPage from "@components/Landing/FAQPage";

export const Route = createFileRoute("/_landing/faq")({
  component: FAQPage,
});
