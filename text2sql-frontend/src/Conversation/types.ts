export type IConversation = {
  id: string;
  name: string;
};

export type IResult = { type: "sql" | "code"; content: string };
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
