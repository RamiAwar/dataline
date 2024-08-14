import { isAxiosError } from "axios";
import {
  DatabaseFileType,
  IConversationWithMessagesWithResultsOut,
  IMessageOptions,
  IMessageOut,
  IMessageWithResultsOut,
  IResult,
  IUserInfo,
} from "./components/Library/types";
import { IEditConnection } from "./components/Library/types";
import {
  apiURL,
  backendApi,
  configureAxiosInstance,
  isAuthEnabled,
} from "./services/api_client";
import { decodeBase64Data } from "./utils";
import { fetchEventSource } from "@microsoft/fetch-event-source";

type SuccessResponse<T> = {
  data: T;
};

type ApiResponse<T> = SuccessResponse<T>;

type HealthcheckResult = ApiResponse<void>;
const healthcheck = async (): Promise<HealthcheckResult> => {
  return (
    await backendApi<HealthcheckResult>({
      url: "/healthcheck",
      withCredentials: false,
    })
  ).data;
};

const hasAuth = async (): Promise<boolean> => {
  try {
    await backendApi({
      url: "/auth/login",
      method: "HEAD",
      withCredentials: false,
    });
    configureAxiosInstance(true);
  } catch (error) {
    if (
      isAxiosError(error) &&
      (error.response?.status === 405 || error.response?.status === 404)
    ) {
      return false;
    }
    return true; // any other error means auth enabled
  }
  return true;
};

export type ConnectionResult = {
  id: string;
  dsn: string;
  database: string;
  name: string;
  dialect: string;
  is_sample: boolean;
};
type ConnectResult = ApiResponse<ConnectionResult>;
const createConnection = async (
  connectionString: string,
  name: string,
  isSample: boolean
): Promise<ConnectResult> => {
  const response = await backendApi<ConnectResult>({
    url: "/connect",
    method: "post",
    data: {
      dsn: connectionString,
      name: name,
      is_sample: isSample,
    },
  });
  return response.data;
};

const createSampleConnection = async (
  sampleName: string,
  connectionName: string
): Promise<ConnectResult> => {
  const response = await backendApi<ConnectResult>({
    url: "/connect/sample",
    method: "post",
    data: { sample_name: sampleName, connection_name: connectionName },
  });
  return response.data;
};

const createFileConnection = async (
  file: File,
  name: string,
  type: DatabaseFileType
): Promise<ConnectResult> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", name);
  formData.append("type", type);
  const response = await backendApi<ConnectResult>({
    url: "/connect/file",
    method: "post",
    data: formData,
  });
  return response.data;
};

export type ListConnectionsResult = ApiResponse<{
  connections: ConnectionResult[];
}>;
const listConnections = async (): Promise<ListConnectionsResult> => {
  return (await backendApi<ListConnectionsResult>({ url: "/connections" }))
    .data;
};

export type GetConnectionResult = ApiResponse<ConnectionResult>;
const getConnection = async (
  connectionId: string
): Promise<GetConnectionResult> => {
  return (
    await backendApi<GetConnectionResult>({
      url: `/connection/${connectionId}`,
    })
  ).data;
};

export type SampleResult = {
  key: string;
  title: string;
  file: string;
  link: string;
};
export type GetSamplesResult = ApiResponse<SampleResult[]>;
const getSamples = async (): Promise<GetSamplesResult> => {
  const response = await backendApi<GetSamplesResult>({ url: "/samples" });
  return response.data;
};

export type UpdateConnectionResult = ApiResponse<{
  connection: ConnectionResult;
}>;
const updateConnection = async (
  connectionId: string,
  edits: IEditConnection
): Promise<UpdateConnectionResult> => {
  const response = await backendApi<UpdateConnectionResult>({
    url: `/connection/${connectionId}`,
    method: "patch",
    data: edits,
  });
  return response.data;
};

const deleteConnection = async (
  connectionId: string
): Promise<ApiResponse<void>> => {
  const response = await backendApi<ApiResponse<void>>({
    url: `/connection/${connectionId}`,
    method: "delete",
  });
  return response.data;
};

export type ConversationCreationResult = ApiResponse<{
  id: string;
}>;
const createConversation = async (connectionId: string, name: string) => {
  const response = await backendApi<ConversationCreationResult>({
    url: `/conversation`,
    method: "post",
    data: {
      connection_id: connectionId,
      name,
    },
  });
  return response.data;
};

export type ConversationUpdateResult = ApiResponse<void>;
const updateConversation = async (
  conversationId: string,
  name: string
): Promise<ConversationUpdateResult> => {
  const response = await backendApi<ConversationUpdateResult>({
    url: `/conversation/${conversationId}`,
    method: "patch",
    data: {
      name,
    },
  });
  return response.data;
};

export type ConversationDeletionResult = ApiResponse<void>;
const deleteConversation = async (conversationId: string) => {
  const response = await backendApi<ConversationDeletionResult>({
    url: `/conversation/${conversationId}`,
    method: "delete",
  });
  return response.data;
};

export type ListConversations = ApiResponse<
  IConversationWithMessagesWithResultsOut[]
>;
const listConversations = async (): Promise<ListConversations> => {
  return (await backendApi<ListConversations>({ url: "/conversations" })).data;
};

export type GetMessagesResponse = ApiResponse<IMessageWithResultsOut[]>;
const getMessages = async (
  conversationId: string
): Promise<GetMessagesResponse> => {
  return (
    await backendApi<GetMessagesResponse>({
      url: `/conversation/${conversationId}/messages`,
    })
  ).data;
};

export type MessageCreationResult = ApiResponse<void>;
const createMessage = async (conversationId: number, content: string) => {
  const response = await backendApi<MessageCreationResult>({
    url: "/message",
    method: "post",
    data: {
      conversation_id: conversationId,
      content,
    },
  });
  return response.data;
};

export const DEFAULT_OPTIONS = { secure_data: true };

export type QueryOut = ApiResponse<{
  human_message: IMessageOut;
  ai_message: IMessageWithResultsOut;
}>;
const query = async (
  conversationId: string,
  query: string,
  execute: boolean,
  message_options: IMessageOptions = DEFAULT_OPTIONS
): Promise<QueryOut> => {
  return (
    await backendApi<QueryOut>({
      url: `/conversation/${conversationId}/query`,
      params: { query, execute },
      data: { message_options },
      method: "POST",
    })
  ).data;
};

const streamingQuery = async ({
  conversationId,
  query,
  execute = true,
  message_options = DEFAULT_OPTIONS,
  onMessage,
  onClose,
}: {
  conversationId: string;
  query: string;
  execute?: boolean;
  message_options: IMessageOptions;
  onMessage: (event: string, data: string) => void;
  onClose?: () => void;
}): Promise<void> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  let baseURL = apiURL;
  if (!apiURL.endsWith("/")) {
    baseURL = baseURL + "/";
  }

  const url = `${baseURL}conversation/${conversationId}/query?execute=${execute}&query=${encodeURIComponent(query)}`;

  return fetchEventSource(url, {
    headers: headers,
    method: "POST",
    body: JSON.stringify({ message_options }),
    onmessage(ev) {
      onMessage(ev.event, ev.data);
    },
    onclose() {
      onClose && onClose();
    },
    onerror(err) {
      onClose && onClose();
      // Tried using a AbortController witgh ctrl.abort, but doesn't work, see issue below
      // https://github.com/Azure/fetch-event-source/issues/24#issuecomment-1470332423
      throw new Error(err);
    },
    openWhenHidden: true,
    credentials: isAuthEnabled() ? "include" : "omit",
  });
};

export type RunSQLResult = ApiResponse<IResult>;
const runSQL = async (
  conversationId: string,
  code: string,
  linkedId: string
) => {
  return (
    await backendApi<RunSQLResult>({
      url: `/conversation/${conversationId}/run-sql`,
      params: { sql: code, linked_id: linkedId },
    })
  ).data;
};

export type GetAvatarResult = ApiResponse<{ blob: string }>;
const getAvatar = async () => {
  return decodeBase64Data(
    (await backendApi<GetAvatarResult>({ url: `/settings/avatar` })).data.data
      .blob
  );
};

export type UpdateAvatarResult = ApiResponse<{ blob: string }>;
const updateAvatar = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await backendApi<UpdateAvatarResult>({
    url: `/settings/avatar`,
    method: "post",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Optional name or openai_api_key
export type UpdateUserInfoResult = ApiResponse<IUserInfo>;
const updateUserInfo = async (options: {
  name?: string;
  openai_api_key?: string;
  langsmith_api_key?: string;
  openai_base_url?: string;
  sentry_enabled?: boolean;
}) => {
  const {
    name,
    openai_api_key,
    langsmith_api_key,
    openai_base_url,
    sentry_enabled,
  } = options;
  // send only the filled in fields
  const data: Partial<IUserInfo> = {
    ...(name && { name }),
    ...(openai_api_key && { openai_api_key }),
    ...(sentry_enabled != null && { sentry_enabled }),
  };
  if (langsmith_api_key !== undefined) {
    // When deleting the langsmith API key
    data.langsmith_api_key =
      langsmith_api_key === "" ? null : langsmith_api_key;
  }
  if (openai_base_url !== undefined) {
    // When deleting the base URL
    data.openai_base_url = openai_base_url === "" ? null : openai_base_url;
  }
  const response = await backendApi<UpdateUserInfoResult>({
    url: "/settings/info",
    method: "patch",
    data,
  });
  return response.data;
};

export type GetUserInfoResult = ApiResponse<IUserInfo>;
const getUserInfo = async () => {
  return (await backendApi<GetUserInfoResult>({ url: `/settings/info` })).data;
};

export type RefreshChartResult = ApiResponse<{
  created_at: string;
  chartjs_json: string;
}>;
const refreshChart = async (chartResultId: string) => {
  return (
    await backendApi<RefreshChartResult>({
      url: `/result/chart/${chartResultId}/refresh`,
      method: "patch",
    })
  ).data;
};

export type UpdateSQLQueryStringResponse =
  | RefreshChartResult
  | ApiResponse<void>;
const updateSQLQueryString = async (
  resultId: string,
  code: string,
  forChart: boolean = false
) => {
  const response = await backendApi<UpdateSQLQueryStringResponse>({
    url: `/result/sql/${resultId}`,
    method: "patch",
    data: {
      sql: code,
      for_chart: forChart,
    },
  });

  if (forChart) return response.data as RefreshChartResult;

  return response.data as ApiResponse<void>;
};

export type LoginResponse = ApiResponse<void>;
const login = async (username: string, password: string) => {
  const response = await backendApi<LoginResponse>({
    method: "POST",
    url: "/auth/login",
    data: { username, password },
  });
  return response;
};

export type LogoutResponse = ApiResponse<void>;
const logout = async () => {
  const response = await backendApi<LogoutResponse>({
    method: "POST",
    url: "/auth/logout",
  });
  return response;
};

export const api = {
  healthcheck,
  hasAuth,
  getConnection,
  getSamples,
  createConnection,
  createSampleConnection,
  createFileConnection,
  updateConnection,
  deleteConnection,
  listConnections,
  listConversations,
  login,
  logout,
  createConversation,
  updateConversation,
  deleteConversation,
  getMessages,
  createMessage,
  query,
  streamingQuery,
  runSQL,
  updateSQLQueryString,
  getAvatar,
  updateAvatar,
  updateUserInfo,
  getUserInfo,
  refreshChart,
};
