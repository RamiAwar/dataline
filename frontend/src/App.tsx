import { RouterProvider, createRouter } from "@tanstack/react-router";
// Import the generated route tree
import { routeTree } from "./routeTree.gen";

import { QueryClientProvider } from "@tanstack/react-query";
import { closeSnackbar, SnackbarKey, SnackbarProvider } from "notistack";
import { queryClient } from "./queryClient";

const action = (snackbarId: SnackbarKey | undefined) => (
  <>
    <button className="px-2" onClick={() => closeSnackbar(snackbarId)}>
      Dismiss
    </button>
  </>
);

// Create a new router instance
const router = createRouter({ routeTree, context: { queryClient } });

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider
        autoHideDuration={5000}
        maxSnack={5}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        action={action}
      >
        <RouterProvider router={router} />
      </SnackbarProvider>
    </QueryClientProvider>
  );
};
