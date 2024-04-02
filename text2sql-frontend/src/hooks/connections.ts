import { enqueueSnackbar } from "notistack";
import { api } from "@/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { IEditConnection } from "@/components/Library/types";
import { CONVERSATIONS_QUERY_KEY } from "./conversations";

const CONNECTIONS_QUERY_KEY = ["CONNECTIONS"];

export function useGetConnections() {
  const result = useQuery({
    queryKey: CONNECTIONS_QUERY_KEY,
    queryFn: api.listConnections,
  });

  if (result.isError) {
    enqueueSnackbar({
      variant: "error",
      message: "Error loading conversations",
    });
  }

  return result;
}

export function useGetConnection(id?: string) {
  const result = useQuery({
    queryKey: [...CONNECTIONS_QUERY_KEY, { id }],
    queryFn: () => api.getConnection(id ?? ""),
    enabled: Boolean(id),
  });

  if (result.isError) {
    enqueueSnackbar({
      variant: "error",
      message: "Error fetching connection",
    });
  }
  return result;
}

export function useCreateConnection(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dsn, name }: { dsn: string; name: string }) =>
      api.createConnection(dsn, name),
    onSettled() {
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY });
    },
    onError(err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        // Connection already exists, skip creation but don't close or clear modal
        enqueueSnackbar({
          variant: "info",
          message: "Connection already exists, skipping creation",
        });
      } else {
        enqueueSnackbar({
          variant: "error",
          message: "Error creating connection",
        });
      }
    },
    ...options,
  });
}

export function useCreateTestConnection(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.createTestConnection(),
    onError(err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        // Connection already exists, skip creation but don't close or clear modal
        enqueueSnackbar({
          variant: "info",
          message: "Connection already exists, skipping creation",
        });
      } else {
        enqueueSnackbar({
          variant: "error",
          message: "Error creating connection",
        });
      }
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY });
    },
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
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY });
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
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY });
    },
    ...options,
  });
}
