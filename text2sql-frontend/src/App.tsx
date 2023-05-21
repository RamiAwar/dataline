import { SessionProvider } from "./Providers/SessionProvider";
import { router } from "./router";
import { RouterProvider } from "react-router";
import { ConversationProvider } from "./Providers/ConversationProvider";

export const App = () => (
  <SessionProvider>
    <ConversationProvider>
      <RouterProvider router={router} />
    </ConversationProvider>
  </SessionProvider>
);
