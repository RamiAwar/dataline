import { enqueueSnackbar } from "notistack";
import { api } from "@/api";
import {
  useMutation,
  useQuery,
  useQueryClient,
  queryOptions,
} from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { DatabaseFileType, IEditConnection } from "@/components/Library/types";
import { CONVERSATIONS_QUERY_KEY } from "./conversations";
import { getBackendStatusQuery } from "@/hooks/settings";
import { useEffect } from "react";

function getConnectionsQuery(options = {}) {
  return queryOptions({
    queryKey: ["CONNECTIONS"],
    queryFn: async () => (await api.listConnections()).data,
    ...options,
  });
}

export function useGetConnections() {
  const { isSuccess } = useQuery(getBackendStatusQuery());
  const result = useQuery(getConnectionsQuery({ enabled: isSuccess }));

  const isError = result.isError;

  useEffect(() => {
    if (isError) {
      enqueueSnackbar({
        variant: "error",
        message: "Error loading connections",
      });
    }
  }, [isError]);

  return result;
}

export function useGetConnection(id?: string) {
  const { isSuccess } = useQuery(getBackendStatusQuery());
  const result = useQuery({
    queryKey: ["CONNECTIONS", { id }],
    queryFn: async () => (await api.getConnection(id ?? "")).data,
    enabled: isSuccess && Boolean(id),
  });

  if (result.isError) {
    enqueueSnackbar({
      variant: "error",
      message: "Error fetching connection",
    });
  }
  return result;
}

const defaultCreateErrorHandler = (err: Error) => {
  if (isAxiosError(err) && err.response?.status === 404) {
    enqueueSnackbar({
      variant: "error",
      message: "Sample not found",
    });
  } else if (!isAxiosError(err)) {
    enqueueSnackbar({
      variant: "error",
      message: "Error creating connection.",
    });
    return;
  }

  if (err.response?.status === 409) {
    enqueueSnackbar({
      variant: "info",
      message: "Connection already exists, skipping creation",
    });
  } else if (err.response?.status === 422) {
    enqueueSnackbar({
      variant: "error",
      message: err.response?.data.detail[0].msg,
    });
  } else if (err.response?.status === 400) {
    enqueueSnackbar({
      variant: "error",
      message: err.response?.data.detail,
    });
  } else if (err.response?.data?.detail) {
    enqueueSnackbar({
      variant: "error",
      message: err.response?.data?.detail,
    });
  } else {
    enqueueSnackbar({
      variant: "error",
      message: "Error creating connection.",
    });
  }
};

export function useCreateConnection(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      dsn,
      name,
      isSample,
    }: {
      dsn: string;
      name: string;
      isSample: boolean;
    }) => api.createConnection(dsn, name, isSample),
    onSettled() {
      queryClient.invalidateQueries({
        queryKey: getConnectionsQuery().queryKey,
      });
    },
    onError: defaultCreateErrorHandler,
    ...options,
  });
}

export function useCreateSampleConnection(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, name }: { key: string; name: string }) =>
      api.createSampleConnection(key, name),
    onSettled() {
      queryClient.invalidateQueries({
        queryKey: getConnectionsQuery().queryKey,
      });
    },
    onError: defaultCreateErrorHandler,
    ...options,
  });
}

export function useCreateFileConnection(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      name,
      type,
    }: {
      file: File;
      name: string;
      type: DatabaseFileType;
    }) => api.createFileConnection(file, name, type),
    onSettled() {
      queryClient.invalidateQueries({
        queryKey: getConnectionsQuery().queryKey,
      });
    },
    onError: defaultCreateErrorHandler,
    ...options,
  });
}

export function useDeleteConnection(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteConnection(id),
    onError() {
      enqueueSnackbar({
        variant: "error",
        message: "Error deleting connection",
      });
    },
    onSettled() {
      // previous implementation, Rami refetched connections and conversations.. WHY????
      // => because related conversations get deleted as well
      queryClient.invalidateQueries({
        queryKey: getConnectionsQuery().queryKey,
      });
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
    },
    ...options,
  });
}

export function useUpdateConnection(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: IEditConnection }) =>
      api.updateConnection(id, payload),
    onError() {
      enqueueSnackbar({
        variant: "error",
        message: "Error updating connection",
      });
    },
    onSettled() {
      queryClient.invalidateQueries({
        queryKey: getConnectionsQuery().queryKey,
      });
    },
    ...options,
  });
}

export function useGetSamples() {
  const { isSuccess } = useQuery(getBackendStatusQuery());
  return useQuery({
    queryKey: ["DB_SAMPLES"],
    queryFn: async () => (await api.getSamples()).data,
    enabled: isSuccess,
  });
}
