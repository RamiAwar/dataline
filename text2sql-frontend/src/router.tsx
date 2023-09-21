import { createBrowserRouter } from "react-router-dom";
import { Home } from "./components/Home/Home";
import { Landing } from "./components/Landing/Landing";
import { BetaSignup } from "./components/BetaSignup/BetaSignup";
import { Conversation } from "./components/Conversation/Conversation";
import { ConnectionSelector } from "./components/Library/ConnectionSelector";

export enum Routes {
  Root = "/",
  BetaSignup = "/beta-signup",
  Connection = "/connection/:connectionId",
  Chat = "/chat/:conversationId",
  NewChat = "/chat/new",
}

let routes = [
  {
    path: Routes.BetaSignup,
    element: <BetaSignup />,
  },
  {
    path: Routes.Root,
    element: <Landing />,
  },
];

let private_routes = [
  {
    path: Routes.Root,
    element: <Home />,
    children: [
      {
        path: Routes.NewChat,
        element: <ConnectionSelector />,
      },
      {
        path: Routes.Chat,
        element: <Conversation />,
      },
    ],
  },
];

if (process.env.NODE_ENV === "local") {
  // Replace public with private
  routes = private_routes;
}

export const router = createBrowserRouter(routes);
