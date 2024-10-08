import { enqueueSnackbar } from "notistack";
import { ConversationCreationResult, api } from "@/api";
import {
  MutationOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getBackendStatusQuery } from "@/hooks/settings";
import { useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import { useGetConnections } from "./connections";
import { isAxiosError } from "axios";

export const CONVERSATIONS_QUERY_KEY = ["CONVERSATIONS"];

export function useGetConversations() {
  const { isSuccess } = useQuery(getBackendStatusQuery());
  const result = useQuery({
    queryKey: CONVERSATIONS_QUERY_KEY,
    queryFn: async () => (await api.listConversations()).data,
    enabled: isSuccess,
  });
  const isError = result.isError;

  useEffect(() => {
    if (isError) {
      enqueueSnackbar({
        variant: "error",
        message: "Error loading conversations",
      });
    }
  }, [isError]);

  return result;
}

export function useCreateConversation(
  options: MutationOptions<
    ConversationCreationResult,
    Error,
    { id: string; name: string }
  > = {}
) {
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

export function useGenerateConversationTitle(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) =>
      (await api.generateConversationTitle(id)).data,
    onError(error) {
      if (isAxiosError(error) && error.response?.status === 400) {
        enqueueSnackbar({
          variant: "error",
          message: error.response.data.detail,
        });
      } else {
        enqueueSnackbar({
          variant: "error",
          message: "There was a problem generating a conversation title",
        });
      }
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
    },
    ...options,
  });
}

/**
 * Get the connection object for the current conversation
 *
 * **Warning:** This must be used within the conversation chat context
 *
 * @returns ConnectionResult
 */
export function useGetRelatedConnection() {
  const params = useParams({ from: "/_app/chat/$conversationId" });
  const { data: connectionsData } = useGetConnections();
  const { data: conversationsData } = useGetConversations();
  const currConversation = conversationsData?.find(
    (conv) => conv.id === params.conversationId
  );
  return connectionsData?.connections?.find(
    (conn) => conn.id === currConversation?.connection_id
  );
}
