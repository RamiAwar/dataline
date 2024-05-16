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
import { generateUUID } from "@/components/Library/utils";

const MESSAGES_QUERY_KEY = ["MESSAGES"];
const QUERIES_QUERY_KEY = ["SQL_QUERIES"];

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
  return useMutation({
    retry: false,
    mutationFn: async ({ message }: { message: string }) =>
      (await api.query(conversationId, message, execute)).data,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        getMessagesQuery({ conversationId }).queryKey,
        (oldData) => {
          const newMessages: IMessageWithResultsOut[] = [
            // TODO: we're currently creating a fake id for the human message because /query doesn't
            // return ID of the human's message
            { content: variables.message, role: "human", id: generateUUID() },
            { ...data.message, results: data.results },
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

export function useRunSql({
  conversationId,
  sql,
  enabled,
}: {
  conversationId: string;
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
