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
  is_saved?: boolean;
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
  connection_id: string;
  name: string;
  messages: IMessageWithResults[];
}

export interface IConversation {
  id: string;
  name: string;
}

export interface IConnection {
  id: string;
  name: string;
  dsn: string;
  dialect: string;
}

export interface IEditConnection {
  name: string;
  dsn: string;
}

export interface ITableSchemaResult {
  id: string;
  name: string;
  connection_id: string;
  description: string;
  field_descriptions: Array<{
    id: string;
    schema_id: string;
    name: string;
    type: string;
    description: string;
    is_primary_key: boolean;
    is_foreign_key: boolean;
    linked_table: string;
  }>;
}

export interface ITableSchema {
  // Table field with description and name
  table: {
    name: string;
    description?: string;
  };
  // List of fields with their data types
  fields: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
}
