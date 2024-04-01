import { enqueueSnackbar } from "notistack";
import { api } from "@/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const CONVERSATIONS_QUERY_KEY = ["CONVERSATIONS"];

export function useGetConversations() {
  const result = useQuery({
    queryKey: CONVERSATIONS_QUERY_KEY,
    queryFn: api.listConversations,
  });

  if (result.isError) {
    enqueueSnackbar({
      variant: "error",
      message: "Error loading conversations",
    });
  }

  return result;
}

export function useCreateConversation(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.createConversation(id, name),
    onError() {
      enqueueSnackbar({
        variant: "error",
        message: "Error creating conversation",
      });
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
    },
    ...options,
  });
}

export function useDeleteConversation(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteConversation(id),
    onError() {
      enqueueSnackbar({
        variant: "error",
        message: "Error deleting conversation",
      });
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
    },
    ...options,
  });
}

export function useUpdateConversation(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.updateConversation(id, name),
    onError() {
      enqueueSnackbar({
        variant: "error",
        message: "Error updating conversation",
      });
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
    },
    ...options,
  });
}
