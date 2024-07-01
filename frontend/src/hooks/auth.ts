import { api } from "@/api";
import {
  useMutation,
  useQueryClient,
  queryOptions,
} from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { queryClient } from "@/queryClient";
import { userProfileQuery } from "./settings";
import { Routes } from "@/router";
import { redirect } from "react-router-dom";

export function hasAuthQuery() {
  // to check if authentication is enabled on the app
  // used by ProfileDropdown
  return queryOptions({
    queryKey: ["hasAuth"],
    queryFn: async () => await api.hasAuth(),
    staleTime: Infinity,
  });
}

export function isAuthenticatedQuery() {
  // Query function checks if auth enabled. If it is, calls api.getUserInfo:
  // ==> If successful, we are logged in (also cache the value of UserInfo)
  // ==> Otherwise, we are not logged in
  // Used by Router once the app is loaded to check if we should redirect to "/login"
  return queryOptions({
    queryKey: ["isAuthenticated"],
    queryFn: async () => {
      try {
        const hasAuth = await queryClient.fetchQuery(hasAuthQuery());
        if (!hasAuth) return true;
        const userInfo = (await api.getUserInfo()).data;
        queryClient.setQueryData(userProfileQuery().queryKey, userInfo);
        return true;
      } catch (error) {
        return false;
      }
    },
    staleTime: 1000 * 60 * 5, // Expire after 5 minutes
  });
}

export function useLogin({ onLogin }: { onLogin: () => void }) {
  // on successful login, set isAuthenticatedQuery to true
  // navigates to Router.Root (using the onLogin function)
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      username,
      password,
    }: {
      username: string;
      password: string;
    }) => api.login(username, password),
    onError() {
      enqueueSnackbar("Authentication failed", { variant: "error" });
    },
    onSuccess() {
      queryClient.clear();
      queryClient.setQueryData(isAuthenticatedQuery().queryKey, true);
      onLogin();
    },
  });
}

export function useLogout({ onLogout }: { onLogout: () => void }) {
  // on successful logout, set isAuthenticatedQuery to false
  // navigates to Router.Login (using the onLogout function)
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => await api.logout(),
    onError() {
      enqueueSnackbar("Something went wrong", { variant: "error" });
    },
    onSuccess() {
      queryClient.clear();
      queryClient.setQueryData(isAuthenticatedQuery().queryKey, false);
      onLogout();
    },
  });
}

// fetchAuthenticated and ensureLoggedIn are both used by the Router loaders,
// which are run before even rendering the page
export async function fetchAuthenticated() {
  return queryClient.fetchQuery(isAuthenticatedQuery());
}

export async function ensureLoggedIn() {
  const isAuthenticated = await fetchAuthenticated();
  if (!isAuthenticated) {
    throw redirect(Routes.Login);
  }
  return isAuthenticated;
}
