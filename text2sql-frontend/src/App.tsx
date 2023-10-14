import { router } from "./router";
import { RouterProvider } from "react-router";
import { ConnectionListProvider } from "./components/Providers/ConnectionListProvider";
import { ConversationListProvider } from "./components/Providers/ConversationListProvider";
import { AuthProvider } from "./components/Providers/AuthProvider";

export const App = () => (
  <AuthProvider>
    <ConnectionListProvider>
      <ConversationListProvider>
        <RouterProvider router={router} />
      </ConversationListProvider>
    </ConnectionListProvider>
  </AuthProvider>
);
