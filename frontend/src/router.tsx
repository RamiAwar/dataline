import { RouteObject, createBrowserRouter } from "react-router-dom";
import { Home } from "@components/Home/Home";
import { Landing } from "@components/Landing/Landing";
import { Conversation } from "@components/Conversation/Conversation";
import { ConnectionSelector } from "@components/Connection/ConnectionSelector";
import { ConnectionEditor } from "@components/Connection/ConnectionEditor";
import Account from "@components/Settings/Settings";
import { NewConnection } from "@components/Connection/NewConnection";
import FAQPage from "@components/FAQPage";

export enum Routes {
  Root = "/",
  Faq = "/faq",
  SignIn = "/login",
  UserProfile = "/user",
  NewConnection = "/connection/new",
  Connection = "/connection/:connectionId",
  Chat = "/chat/:conversationId",
}

let routes: RouteObject[] = [
  {
    path: Routes.Root,
    element: <Landing />,
  },
  {
    path: Routes.Faq,
    element: <FAQPage />,
  }
];

const private_routes: RouteObject[] = [
  {
    path: Routes.Root,
    element: <Home />,
    children: [
      {
        element: <ConnectionSelector />,
        index: true,
      },
      {
        path: Routes.NewConnection,
        element: <NewConnection />,
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
