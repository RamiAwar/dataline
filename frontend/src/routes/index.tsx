import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@components/Landing/Landing";
import { ConnectionSelector } from "@/components/Connection/ConnectionSelector";
import UmamiScript from "@/components/Landing/Umami";

export const Route = createFileRoute("/")({
  component:
    process.env.NODE_ENV === "local"
      ? ConnectionSelector
      : () => (
          <>
            <UmamiScript />
            <Landing />
          </>
        ),
});
