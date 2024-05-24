import { DEFAULT_OPTIONS } from "@/api";
import { IMessageOptions } from "@/components/Library/types";

export interface IStorageMessageOptions {
  [connection_id: string]: IMessageOptions;
}

export function readMessageOptionsFromLocalStorage(
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

export function saveMessageOptionsToLocalStorage(
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
