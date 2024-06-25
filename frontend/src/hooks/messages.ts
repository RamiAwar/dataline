import { api, RefreshChartResult, UpdateSQLQueryStringResponse } from "@/api";
import {
  IMessageOut,
  IMessageWithResultsOut,
  IResult,
  IResultType,
  QueryStreamingEvent,
} from "@/components/Library/types";
import {
  DefaultError,
  queryOptions,
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { isAxiosError } from "axios";
import { getMessageOptions } from "./messageOptions";
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

type QueryOut = {
  human_message: IMessageOut;
  ai_message: IMessageWithResultsOut;
};

export function useSendMessageStreaming({
  onAddResult,
  onSettled,
}: {
  onAddResult: (result: IResultType) => void;
  onSettled: () => void;
}) {
  const queryClient = useQueryClient();
  const current_connection = useGetRelatedConnection();

  return useMutation({
    retry: false,
    mutationFn: async ({
      message,
      conversationId,
      execute = true,
    }: {
      message: string;
      conversationId: string;
      execute?: boolean;
    }): Promise<QueryOut | null> => {
      const messageOptions = await queryClient.fetchQuery(
        getMessageOptions(current_connection?.id)
      );
      let queryOut: QueryOut | null = null;
      await api.streamingQuery({
        conversationId,
        query: message,
        execute,
        message_options: messageOptions,
        onMessage(event, data) {
          if (event === QueryStreamingEvent.STORED_MESSAGES.valueOf()) {
            queryOut = JSON.parse(data) as QueryOut;
          } else if (event === QueryStreamingEvent.ADD_RESULT.valueOf()) {
            onAddResult(JSON.parse(data));
          } else if (event === QueryStreamingEvent.ERROR.valueOf()) {
            enqueueSnackbar({
              variant: "error",
              message: data,
              persist: true,
            });
          }
        },
      });

      return queryOut;
    },
    onSuccess: (data, variables) => {
      if (data === null) return;
      // Update the cached value for the messages query for the given conversation.
      // Basically appends the human message and ai message with results to the list of cached messages
      queryClient.setQueryData(
        getMessagesQuery({ conversationId: variables.conversationId }).queryKey,
        (oldData) => {
          const newMessages: IMessageWithResultsOut[] = [
            { message: data.human_message },
            {
              message: { ...data.ai_message.message },
              results: data.ai_message.results,
            },
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
    onSettled,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const current_connection = useGetRelatedConnection();

  return useMutation({
    retry: false,
    mutationFn: async ({
      message,
      conversationId,
      execute = true,
    }: {
      message: string;
      conversationId: string;
      execute?: boolean;
    }) => {
      const messageOptions = await queryClient.fetchQuery(
        getMessageOptions(current_connection?.id)
      );
      return (await api.query(conversationId, message, execute, messageOptions))
        .data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        getMessagesQuery({ conversationId: variables.conversationId }).queryKey,
        (oldData) => {
          const newMessages: IMessageWithResultsOut[] = [
            { message: data.human_message },
            {
              message: { ...data.ai_message.message },
              results: data.ai_message.results,
            },
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

export function useRunSql(
  {
    conversationId,
    sql,
    linkedId,
  }: {
    conversationId: string;
    sql: string;
    linkedId: string;
  },
  options: UseMutationOptions<IResult> = {}
) {
  return useMutation({
    mutationFn: async () =>
      (await api.runSQL(conversationId, sql, linkedId)).data,
    onError() {
      enqueueSnackbar({ variant: "error", message: "Error running query" });
    },
    onSuccess() {
      enqueueSnackbar({
        variant: "success",
        message: "Query executed successfully",
        autoHideDuration: 1500,
      });
    },
    ...options,
  });
}

export function useUpdateSqlQuery(
  options: UseMutationOptions<
    UpdateSQLQueryStringResponse,
    DefaultError,
    { id: string; code: string; forChart: boolean }
  >
) {
  return useMutation({
    mutationFn: ({
      id,
      code,
      forChart,
    }: {
      id: string;
      code: string;
      forChart: boolean;
    }) => api.updateSQLQueryString(id, code, forChart),
    onError(error) {
      if (isAxiosError(error) && error.response?.status === 400) {
        enqueueSnackbar({
          variant: "error",
          message: error.response.data.message,
          persist: true,
        });
      } else {
        enqueueSnackbar({
          variant: "error",
          message: "Error updating query, make sure SQL is valid!",
        });
      }
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

export function useRefreshChartData(
  options: UseMutationOptions<
    RefreshChartResult,
    DefaultError,
    { chartResultId: string }
  >
) {
  return useMutation({
    mutationFn: async ({ chartResultId }: { chartResultId: string }) =>
      await api.refreshChart(chartResultId),
    onError() {
      enqueueSnackbar({ variant: "error", message: "Error refreshing chart" });
    },
    onSuccess() {
      enqueueSnackbar({
        variant: "success",
        message: "Chart updated!",
      });
    },
    ...options,
  });
}
