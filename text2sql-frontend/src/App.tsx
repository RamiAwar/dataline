import { SessionProvider } from "./Providers/SessionProvider";
import { router } from "./router";
import { RouterProvider } from "react-router";

export const App = () => (
    <SessionProvider>
        <RouterProvider router={router} />
    </SessionProvider>
);
