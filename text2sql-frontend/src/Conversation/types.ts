export type IResultType = "sql" | "code";

export type IResult = {
  type: IResultType;
  content: string;
  result_id: string;
};

export type IMessageWithResults = {
  content: string;
  role: string;
  results: IResult[];
  message_id: string;
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
