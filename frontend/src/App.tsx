import { router } from "./router";
import { RouterProvider } from "react-router-dom";

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
