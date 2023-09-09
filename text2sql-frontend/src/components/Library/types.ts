// Enum for sql dialects
export enum Dialect {
  Postgres = "postgresql",
  MySQL = "mysql",
  SQLite = "sqlite",
  MariaDB = "mariadb",
  Spark = "spark",
  BigQuery = "bigquery",
  IBMDB2 = "db2",
  Hive = "hive",
  Couchbase = "n1ql",
  TransactSQL = "tsql",
}

export type IResultType = "sql" | "code" | "data" | "text" | "selected_tables";
export type Role = "user" | "assistant";

export type IResult = {
  type: IResultType;
  content: string | (string[] | number[])[];
  result_id?: string;
};

export type IMessageWithResults = {
  content: string;
  role: "assistant" | "user";
  results?: IResult[];
  message_id?: string;
  conversation_id?: string;
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
  dialect: string;
};
