import { DEFAULT_OPTIONS } from "@/api";
import { IMessageOptions } from "@/components/Library/types";
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";

export interface IStorageMessageOptions {
  [connection_id: string]: IMessageOptions;
}

function readMessageOptionsFromLocalStorage(
  connection_id: string | undefined
): IMessageOptions {
  if (connection_id == null) {
    return DEFAULT_OPTIONS;
  }
  const allMessageOptions = JSON.parse(
    localStorage.getItem("message_options") ?? "{}"
  ) as IStorageMessageOptions;
  if (connection_id in allMessageOptions) {
    return allMessageOptions[connection_id];
  } else {
    return DEFAULT_OPTIONS;
  }
}

export function getMessageOptions(
  connection_id: string | undefined,
  options = {}
) {
  return queryOptions({
    queryKey: ["MESSAGE_OPTIONS", connection_id],
    queryFn: () => readMessageOptionsFromLocalStorage(connection_id),
    retry: false,
    ...options,
  });
}

function saveMessageOptionsToLocalStorage(
  connection_id: string,
  changes: Partial<IMessageOptions>
) {
  const allMessageOptions = JSON.parse(
    localStorage.getItem("message_options") ?? "{}"
  ) as IStorageMessageOptions;
  if (connection_id in allMessageOptions) {
    allMessageOptions[connection_id] = {
      ...allMessageOptions[connection_id],
      ...changes,
    };
  } else {
    allMessageOptions[connection_id] = {
      ...DEFAULT_OPTIONS,
      ...changes,
    };
  }
  localStorage.setItem("message_options", JSON.stringify(allMessageOptions));
}

export function usePatchMessageOptions(connection_id?: string, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (changes: Partial<IMessageOptions>) =>
      connection_id && saveMessageOptionsToLocalStorage(connection_id, changes),
    onError() {
      enqueueSnackbar({
        variant: "error",
        message: "Error updating message options",
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: getMessageOptions(connection_id).queryKey,
      });
    },
    ...options,
  });
}
