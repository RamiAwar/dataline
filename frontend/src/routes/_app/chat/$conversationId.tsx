import { createFileRoute } from "@tanstack/react-router";
import { Conversation } from "@components/Conversation/Conversation";

export const Route = createFileRoute("/_app/chat/$conversationId")({
  component: Conversation,
});
