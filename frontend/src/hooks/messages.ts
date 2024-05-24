import { api } from "@/api";
import { IMessageWithResultsOut, IResult } from "@/components/Library/types";
import {
  queryOptions,
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getBackendStatusQuery } from "@/hooks/settings";
import { isAxiosError } from "axios";
import { getMessasgeOptions } from "./messageOptions";
import { useGetRelatedConnection } from "./conversations";

const MESSAGES_QUERY_KEY = ["MESSAGES"];

// Load everything
export function getMessagesQuery({
  conversationId,
}: {
  conversationId: string;
}) {
  return queryOptions({
    queryKey: [...MESSAGES_QUERY_KEY, conversationId],
    queryFn: async () => (await api.getMessages(conversationId)).data,
  });
}

export function useSendMessage({
  conversationId,
  execute = true,
}: {
  conversationId: string;
  execute?: boolean;
}) {
  const queryClient = useQueryClient();
  const current_connection = useGetRelatedConnection();
  const { data: messageOptions } = useQuery(
    getMessasgeOptions(current_connection?.id)
  );
  return useMutation({
    retry: false,
    mutationFn: async ({ message }: { message: string }) =>
      (await api.query(conversationId, message, execute, messageOptions)).data,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        getMessagesQuery({ conversationId }).queryKey,
        (oldData) => {
          const newMessages: IMessageWithResultsOut[] = [
            { message: { content: variables.message, role: "human" } },
            { message: { ...data.message }, results: data.results },
          ];
          if (oldData == null) {
            return newMessages;
          }
          return [...oldData, ...newMessages];
        }
      );
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 406) {
        enqueueSnackbar({
          variant: "error",
          message: error.response.data.message,
          persist: true,
        });
      } else {
        enqueueSnackbar({
          variant: "error",
          message: "Error querying assistant",
        });
      }
    },
  });
}

export function useGetMessages(conversationId: string) {
  const { isSuccess } = useQuery(getBackendStatusQuery());
  const result = useQuery({
    queryKey: [...MESSAGES_QUERY_KEY, { conversationId }],
    queryFn: () => api.getMessages(conversationId),
    enabled: isSuccess,
  });

  if (result.isError) {
    enqueueSnackbar({
      variant: "error",
      message: "Error getting messages",
    });
  }

  return result;
}

export function useRunSql(
  {
    conversationId,
    sql,
  }: {
    conversationId: string;
    sql: string;
  },
  options = {}
) {
  return useMutation({
    mutationFn: async () => (await api.runSQL(conversationId, sql)).data,
    onError() {
      enqueueSnackbar({ variant: "error", message: "Error running query" });
    },
    onSuccess() {
      enqueueSnackbar({
        variant: "success",
        message: "Query executed successfully",
      });
    },
    ...options,
  });
}

export function useUpdateSqlQuery(options = {}) {
  return useMutation({
    mutationFn: ({ id, code }: { id: string; code: string }) =>
      api.updateResult(id, code),
    onError() {
      enqueueSnackbar({ variant: "error", message: "Error updating query" });
    },
    onSuccess() {
      enqueueSnackbar({
        variant: "success",
        message: "Query updated successfully",
      });
    },
    ...options,
  });
}
