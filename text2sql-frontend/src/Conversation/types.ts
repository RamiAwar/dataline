export type IResultType = "sql" | "code" | "data";
export type Role = "user" | "assistant";

export type IResult = {
  type: IResultType;
  content: string;
  result_id: string;
};

export type IMessageWithResults = {
  content: string;
  role: string;
  results?: IResult[];
  message_id?: string;
};

export type IConversationResult = {
  conversation_id: string;
  session_id: string;
  name: string;
  messages: IMessageWithResults[];
};

export type IConversation = {
  id: string;
  name: string;
};

export type IConnection = {
  session_id: string;
  name: string;
  dsn: string;
  database: string;
  dialect: string;
};
