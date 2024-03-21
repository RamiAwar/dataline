import { router } from "./router";
import { RouterProvider } from "react-router";
import { ConnectionListProvider } from "./components/Providers/ConnectionListProvider";
import { ConversationListProvider } from "./components/Providers/ConversationListProvider";
import { UserInfoProvider } from "./components/Providers/UserInfoProvider";
import { SnackbarProvider } from "notistack";

export const App = () => (
  <UserInfoProvider>
    <ConnectionListProvider>
      <ConversationListProvider>
        <SnackbarProvider>
          <RouterProvider router={router} />
        </SnackbarProvider>
      </ConversationListProvider>
    </ConnectionListProvider>
  </UserInfoProvider>
);
