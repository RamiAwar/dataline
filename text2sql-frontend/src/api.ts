import axios from "axios";
import {
  IConversationResult,
  IMessageWithResults,
  IResult,
  ITableSchemaResult,
} from "./components/Library/types";
import { IEditConnection } from "./components/Library/types";
import { client } from "./services/api-client";
import { decodeBase64Data } from "./utils";

const baseUrl = "http://localhost:7377";

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

type HealthcheckResult = void;
const healthcheck = (): Promise<HealthcheckResult> => {
  return client(`healthcheck`);
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
  const response = await axios.post<ConnectResult>(`${baseUrl}/connect`, {
    dsn: connectionString,
    name: name,
  });
  return response.data;
};

const createTestConnection = async (): Promise<ConnectResult> => {
  const response = await axios.post<ConnectResult>(
    `${baseUrl}/create-sample-db`
  );
  return response.data;
};

export type ListConnectionsResult = {
  connections: ConnectionResult[];
};
const listConnections = async (): Promise<ListConnectionsResult> => {
  return client("connections").then(({ data }) => data);
};

export type GetConnectionResult = { connection: ConnectionResult };
const getConnection = async (
  connectionId: string
): Promise<GetConnectionResult> => {
  return client(`connection/${connectionId}`).then(({ data }) => data);
};

export type UpdateConnectionResult = ApiResponse<{
  connection: ConnectionResult;
}>;
const updateConnection = async (
  connectionId: string,
  edits: IEditConnection
): Promise<UpdateConnectionResult> => {
  const response = await axios.patch<UpdateConnectionResult>(
    `${baseUrl}/connection/${connectionId}`,
    edits
  );
  return response.data;
};

const deleteConnection = async (
  connectionId: string
): Promise<ApiResponse<void>> => {
  const response = await axios.delete<ApiResponse<void>>(
    `${baseUrl}/connection/${connectionId}`
  );
  return response.data;
};

export type GetTableSchemasResult = {
  tables: ITableSchemaResult[];
};
const getTableSchemas = async (
  connectionId: string
): Promise<GetTableSchemasResult> => {
  return client(`connection/${connectionId}/schemas`).then(({ data }) => data);
};

export type UpdateTableSchemaDescriptionResult = ApiResponse<void>;
const updateTableSchemaDescription = async (
  tableId: string,
  description: string
): Promise<UpdateTableSchemaDescriptionResult> => {
  const response = await axios.patch<UpdateTableSchemaDescriptionResult>(
    `${baseUrl}/schemas/table/${tableId}`,
    {
      description,
    }
  );
  return response.data;
};

export type UpdateTableSchemaFieldDescriptionResult = ApiResponse<void>;
const updateTableSchemaFieldDescription = async (
  fieldId: string,
  description: string
): Promise<UpdateTableSchemaFieldDescriptionResult> => {
  const response = await axios.patch<UpdateTableSchemaFieldDescriptionResult>(
    `${baseUrl}/schemas/field/${fieldId}`,
    {
      description,
    }
  );
  return response.data;
};

export type ConversationCreationResult = ApiResponse<{
  conversation_id: string;
}>;
const createConversation = async (connectionId: string, name: string) => {
  const response = await axios.post<ConversationCreationResult>(
    `${baseUrl}/conversation`,
    {
      connection_id: connectionId,
      name,
    }
  );
  return response.data;
};

export type ConversationUpdateResult = ApiResponse<void>;
const updateConversation = async (
  conversationId: string,
  name: string
): Promise<ConversationUpdateResult> => {
  const response = await axios.patch<ConversationUpdateResult>(
    `${baseUrl}/conversation/${conversationId}`,
    {
      name,
    }
  );
  return response.data;
};

export type ConversationDeletionResult = ApiResponse<void>;
const deleteConversation = async (conversationId: string) => {
  const response = await axios.delete<ConversationDeletionResult>(
    `${baseUrl}/conversation/${conversationId}`
  );
  return response.data;
};

export type ListConversations = {
  conversations: IConversationResult[];
};
const listConversations = (): Promise<ListConversations> => {
  return client("conversations").then(({ data }) => data);
};

export type MessagesResult = {
  messages: IMessageWithResults[];
  hasNext: boolean;
  offset: number;
  limit: number;
};
const getMessages = (
  conversationId: string,
  offset: number = 0
): Promise<MessagesResult> => {
  return client(
    `messages?conversation_id=${conversationId}&offset=${offset}`
  ).then(({ data }) => data);
};

export type MessageCreationResult = ApiResponse<void>;
const createMessage = async (conversationId: string, content: string) => {
  const response = await axios.post<MessageCreationResult>(
    `${baseUrl}/message`,
    {
      conversation_id: conversationId,
      content,
    }
  );
  return response.data;
};

export type QueryResult = { message: IMessageWithResults };
const query = (conversationId: string, query: string, execute: boolean) => {
  return client(
    `query?conversation_id=${conversationId}&query=${query}&execute=${execute}`
  ).then(({ data }) => data);
};

export type RunSQLResult = IResult;
const runSQL = (conversationId: string, code: string) => {
  return client(
    `execute-sql?conversation_id=${conversationId}&sql=${code}`
  ).then(({ data }) => data);
};

export type SaveQueryResult = ApiResponse<void>;
const toggleSaveQuery = async (resultId: string) => {
  const response = await axios.get<SaveQueryResult>(
    `${baseUrl}/toggle-save-query/${resultId}`
  );
  return response.data;
};

export type UpdateResultResult = ApiResponse<void>;
const updateResult = async (resultId: string, code: string) => {
  const response = await axios.patch<UpdateResultResult>(
    `${baseUrl}/result/${resultId}`,
    {
      content: code,
    }
  );
  return response.data;
};

export type GetAvatarResult = { blob: string };
const getAvatar = async () => {
  return client(`settings/avatar`).then(({ data }) => {
    return decodeBase64Data(data.blob);
  });
};

export type UpdateAvatarResult = ApiResponse<{ blob: string }>;
const updateAvatar = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axios.post<UpdateAvatarResult>(
    `${baseUrl}/settings/avatar`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
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
  const response = await axios.patch<UpdateUserInfoResult>(
    `${baseUrl}/settings/info`,
    data
  );
  return response.data;
};

export type GetUserInfoResult = {
  name: string;
  openai_api_key: string;
};
const getUserInfo = () => {
  return client(`settings/info`).then(({ data }) => data as GetUserInfoResult);
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
