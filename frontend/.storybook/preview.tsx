import type { Preview, StoryContext } from "@storybook/react";
import "../src/index.css";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { PartialStoryFn } from "storybook/internal/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { closeSnackbar, SnackbarKey, SnackbarProvider } from "notistack";
function withRouter(Story: PartialStoryFn, { parameters }: StoryContext) {
  const {
    initialEntries = ["/"],
    initialIndex,
    routes = ["/"],
    routeParams = {},
  } = parameters?.router || {};

  const rootRoute = createRootRoute();

  const children = routes.map((path: string) =>
    createRoute({
      path,
      getParentRoute: () => rootRoute,
      component: Story,
    })
  );

  rootRoute.addChildren(children);

  // Ensure initialEntries are strings
  const formattedInitialEntries = initialEntries.map((entry: string) => {
    // If the entry includes parameters, replace them with the provided values
    return Object.keys(routeParams).reduce((acc, key) => {
      return acc.replace(`:${key}`, routeParams[key]);
    }, entry);
  });

  const router = createRouter({
    history: createMemoryHistory({
      initialEntries: formattedInitialEntries,
      initialIndex,
    }),
    routeTree: rootRoute,
    context: routeParams,
  });

  return <RouterProvider router={router} />;
}

function withQueryClient(Story: PartialStoryFn) {
  const action = (snackbarId: SnackbarKey | undefined) => (
    <>
      <button className="px-2" onClick={() => closeSnackbar(snackbarId)}>
        Dismiss
      </button>
    </>
  );
  return (
    <QueryClientProvider client={new QueryClient()}>
      <SnackbarProvider
        autoHideDuration={5000}
        maxSnack={5}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        action={action}
      >
        <Story />
      </SnackbarProvider>
    </QueryClientProvider>
  );
}

const preview: Preview = {
  globalTypes: {
    darkMode: {
      defaultValue: true, // Enable dark mode by default on all stories
    },
  },
  decorators: [withRouter, withQueryClient],
  parameters: {
    backgrounds: {
      default: "dark",
    },
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
