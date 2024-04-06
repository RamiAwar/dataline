import { api } from "@/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";

const HEALTH_CHECK_QUERY_KEY = ["HEALTH_CHECK"];
const USER_INFO_QUERY_KEY = ["USER_INFO"];
const AVATAR_QUERY_KEY = ["AVATAR"];

export function useGetBackendStatus() {
  const result = useQuery({
    queryKey: HEALTH_CHECK_QUERY_KEY,
    queryFn: api.healthcheck,
    refetchInterval: 2000,
    // don't retry on fail, fail immediately. We're already refetching every 2 seconds
    retry: false,
  });

  const [previousHealthState, setPreviousHealthState] = useState(true);

  useEffect(() => {
    if (result.isPending) return;
    const isHealthy = result.isSuccess;
    if (previousHealthState !== isHealthy) {
      if (isHealthy) {
        enqueueSnackbar({
          variant: "success",
          message: "Successfully reconnected to the backend.",
          preventDuplicate: true,
        });
      } else {
        enqueueSnackbar({
          variant: "error",
          message: "Failed to connect to the backend.",
          preventDuplicate: true,
        });
      }
      setPreviousHealthState(isHealthy);
    }
  }, [previousHealthState, result]);

  return result;
}

export function useGetUserProfile(options = {}) {
  const result = useQuery({
    queryKey: USER_INFO_QUERY_KEY,
    queryFn: async () => (await api.getUserInfo()).data,
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
    retry: false,
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
  const queryClient = useQueryClient();
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
  const queryClient = useQueryClient();
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
