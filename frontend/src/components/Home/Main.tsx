import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@components/Catalyst/alert";
import { Outlet } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { OpenAIKeyPopup } from "../Settings/OpenAIKeyPopup";
import { Spinner } from "../Spinner/Spinner";
import {
  useGetBackendStatus,
  useGetConnections,
  useGetConversations,
  useGetUserProfile,
} from "@/hooks";

import "simplebar-react/dist/simplebar.min.css";
import React from "react";
import Login from "@components/Library/Login";
import { useQuery } from "@tanstack/react-query";
import { isAuthenticatedQuery } from "@/hooks/auth";

export const LoadingScreen: React.FC = () => (
  <Alert open={true} onClose={() => {}} size="sm">
    <AlertTitle className="flex gap-4 items-center">
      <Spinner />
      Loading...
    </AlertTitle>
  </Alert>
);

export const AppLayout: React.FC = () => {
  const {
    isSuccess: isHealthy,
    isPending: isPendingHealthy,
    isFetched: isFetchedHealthy,
  } = useGetBackendStatus();
  const { data: isAuthenticated, isPending: isPendingAuth } = useQuery(
    isAuthenticatedQuery()
  );

  if (isFetchedHealthy && !isHealthy) {
    return (
      <Alert open={true} onClose={() => {}} size="sm">
        <AlertTitle className="flex gap-4 items-center">
          Could not connect to the backend.
        </AlertTitle>
      </Alert>
    );
  }

  if (isPendingHealthy || isPendingAuth) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <Main />;
};

export const Main = () => {
  const { data: profile, isLoading } = useGetUserProfile();
  const { isPending: isPendingConnections, isError: isErrorConnections } =
    useGetConnections();
  const { isPending: isPendingConversations, isError: isErrorConversations } =
    useGetConversations();

  if (isErrorConnections || isErrorConversations) {
    return (
      <Alert open={true} onClose={() => {}} size="sm">
        <AlertTitle className="flex">Something went wrong</AlertTitle>
        <AlertDescription>
          Contact the developers if the problem persists
        </AlertDescription>
      </Alert>
    );
  }

  /** If the user information is not loaded yet, show a loading spinner */
  if (
    isLoading ||
    isPendingConnections ||
    isPendingConversations ||
    profile === undefined
  ) {
    return <LoadingScreen />;
  }

  /** If the user has not set up their OpenAI API key, show a popup to do that */
  if (profile?.openai_api_key) {
    return (
      <div className="w-full bg-gray-900">
        <Sidebar></Sidebar>
        <main className="lg:pl-72 w-full mt-16 lg:mt-0">
          <Outlet></Outlet>
        </main>
      </div>
    );
  } else {
    return (
      <div>
        <OpenAIKeyPopup />
      </div>
    );
  }
};
