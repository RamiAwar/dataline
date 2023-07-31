import axios from "axios";
import { IConversationResult, IMessageWithResults } from "./Conversation/types";

const baseUrl = "http://localhost:7377";

type ApiError = {
  status: "error";
  message: string;
};

export const isApiError = <T>(result: T | ApiError): result is ApiError => {
  return (result as ApiError).status === "error";
};

type HealthcheckResult = { status: "ok" } | ApiError;
const healthcheck = async (): Promise<HealthcheckResult> => {
  const response = await axios.get<HealthcheckResult>(`${baseUrl}/healthcheck`);
  return response.data;
};

type ConnectResult = { status: "ok"; session_id: string } | ApiError;
const connect = async (connectionString: string): Promise<ConnectResult> => {
  const response = await axios.post<ConnectResult>(`${baseUrl}/connect`, {
    dsn: connectionString,
  });
  return response.data;
};

export type SearchResult = {
  status: "ok";
  results: string[];
  query: string;
  raw_query: string;
};
export type ApiSearchResult = SearchResult | ApiError;
const search = async (
  sessionId: string,
  query: string,
  limit: number,
  execute: boolean = true
): Promise<ApiSearchResult> => {
  const response = await axios.get<ApiSearchResult>(`${baseUrl}/query`, {
    params: {
      session_id: sessionId,
      query,
      limit,
      execute,
    },
  });
  return response.data;
};

export type ConnectionResult = {
  session_id: string;
  dsn: string;
  database: string;
  name: string;
  dialect: string;
};
export type ListConnectionsResult =
  | { status: "ok"; sessions: ConnectionResult[] }
  | ApiError;
const listConnections = async (): Promise<ListConnectionsResult> => {
  const response = await axios.get<ListConnectionsResult>(
    `${baseUrl}/sessions`
  );
  return response.data;
};

export type ConversationCreationResult =
  | {
      status: "ok";
      conversation_id: string;
    }
  | ApiError;
const createConversation = async (sessionId: string, name: string) => {
  const response = await axios.post<ConversationCreationResult>(
    `${baseUrl}/conversation`,
    {
      session_id: sessionId,
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

export const api = {
  healthcheck,
  connect,
  search,
  listConnections,
  listConversations,
  createConversation,
  deleteConversation,
  getMessages,
  createMessage,
  query,
};
