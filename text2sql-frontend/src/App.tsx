import { SessionProvider } from "./components/Providers/SessionProvider";
import { router } from "./router";
import { RouterProvider } from "react-router";
import { ConversationProvider } from "./components/Providers/ConversationProvider";
import { ConnectionListProvider } from "./components/Providers/ConnectionListProvider";
import { ConversationListProvider } from "./components/Providers/ConversationListProvider";

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
