import { RouteObject, createBrowserRouter } from "react-router-dom";
import { Home } from "./components/Home/Home";
import { Landing } from "./components/Landing/Landing";
import { BetaSignup } from "./components/BetaSignup/BetaSignup";
import { Conversation } from "./components/Conversation/Conversation";
import { ConnectionSelector } from "./components/Connection/ConnectionSelector";
import { ConnectionEditor } from "./components/Connection/ConnectionEditor";
import Account from "./components/Settings/Settings";

export enum Routes {
  Root = "/",
  BetaSignup = "/beta-signup",
  SignIn = "/login",
  UserProfile = "/user",
  Connection = "/connection/:connectionId",
  Chat = "/chat/:conversationId",
}

let routes: RouteObject[] = [
  {
    path: Routes.BetaSignup,
    element: <BetaSignup />,
  },
  {
    path: Routes.Root,
    element: <Landing />,
  },
];

let private_routes: RouteObject[] = [
  {
    path: Routes.Root,
    element: <Home />,
    children: [
      {
        element: <ConnectionSelector />,
        index: true,
      },
      {
        path: Routes.Connection,
        element: <ConnectionEditor />,
      },
      {
        path: Routes.Chat,
        element: <Conversation />,
      },
      {
        path: Routes.UserProfile,
        element: <Account />,
      },
    ],
  },
];

if (process.env.NODE_ENV === "local") {
  // Replace public with private
  routes = private_routes;
}

export const router = createBrowserRouter(routes);
