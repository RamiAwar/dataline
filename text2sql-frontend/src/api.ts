// import axios from "axios";
import {
  IConversationResult,
  IMessageWithResults,
  IResult,
  ITableSchemaResult,
} from "./components/Library/types";
import { IEditConnection } from "./components/Library/types";
import { backendApi } from "./services/api_client";
import { decodeBase64Data } from "./utils";

type SuccessResponse<T> = {
  status: "ok";
  data: T;
};

type ApiResponse<T> = SuccessResponse<T>;

// interface AuthTokens {
//   accessToken: string;
//   refreshToken: string;
// }
// Create wrapper around axios get/post/patch/delete to add auth tokens as headers and forward types
// const get = async <T>(url: string, tokens: AuthTokens): Promise<T> => {
//   const response = await axios.get<T>(url, {
//     headers: {
//       "X-Access-Token": tokens.accessToken,
//       "X-Refresh-Token": tokens.refreshToken,
//     },
//   });
//   return response.data;
// };

// const post = async <T>(
//   url: string,
//   tokens: AuthTokens,
//   data: any
// ): Promise<T> => {
//   const response = await axios.post<T>(url, data, {
//     headers: {
//       "X-Access-Token": tokens.accessToken,
//       "X-Refresh-Token": tokens.refreshToken,
//     },
//   });
//   return response.data;
// };

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
  name: string
): Promise<ConnectResult> => {
  const response = await backendApi<ConnectResult>({
    url: "/connect",
    method: "post",
    data: {
      dsn: connectionString,
      name: name,
    },
  });
  return response.data;
};

const createTestConnection = async (): Promise<ConnectResult> => {
  const response = await backendApi<ConnectResult>({
    url: "/create-sample-db",
    method: "post",
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

export type GetConnectionResult = ApiResponse<{ connection: ConnectionResult }>;
const getConnection = async (
  connectionId: string
): Promise<GetConnectionResult> => {
  return (
    await backendApi<GetConnectionResult>({
      url: `/connection/${connectionId}`,
    })
  ).data;
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

export type GetTableSchemasResult = ApiResponse<{
  tables: ITableSchemaResult[];
}>;
const getTableSchemas = async (
  connectionId: string
): Promise<GetTableSchemasResult> => {
  return (
    await backendApi<GetTableSchemasResult>({
      url: `/connection/${connectionId}/schemas`,
    })
  ).data;
};

export type UpdateTableSchemaDescriptionResult = ApiResponse<void>;
const updateTableSchemaDescription = async (
  tableId: string,
  description: string
): Promise<UpdateTableSchemaDescriptionResult> => {
  const response = await backendApi<UpdateTableSchemaDescriptionResult>({
    url: `/schemas/table/${tableId}`,
    method: "patch",
    data: {
      description,
    },
  });
  return response.data;
};

export type UpdateTableSchemaFieldDescriptionResult = ApiResponse<void>;
const updateTableSchemaFieldDescription = async (
  fieldId: string,
  description: string
): Promise<UpdateTableSchemaFieldDescriptionResult> => {
  const response = await backendApi<UpdateTableSchemaFieldDescriptionResult>({
    url: `/schemas/field/${fieldId}`,
    method: "patch",
    data: {
      description,
    },
  });
  return response.data;
};

export type ConversationCreationResult = ApiResponse<{
  conversation_id: string;
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

export type ListConversations = ApiResponse<{
  conversations: IConversationResult[];
}>;
const listConversations = async (): Promise<ListConversations> => {
  return (await backendApi<ListConversations>({ url: "/conversations" })).data;
};

export type MessagesResult = ApiResponse<{ messages: IMessageWithResults[] }>;
const getMessages = async (conversationId: string): Promise<MessagesResult> => {
  return (
    await backendApi<MessagesResult>({
      url: `/messages?conversation_id=${conversationId}`,
    })
  ).data;
};

export type MessageCreationResult = ApiResponse<void>;
const createMessage = async (conversationId: string, content: string) => {
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

export type QueryResult = ApiResponse<{ message: IMessageWithResults }>;
const query = async (
  conversationId: string,
  query: string,
  execute: boolean
): Promise<QueryResult> => {
  return (
    await backendApi<QueryResult>({
      url: `/query?conversation_id=${conversationId}&query=${query}&execute=${execute}`,
    })
  ).data;
};

export type RunSQLResult = ApiResponse<IResult>;
const runSQL = async (conversationId: string, code: string) => {
  return (
    await backendApi<RunSQLResult>({
      url: `/execute-sql?conversation_id=${conversationId}&sql=${code}`,
    })
  ).data;
};

export type SaveQueryResult = ApiResponse<void>;
const toggleSaveQuery = async (resultId: string) => {
  const response = await backendApi<SaveQueryResult>({
    url: `/toggle-save-query/${resultId}`,
  });
  return response.data;
};

export type UpdateResultResult = ApiResponse<void>;
const updateResult = async (resultId: string, code: string) => {
  const response = await backendApi<UpdateResultResult>({
    url: `/result/${resultId}`,
    method: "patch",
    data: {
      content: code,
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
  getTableSchemas,
  updateTableSchemaDescription,
  updateTableSchemaFieldDescription,
  createConnection,
  createTestConnection,
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
  toggleSaveQuery,
  updateResult,
  getAvatar,
  updateAvatar,
  updateUserInfo,
  getUserInfo,
};
