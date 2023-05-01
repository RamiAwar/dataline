import { createBrowserRouter } from "react-router-dom";
import { Connection } from "./Connection/Connection";
import Search from "./Search/Search";
import { Setup } from "./Setup/Setup";

export enum Routes {
  Setup = "/",
  Connection = "/connect",
  Search = "/search",
}

export const router = createBrowserRouter([
  {
    path: Routes.Setup,
    element: <Setup />,
  },
  {
    path: Routes.Connection,
    element: <Connection />,
  },
  {
    path: Routes.Search,
    element: <Search />,
  },
]);
