import { api } from "@/api";
import { IMessageWithResults } from "@/components/Library/types";
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
export function getMessagesQuery({ id }: { id: string }) {
  return queryOptions({
    queryKey: [...MESSAGES_QUERY_KEY, id],
    queryFn: async () => (await api.getMessages(id)).data,
  });
}

export function useSendMessage({
  id,
  execute = true,
}: {
  id: string;
  execute?: boolean;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async ({ message }: { message: string }) =>
      (await api.query(id, message, execute)).data,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(getMessagesQuery({ id }).queryKey, (oldData) => {
        const newMessages: IMessageWithResults[] = [
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
  id,
  value,
  execute = true,
}: {
  id: string;
  value: string;
  execute?: boolean;
}) {
  const result = useQuery({
    queryKey: [...MESSAGES_QUERY_KEY, { id, value, execute }],
    queryFn: () => api.query(id, value, execute),
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

export function useGetMessages(id: string) {
  const { isSuccess } = useQuery(getBackendStatusQuery());
  const result = useQuery({
    queryKey: [...MESSAGES_QUERY_KEY, { id }],
    queryFn: () => api.getMessages(id),
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
  id,
  sql,
  enabled,
}: {
  id?: string;
  sql?: string;
  enabled: boolean;
}) {
  const result = useQuery({
    queryKey: [...QUERIES_QUERY_KEY, { id, sql }],
    queryFn: enabled
      ? async () => (await api.runSQL(id ?? "", sql ?? "")).data
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
