import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { Main } from "@/components/Home/Main";

const rootComponent = process.env.NODE_ENV === "local" ? Main : Outlet;

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: rootComponent,
  notFoundComponent: () => (
    <div className="flex flex-col items-center mt-8" id="error-page">
      <h1>Oops!</h1>
      <p>The page you are looking for does not exist.</p>
    </div>
  ),
});
