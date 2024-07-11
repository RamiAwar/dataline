import { api } from "@/api";
import {
  useMutation,
  useQueryClient,
  queryOptions,
} from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { queryClient } from "@/queryClient";
import { userProfileQuery } from "./settings";
import { isAxiosError } from "axios";

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
        // if starting from fresh db, no user exists => api.getUserInfo will return a 404
        if (isAxiosError(error) && error.response?.status === 404) return true;
        return false;
      }
    },
    staleTime: Infinity,
  });
}

export function useLogin() {
  // on successful login, set isAuthenticatedQuery to true
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
      queryClient.setQueryData(isAuthenticatedQuery().queryKey, true);
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
      queryClient.setQueryData(isAuthenticatedQuery().queryKey, false);
      onLogout();
    },
  });
}

// fetchAuthenticated is used by the Router loaders, which is run before rendering the page
export async function fetchAuthenticated() {
  return queryClient.fetchQuery(isAuthenticatedQuery());
}
