import { api } from "@/api";
import { IMessageWithResults } from "@/components/Library/types";
import {
  infiniteQueryOptions,
  queryOptions,
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";

const MESSAGES_QUERY_KEY = ["MESSAGES"];
const QUERIES_QUERY_KEY = ["SQL_QUERIES"];

// Retired
export function infiniteMessagesQuery({
  id,
  offset = 0,
}: {
  id: string;
  offset?: number;
}) {
  return infiniteQueryOptions({
    queryKey: [...MESSAGES_QUERY_KEY, id, "infinite"],
    queryFn: async ({ pageParam }) =>
      await api.getMessagesInfinite(id, pageParam),
    initialPageParam: offset,
    getPreviousPageParam: (lastPage, _allPages, lastPageParam) => {
      if (!lastPage.hasNext) {
        return undefined;
      }
      return lastPageParam + lastPage.limit;
    },
    getNextPageParam: (firstPage, _allPages, firstPageParam) => {
      if (firstPageParam === 0) {
        return undefined;
      }
      return Math.max(firstPageParam - firstPage.limit, 0);
    },
  });
}

// Retired
export function useSendMessageInfinite({
  id,
  execute = true,
}: {
  id: string;
  execute?: boolean;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async (message: string) =>
      await api.query(id, message, execute),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        infiniteMessagesQuery({ id }).queryKey,
        (oldData) => {
          const flattenedMessages = oldData!.pages
            .map((page) => page.messages)
            .flat();
          flattenedMessages.push({ content: variables, role: "user" });
          flattenedMessages.push({ ...data.message });
          const pages = [
            {
              hasNext: oldData!.pages[0].hasNext,
              messages: flattenedMessages,
              offset: 0,
              limit: flattenedMessages.length,
            },
          ];
          const pageParams = [0];
          console.log({ pages, pageParams });
          return { pages, pageParams };
        }
      );
    },
  });
}

// Not infinite scroll, load everything
export function getMessagesQuery({ id }: { id: string }) {
  return queryOptions({
    queryKey: [...MESSAGES_QUERY_KEY, id],
    queryFn: async () => await api.getMessages(id),
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
    mutationFn: async (message: string) =>
      await api.query(id, message, execute),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(getMessagesQuery({ id }).queryKey, (oldData) => {
        const newMessages: IMessageWithResults[] = [
          { content: variables, role: "user" },
          data.message,
        ];
        if (oldData == null) {
          return { messages: newMessages };
        }
        return { messages: [...oldData.messages, ...newMessages] };
      });
    },
    onError: () =>
      enqueueSnackbar({
        variant: "error",
        message: "Error querying assistant",
      }),
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
  const result = useQuery({
    queryKey: [...MESSAGES_QUERY_KEY, { id }],
    queryFn: () => api.getMessages(id),
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
    queryFn: () => (enabled ? api.runSQL(id ?? "", sql ?? "") : skipToken),
    enabled,
  });

  if (result.isError) {
    enqueueSnackbar({ variant: "error", message: "Error running query" });
  }

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
