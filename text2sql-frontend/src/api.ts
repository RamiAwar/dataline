import axios from "axios";
import { IConversationResult } from "./Conversation/types";

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

export type SessionResult = { session_id: string; dsn: string };
export type ListSessionsResult =
  | { status: "ok"; sessions: SessionResult[] }
  | ApiError;
const listSessions = async (): Promise<ListSessionsResult> => {
  const response = await axios.get<ListSessionsResult>(`${baseUrl}/sessions`);
  return response.data;
};

export type Message = {};
export type MessagesResult = { messages: Message[] };
const getMessages = async (conversationId: string): Promise<MessagesResult> => {
  const response = await axios.get<MessagesResult>(`${baseUrl}/messages`, {
    params: {
      conversation_id: conversationId,
    },
  });
  return response.data;
};

export type ListConversations =
  | { status: "ok"; conversations: IConversationResult[] }
  | ApiError;
const getConversations = async (): Promise<ListConversations> => {
  const response = await axios.get<ListConversations>(
    `${baseUrl}/conversations`
  );
  return response.data;
};

export const api = {
  healthcheck,
  connect,
  search,
  listSessions,
  getConversations,
};
