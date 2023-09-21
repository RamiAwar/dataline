import { SessionProvider } from "./components/Providers/SessionProvider";
import { router } from "./router";
import { RouterProvider } from "react-router";
import { ConnectionListProvider } from "./components/Providers/ConnectionListProvider";
import { ConversationListProvider } from "./components/Providers/ConversationListProvider";

export const App = () => (
  <ConnectionListProvider>
    <SessionProvider>
      <ConversationListProvider>
        <RouterProvider router={router} />
      </ConversationListProvider>
    </SessionProvider>
  </ConnectionListProvider>
);
