import { api } from "@/api";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";

const HEALTH_CHECK_QUERY_KEY = ["HEALTH_CHECK"];
const USER_INFO_QUERY_KEY = ["USER_INFO"];
const AVATAR_QUERY_KEY = ["AVATAR"];

export function getBackendStatusQuery(options = {}) {
  return queryOptions({
    queryKey: HEALTH_CHECK_QUERY_KEY,
    queryFn: api.healthcheck,
    retry: false,
    ...options,
  });
}

export function useGetBackendStatus() {
  const result = useQuery(
    getBackendStatusQuery({
      refetchInterval: 2000,
    })
  );

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

export function userProfileQuery(enabled = true) {
  return queryOptions({
    queryKey: USER_INFO_QUERY_KEY,
    queryFn: async () => (await api.getUserInfo()).data,
    enabled,
  });
}

export function useGetUserProfile() {
  const { isSuccess } = useQuery(getBackendStatusQuery());
  const result = useQuery(userProfileQuery(isSuccess));

  if (
    result.isError &&
    isAxiosError(result.error) &&
    result.error.response?.status === 404
  ) {
    return { ...result, data: null };
  } else if (result.isError) {
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
    queryFn: async () => {
      try {
        return await api.getAvatar();
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === 404) {
          return null;
        } else {
          throw e;
        }
      }
    },
    staleTime: Infinity,
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
    onSuccess() {
      enqueueSnackbar({
        variant: "success",
        message: "Avatar updated",
      });
    },
    onError(error) {
      if (isAxiosError(error) && error.response?.status === 400) {
        enqueueSnackbar({
          variant: "error",
          message: error.response.data.detail,
        });
      } else {
        enqueueSnackbar({
          variant: "error",
          message: "There was a problem updating your avatar",
        });
      }
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
    mutationFn: async (payload: {
      openai_api_key?: string;
      name?: string;
      langsmith_api_key?: string;
      openai_base_url?: string;
      sentry_enabled?: boolean;
    }) => (await api.updateUserInfo(payload)).data,
    onSuccess() {
      enqueueSnackbar({
        variant: "success",
        message: "User info updated",
      });
    },
    onError() {
      enqueueSnackbar({
        variant: "error",
        message: "Error updating user info",
      });
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: USER_INFO_QUERY_KEY });
    },
    ...options,
  });
}
