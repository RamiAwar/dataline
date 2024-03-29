import axios from "axios";
import {
  IConversationResult,
  IMessageWithResults,
  IResult,
  ITableSchemaResult,
} from "./components/Library/types";
import { IEditConnection } from "./components/Library/types";

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

type HealthcheckResult = ApiResponse<void>;
const healthcheck = async (): Promise<HealthcheckResult> => {
  const response = await axios.get<HealthcheckResult>(`${baseUrl}/healthcheck`);
  return response.data;
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

export type ListConnectionsResult = ApiResponse<{
  connections: ConnectionResult[];
}>;
const listConnections = async (): Promise<ListConnectionsResult> => {
  const response = await axios.get<ListConnectionsResult>(
    `${baseUrl}/connections`
  );
  return response.data;
};

export type GetConnectionResult = ApiResponse<{ connection: ConnectionResult }>;
const getConnection = async (
  connectionId: string
): Promise<GetConnectionResult> => {
  const response = await axios.get<GetConnectionResult>(
    `${baseUrl}/connection/${connectionId}`
  );
  return response.data;
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

export type GetTableSchemasResult = ApiResponse<{
  tables: ITableSchemaResult[];
}>;
const getTableSchemas = async (
  connectionId: string
): Promise<GetTableSchemasResult> => {
  const response = await axios.get<GetTableSchemasResult>(
    `${baseUrl}/connection/${connectionId}/schemas`
  );
  return response.data;
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

export type ListConversations = ApiResponse<{
  conversations: IConversationResult[];
}>;
const listConversations = async (): Promise<ListConversations> => {
  const response = await axios.get<ListConversations>(
    `${baseUrl}/conversations`
  );
  return response.data;
};

export type MessagesResult = ApiResponse<{ messages: IMessageWithResults[] }>;
const getMessages = async (conversationId: string): Promise<MessagesResult> => {
  const response = await axios.get<MessagesResult>(`${baseUrl}/messages`, {
    params: {
      conversation_id: conversationId,
    },
  });
  return response.data;
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

export type QueryResult = ApiResponse<{ message: IMessageWithResults }>;
const query = async (
  conversationId: string,
  query: string,
  execute: boolean
) => {
  const response = await axios.get<QueryResult>(`${baseUrl}/query`, {
    params: {
      conversation_id: conversationId,
      query,
      execute,
    },
  });

  return response.data;
};

export type RunSQLResult = ApiResponse<IResult>;
const runSQL = async (conversationId: string, code: string) => {
  const response = await axios.get<RunSQLResult>(`${baseUrl}/execute-sql`, {
    params: {
      conversation_id: conversationId,
      sql: code,
    },
  });

  return response.data;
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

export type GetAvatarResult = ApiResponse<{ blob: string }>;
const getAvatar = async () => {
  const response = await axios.get<GetAvatarResult>(
    `${baseUrl}/settings/avatar`
  );
  return response.data;
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

export type GetUserInfoResult = ApiResponse<{
  name: string;
  openai_api_key: string;
}>;
const getUserInfo = async () => {
  const response = await axios.get<GetUserInfoResult>(
    `${baseUrl}/settings/info`
  );
  return response.data;
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
