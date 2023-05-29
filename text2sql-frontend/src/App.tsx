import { SessionProvider } from "./Providers/SessionProvider";
import { router } from "./router";
import { RouterProvider } from "react-router";
import { ConversationProvider } from "./Providers/ConversationProvider";
import { ConnectionListProvider } from "./Providers/ConnectionListProvider";
import { ConversationListProvider } from "./Providers/ConversationListProvider";

export const App = () => (
  <ConnectionListProvider>
    <SessionProvider>
      <ConversationListProvider>
        <ConversationProvider>
          <RouterProvider router={router} />
        </ConversationProvider>
      </ConversationListProvider>
    </SessionProvider>
  </ConnectionListProvider>
);
