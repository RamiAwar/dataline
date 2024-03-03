import { router } from "./router";
import { RouterProvider } from "react-router";
import { ConnectionListProvider } from "./components/Providers/ConnectionListProvider";
import { ConversationListProvider } from "./components/Providers/ConversationListProvider";
import { ProfilePictureProvider } from "./components/Providers/ProfilePictureProvider";
export const App = () => (
  <ProfilePictureProvider>
    <ConnectionListProvider>
      <ConversationListProvider>
        <RouterProvider router={router} />
      </ConversationListProvider>
    </ConnectionListProvider>
  </ProfilePictureProvider>
);
