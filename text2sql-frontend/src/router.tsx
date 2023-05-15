import { createBrowserRouter } from "react-router-dom";
import { Connection } from "./Connection/Connection";
import { Search } from "./Search/Search";
import { Setup } from "./Setup/Setup";
import { Landing } from "./Landing/Landing";
import { BetaSignup } from "./BetaSignup/BetaSignup";

export enum Routes {
  Landing = "/",
  BetaSignup = "/beta-signup",
  Setup = "/setup",
  Connection = "/connect",
  Search = "/search",
}

let routes = [
  {
    path: Routes.BetaSignup,
    element: <BetaSignup />,
  },
  {
    path: Routes.Landing,
    element: <Landing />,
  },
];

if (process.env.NODE_ENV === "local") {
  routes.push(
    {
      path: Routes.Connection,
      element: <Connection />,
    },
    {
      path: Routes.Search,
      element: <Search />,
    },
    {
      path: Routes.Setup,
      element: <Setup />,
    }
  );
}

export const router = createBrowserRouter([]);
