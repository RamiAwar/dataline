import { RouteObject, createBrowserRouter } from "react-router-dom";
import { Home } from "./components/Home/Home";
import { Landing } from "./components/Landing/Landing";
import { BetaSignup } from "./components/BetaSignup/BetaSignup";
import { Conversation } from "./components/Conversation/Conversation";
import { ConnectionSelector } from "./components/Connection/ConnectionSelector";
import { ConnectionEditor } from "./components/Connection/ConnectionEditor";
import Account from "./components/Settings/Settings";
import SentryHandler from "@components/Library/SentryHandler";

export enum Routes {
  Root = "/",
  BetaSignup = "/beta-signup",
  SignIn = "/login",
  UserProfile = "/user",
  Connection = "/connection/:connectionId",
  Chat = "/chat/:conversationId",
  NewChat = "/chat/new",
}

// Check https://docs.sentry.io/platforms/javascript/guides/react/features/react-router/#usage-with-react-router-64-data-api
// for sentry + react router integration

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

const private_routes: RouteObject[] = [
  {
    path: Routes.Root,
    element: (
      <>
        <SentryHandler />
        <Home />
      </>
    ),
    children: [
      {
        element: <ConnectionSelector />,
        index: true,
      },
      {
        path: Routes.NewChat,
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
