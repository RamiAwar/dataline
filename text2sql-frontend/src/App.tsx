import { router } from "./router";
import { RouterProvider } from "react-router";
import { ConnectionListProvider } from "./components/Providers/ConnectionListProvider";
import { ConversationListProvider } from "./components/Providers/ConversationListProvider";
import { UserInfoProvider } from "./components/Providers/UserInfoProvider";
import { SnackbarProvider } from "notistack";
import { HealthCheckProvider } from "./components/Providers/HealthcheckProvider";

export const App = () => (
  <SnackbarProvider
    autoHideDuration={5000}
    maxSnack={5}
    anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
  >
    <HealthCheckProvider>
      <UserInfoProvider>
        <ConnectionListProvider>
          <ConversationListProvider>
            <RouterProvider router={router} />
          </ConversationListProvider>
        </ConnectionListProvider>
      </UserInfoProvider>
    </HealthCheckProvider>
  </SnackbarProvider>
);
