import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@components/Landing/Landing";
import { ConnectionSelector } from "@/components/Connection/ConnectionSelector";

export const Route = createFileRoute("/")({
  component: process.env.NODE_ENV === "local" ? ConnectionSelector : Landing,
});
