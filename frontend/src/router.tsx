import { createBrowserRouter } from "react-router-dom";
import { Connection } from "./Connection/Connection";
import Search from "./Search/Search";

export enum Routes {
  Connection = "/",
  Search = "/search",
}

export const router = createBrowserRouter([
  {
    path: Routes.Connection,
    element: <Connection />,
  },
  {
    path: Routes.Search,
    element: <Search />,
  },
]);
