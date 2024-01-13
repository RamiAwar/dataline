import axios from "axios";
import {
  IConversationResult,
  IMessageWithResults,
  IResult,
  ITableSchemaResult,
} from "./components/Library/types";
import { IEditConnection } from "./components/Library/types";

const baseUrl = "http://localhost:7377";

type ApiError = {
  status: "error";
  message: string;
};

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const isApiError = <T>(result: T | ApiError): result is ApiError => {
  return (result as ApiError).status === "error";
};

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

type HealthcheckResult = { status: "ok" } | ApiError;
const healthcheck = async (): Promise<HealthcheckResult> => {
  const response = await axios.get<HealthcheckResult>(`${baseUrl}/healthcheck`);
  return response.data;
};

type ConnectResult = { status: "ok"; connection_id: string } | ApiError;
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

export type ConnectionResult = {
  id: string;
  dsn: string;
  database: string;
  name: string;
  dialect: string;
};
export type ListConnectionsResult =
  | { status: "ok"; connections: ConnectionResult[] }
  | ApiError;
const listConnections = async (): Promise<ListConnectionsResult> => {
  const response = await axios.get<ListConnectionsResult>(
    `${baseUrl}/connections`
  );
  return response.data;
};

export type GetConnectionResult =
  | { status: "ok"; connection: ConnectionResult }
  | ApiError;
const getConnection = async (
  connectionId: string
): Promise<GetConnectionResult> => {
  const response = await axios.get<GetConnectionResult>(
    `${baseUrl}/connection/${connectionId}`
  );
  return response.data;
};

export type UpdateConnectionResult =
  | { status: "ok"; connection: ConnectionResult }
  | ApiError;
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

export type GetTableSchemasResult =
  | {
      status: "ok";
      tables: ITableSchemaResult[];
    }
  | ApiError;
const getTableSchemas = async (
  connectionId: string
): Promise<GetTableSchemasResult> => {
  const response = await axios.get<GetTableSchemasResult>(
    `${baseUrl}/connection/${connectionId}/schemas`
  );
  return response.data;
};

export type UpdateTableSchemaDescriptionResult = { status: "ok" } | ApiError;
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

export type UpdateTableSchemaFieldDescriptionResult =
  | { status: "ok" }
  | ApiError;
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

export type ConversationCreationResult =
  | {
      status: "ok";
      conversation_id: string;
    }
  | ApiError;
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

export type ConversationUpdateResult = { status: "ok" } | ApiError;
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

export type ConversationDeletionResult =
  | {
      status: "ok";
    }
  | ApiError;
const deleteConversation = async (conversationId: string) => {
  const response = await axios.delete<ConversationDeletionResult>(
    `${baseUrl}/conversation/${conversationId}`
  );
  return response.data;
};

export type ListConversations =
  | { status: "ok"; conversations: IConversationResult[] }
  | ApiError;
const listConversations = async (): Promise<ListConversations> => {
  const response = await axios.get<ListConversations>(
    `${baseUrl}/conversations`
  );
  return response.data;
};

export type MessagesResult = { messages: IMessageWithResults[] };
const getMessages = async (conversationId: string): Promise<MessagesResult> => {
  const response = await axios.get<MessagesResult>(`${baseUrl}/messages`, {
    params: {
      conversation_id: conversationId,
    },
  });
  return response.data;
};

export type MessageCreationResult = { status: "ok" } | ApiError;
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

export type QueryResult = {
  status: "ok";
  message: IMessageWithResults;
};
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

export type RunSQLResult = {
  status: "ok";
  data: IResult;
};
const runSQL = async (conversationId: string, code: string) => {
  const response = await axios.get<RunSQLResult>(`${baseUrl}/execute-sql`, {
    params: {
      conversation_id: conversationId,
      sql: code,
    },
  });

  return response.data;
};

export type SaveQueryResult = { status: "ok" } | ApiError;
const toggleSaveQuery = async (resultId: string) => {
  const response = await axios.get<SaveQueryResult>(
    `${baseUrl}/toggle-save-query/${resultId}`
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
  updateConnection,
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
};
