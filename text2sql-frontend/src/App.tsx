import { router } from "./router";
import { RouterProvider } from "react-router";
import { ConnectionListProvider } from "./components/Providers/ConnectionListProvider";
import { ConversationListProvider } from "./components/Providers/ConversationListProvider";
import { UserInfoProvider } from "./components/Providers/UserInfoProvider";
import { SnackbarProvider } from "notistack";

export const App = () => (
  <SnackbarProvider autoHideDuration={10000} maxSnack={5}>
    <UserInfoProvider>
      <ConnectionListProvider>
        <ConversationListProvider>
          <RouterProvider router={router} />
        </ConversationListProvider>
      </ConnectionListProvider>
    </UserInfoProvider>
  </SnackbarProvider>
);
