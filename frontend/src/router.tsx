import { RouteObject, createBrowserRouter, redirect } from "react-router-dom";
import { Landing } from "@components/Landing/Landing";
import { Conversation } from "@components/Conversation/Conversation";
import { ConnectionSelector } from "@components/Connection/ConnectionSelector";
import { ConnectionEditor } from "@components/Connection/ConnectionEditor";
import Account from "@components/Settings/Settings";
import { NewConnection } from "@components/Connection/NewConnection";
import FAQPage from "@/components/Landing/FAQPage";
import Blog from "@components/Landing/Blog";
import Privacy from "@components/Landing/Privacy";
import About from "./components/Landing/About";
import Login from "./components/Library/Login";
import { Main } from "./components/Home/Main";
import { fetchAuthenticated } from "./hooks/auth";

export enum Routes {
  Root = "/",
  Faq = "/faq",
  Blog = "/blog",
  UserProfile = "/user",
  NewConnection = "/connection/new",
  Connection = "/connection/:connectionId",
  Chat = "/chat/:conversationId",
  Privacy = "/privacy",
  About = "/about",
  Login = "/login",
}

const landing_routes: RouteObject[] = [
  {
    path: Routes.Root,
    element: <Landing />,
  },
  {
    path: Routes.Faq,
    element: <FAQPage />,
  },
  {
    path: Routes.Blog,
    element: <Blog />,
  },
  {
    path: Routes.Privacy,
    element: <Privacy />,
  },
  {
    path: Routes.About,
    element: <About />,
  },
];

const app_routes: RouteObject[] = [
  {
    path: Routes.Login,
    element: <Login />,
    loader: async () => (await fetchAuthenticated()) && redirect(Routes.Root),
  },
  {
    path: Routes.Root,
    element: <Main />,
    loader: async () => !(await fetchAuthenticated()) && redirect(Routes.Login),
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

let routes = landing_routes;
if (process.env.NODE_ENV === "local") {
  // Replace public with private
  routes = app_routes;
}

export const router = createBrowserRouter(routes);
