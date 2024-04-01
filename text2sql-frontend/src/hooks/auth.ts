import { api } from "@/api";
import { QueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";

const HEALTH_CHECK_QUERY_KEY = ["HEALTH_CHECK"];
const USER_INFO_QUERY_KEY = ["USER_INFO"];
const AVATAR_QUERY_KEY = ["AVATAR"];

export function useGetBackendStatus() {
  const result = useQuery({
    queryKey: HEALTH_CHECK_QUERY_KEY,
    queryFn: api.healthcheck,
    refetchInterval: 2000,
  });

  if (result.isError) {
    enqueueSnackbar({
      variant: "error",
      message: "Failed to connect to the backend.",
      preventDuplicate: true,
    });
  }

  if (result.isLoadingError && result.isSuccess) {
    enqueueSnackbar({
      variant: "success",
      message: "Successfully reconnected to the backend.",
      preventDuplicate: true,
    });
  }

  return result;
}

export function useGetUserProfile(options = {}) {
  const result = useQuery({
    queryKey: USER_INFO_QUERY_KEY,
    queryFn: api.getUserInfo,
    ...options,
  });

  if (result.isError) {
    enqueueSnackbar({
      variant: "error",
      message: "Error getting user info",
    });
  }

  return result;
}

export function useGetAvatar(options = {}) {
  const result = useQuery({
    queryKey: AVATAR_QUERY_KEY,
    queryFn: api.getAvatar,
    ...options,
  });

  // @ts-expect-error, detail does not exist on Error
  const message = result.error?.data?.detail;
  // @ts-expect-error, status does not exist on Error
  const status = result.error?.status;
  // check that the error is not 404
  if (status !== 404 && message) {
    enqueueSnackbar({
      variant: "error",
      message,
      preventDuplicate: true,
    });
  }

  return result;
}

export function useUpdateUserAvatar(options = {}) {
  const queryClient = new QueryClient();
  return useMutation({
    mutationFn: (file: File) => api.updateAvatar(file),
    onError() {
      enqueueSnackbar({
        variant: "error",
        message: "There was a problem updating your avatar",
      });
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: AVATAR_QUERY_KEY });
    },
    ...options,
  });
}

export function useUpdateUserInfo(options = {}) {
  const queryClient = new QueryClient();
  return useMutation({
    mutationFn: (payload: { openai_api_key: string } | { name: string }) =>
      api.updateUserInfo(payload),
    onError(_, args) {
      enqueueSnackbar({
        variant: "error",
        message:
          "name" in args ? "Error updating name" : "Error updating API key",
      });
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: USER_INFO_QUERY_KEY });
    },
    ...options,
  });
}
