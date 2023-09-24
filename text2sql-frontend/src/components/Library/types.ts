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

export interface IResult {
  type: IResultType;
  content: string | any[][];
  result_id?: string;
}

export interface IMessageWithResults {
  content: string;
  role: "assistant" | "user";
  results?: IResult[];
  message_id?: string;
  conversation_id?: string;
}

export interface IConversationResult {
  conversation_id: string;
  session_id: string;
  name: string;
  messages: IMessageWithResults[];
}

export interface IConversation {
  id: string;
  name: string;
}

export interface IConnection {
  session_id: string;
  name: string;
  dsn: string;
  dialect: string;
}

export interface IEditConnection {
  name: string;
  dsn: string;
}
