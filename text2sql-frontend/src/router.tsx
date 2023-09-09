import { createBrowserRouter } from "react-router-dom";
import { Home } from "./components/Home/Home";
import { Landing } from "./components/Landing/Landing";
import { BetaSignup } from "./components/BetaSignup/BetaSignup";

export enum Routes {
  Landing = "/",
  BetaSignup = "/beta-signup",
  Home = "/home",
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
  routes.push({
    path: Routes.Home,
    element: <Home />,
  });
}

export const router = createBrowserRouter(routes);
