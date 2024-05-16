import { api } from "@/api";
import { IMessageWithResultsOut } from "@/components/Library/types";
import {
  queryOptions,
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getBackendStatusQuery } from "@/hooks/settings";
import { isAxiosError } from "axios";

const MESSAGES_QUERY_KEY = ["MESSAGES"];
const QUERIES_QUERY_KEY = ["SQL_QUERIES"];

// Load everything
export function getMessagesQuery({ conversationId }: { conversationId: number }) {
  return queryOptions({
    queryKey: [...MESSAGES_QUERY_KEY, conversationId],
    queryFn: async () => (await api.getMessages(conversationId)).data,
  });
}

export function useSendMessage({
  conversationId,
  execute = true,
}: {
  conversationId: number;
  execute?: boolean;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async ({ message }: { message: string }) =>
      (await api.query(conversationId, message, execute)).data,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(getMessagesQuery({ conversationId }).queryKey, (oldData) => {
        const newMessages: IMessageWithResultsOut[] = [
          { content: variables.message, role: "user" },
          data.message,
        ];
        if (oldData == null) {
          return { messages: newMessages };
        }
        return { messages: [...oldData.messages, ...newMessages] };
      });
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

export function useGetNewMessage({
  conversationId,
  value,
  execute = true,
}: {
  conversationId: number;
  value: string;
  execute?: boolean;
}) {
  const result = useQuery({
    queryKey: [...MESSAGES_QUERY_KEY, { conversationId, value, execute }],
    queryFn: () => api.query(conversationId, value, execute),
    enabled: Boolean(value),
    retry: false,
  });

  if (result.isError) {
    enqueueSnackbar({
      variant: "error",
      message: "Error querying assistant",
    });
  }

  return result;
}

export function useGetMessages(conversationId: number) {
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

export function useRunSql({
  conversationId,
  sql,
  enabled,
}: {
  conversationId: number;
  sql: string;
  enabled: boolean;
}) {
  const result = useQuery({
    queryKey: [...QUERIES_QUERY_KEY, { conversationId, sql }],
    queryFn: enabled
      ? async () => (await api.runSQL(conversationId, sql)).data
      : skipToken,
    enabled,
    retry: false,
  });

  return result;
}

export function useUpdateSqlQuery(options = {}) {
  return useMutation({
    mutationFn: ({ id, code }: { id: string; code: string }) =>
      api.updateResult(id, code),
    onError() {
      enqueueSnackbar({ variant: "error", message: "Error updating query" });
    },
    ...options,
  });
}
