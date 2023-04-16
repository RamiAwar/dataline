import axios from "axios";

const baseUrl = "http://localhost:7377";

type ApiError = {
  status: "error";
  message: string;
};

export const isApiError = <T>(result: T | ApiError): result is ApiError => {
  return (result as ApiError).status === "error";
};

type ConnectResult = { status: "ok"; session_id: string } | ApiError;
const connect = async (connectionString: string): Promise<ConnectResult> => {
  const response = await axios.post<ConnectResult>(`${baseUrl}/connect`, {
    dsn: connectionString,
  });
  return response.data;
};

type SearchResult = { status: "ok"; results: string[] } | ApiError;
const search = async (
  sessionId: string,
  query: string
): Promise<SearchResult> => {
  const response = await axios.get<SearchResult>(`${baseUrl}/query`, {
    params: {
      session_id: sessionId,
      query,
    },
  });
  return response.data;
};

type SessionResult = { session_id: string; dsn: string };
type ListSessionsResult =
  | { status: "ok"; sessions: SessionResult[] }
  | ApiError;
const listSessions = async (): Promise<ListSessionsResult> => {
  const response = await axios.get<ListSessionsResult>(`${baseUrl}/sessions`);
  return response.data;
};

export const api = {
  connect,
  search,
  listSessions,
};
