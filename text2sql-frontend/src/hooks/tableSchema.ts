import { api } from "@/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";

const TABLE_SCHEMA_QUERY_KEY = ["TABLE_SCHEMA"];

export function useGetTableSchemas(id: string) {
  const result = useQuery({
    queryKey: TABLE_SCHEMA_QUERY_KEY,
    queryFn: async () => (await api.getTableSchemas(id ?? "")).data,
  });
  if (result.isError) {
    enqueueSnackbar({
      variant: "error",
      message: "Error loading table schemas",
    });
  }

  return result;
}

export function useUpdateTableSchema(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, description }: { id: string; description: string }) =>
      api.updateTableSchemaDescription(id, description),
    onError() {
      enqueueSnackbar({
        variant: "error",
        message: "Error updating table description",
      });
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: TABLE_SCHEMA_QUERY_KEY });
    },
    ...options,
  });
}

export function useUpdateTableFieldSchema(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, description }: { id: string; description: string }) =>
      api.updateTableSchemaFieldDescription(id, description),
    onError() {
      enqueueSnackbar({
        variant: "error",
        message: "Error updating table description",
      });
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: TABLE_SCHEMA_QUERY_KEY });
    },
    ...options,
  });
}
