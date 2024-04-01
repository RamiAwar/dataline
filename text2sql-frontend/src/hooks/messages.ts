import { api } from "@/api";
import { skipToken, useMutation, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";

const MESSAGES_QUERY_KEY = ["MESSAGES"];
const QUERIES_QUERY_KEY = ["SQL_QUERIES"];

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
