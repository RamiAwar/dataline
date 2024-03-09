import { router } from "./router";
import { RouterProvider } from "react-router";
import { ConnectionListProvider } from "./components/Providers/ConnectionListProvider";
import { ConversationListProvider } from "./components/Providers/ConversationListProvider";
import { UserInfoProvider } from "./components/Providers/UserInfoProvider";
export const App = () => (
  <UserInfoProvider>
    <ConnectionListProvider>
      <ConversationListProvider>
        <RouterProvider router={router} />
      </ConversationListProvider>
    </ConnectionListProvider>
  </UserInfoProvider>
);
