import { SessionProvider } from "./Providers/SessionProvider";
import { router } from "./router";
import { RouterProvider } from "react-router";
import { ConversationProvider } from "./Providers/ConversationProvider";
import { ConnectionListProvider } from "./Providers/ConnectionListProvider";

export const App = () => (
  <ConnectionListProvider>
    <SessionProvider>
      <ConversationProvider>
        <RouterProvider router={router} />
      </ConversationProvider>
    </SessionProvider>
  </ConnectionListProvider>
);
