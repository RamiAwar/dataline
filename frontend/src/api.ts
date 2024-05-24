// import axios from "axios";
import {
  IConversationWithMessagesWithResultsOut,
  IMessageOptions,
  IMessageOut,
  IMessageWithResultsOut,
  IResult,
  ISelectedTablesResult,
  ISQLQueryRunResult,
  ISQLQueryStringResult,
} from "./components/Library/types";
import { IEditConnection } from "./components/Library/types";
import { backendApi } from "./services/api_client";
import { decodeBase64Data } from "./utils";

type SuccessResponse<T> = {
  data: T;
};

type ApiResponse<T> = SuccessResponse<T>;

type HealthcheckResult = ApiResponse<void>;
const healthcheck = async (): Promise<HealthcheckResult> => {
  return (await backendApi<HealthcheckResult>({ url: "/healthcheck" })).data;
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

const createFileConnection = async (
  file: File,
  name: string,
  type: "sqlite" | "csv"
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
export type MessageWithResultsOut = ApiResponse<{
  message: IMessageOut;
  results: (
    | ISelectedTablesResult
    | ISQLQueryRunResult
    | ISQLQueryStringResult
  )[];
}>;
const query = async (
  conversationId: string,
  query: string,
  execute: boolean,
  message_options: IMessageOptions = DEFAULT_OPTIONS
): Promise<MessageWithResultsOut> => {
  return (
    await backendApi<MessageWithResultsOut>({
      url: `/conversation/${conversationId}/query`,
      params: { query, execute },
      data: { message_options },
      method: "POST",
    })
  ).data;
};

export type RunSQLResult = ApiResponse<IResult>;
const runSQL = async (conversationId: string, code: string) => {
  return (
    await backendApi<RunSQLResult>({
      url: "/execute-sql",
      params: { conversation_id: conversationId, sql: code },
    })
  ).data;
};

export type UpdateSQLQueryStringResponse = ApiResponse<void>;
const updateSQLQueryString = async (resultId: string, code: string) => {
  const response = await backendApi<UpdateSQLQueryStringResponse>({
    url: `/result/sql/${resultId}`,
    method: "patch",
    data: {
      sql: code,
    },
  });
  return response.data;
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
export type UpdateUserInfoResult = ApiResponse<void>;
const updateUserInfo = async (options: {
  name?: string;
  openai_api_key?: string;
}) => {
  const { name, openai_api_key } = options;
  // send only the filled in fields
  const data = {
    ...(name && { name }),
    ...(openai_api_key && { openai_api_key }),
  };
  const response = await backendApi<UpdateUserInfoResult>({
    url: `/settings/info`,
    method: "patch",
    data,
  });
  return response.data;
};

export type GetUserInfoResult = ApiResponse<{
  name: string;
  openai_api_key: string;
}>;
const getUserInfo = async () => {
  return (await backendApi<GetUserInfoResult>({ url: `/settings/info` })).data;
};

export const api = {
  healthcheck,
  getConnection,
  getSamples,
  createConnection,
  createFileConnection,
  updateConnection,
  deleteConnection,
  listConnections,
  listConversations,
  createConversation,
  updateConversation,
  deleteConversation,
  getMessages,
  createMessage,
  query,
  runSQL,
  updateResult: updateSQLQueryString,
  getAvatar,
  updateAvatar,
  updateUserInfo,
  getUserInfo,
};
